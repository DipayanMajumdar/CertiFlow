require('dotenv').config(); // 🔒 THIS MUST BE THE VERY FIRST LINE
const express = require('express');
const cors = require('cors');
const path = require('path');
const mongoose = require('mongoose');
const { GoogleGenerativeAI } = require("@google/generative-ai");
const nodemailer = require('nodemailer');

// 🔒 Pulling secure keys from the .env file
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

const app = express();
const PORT = process.env.PORT || 5000;

// ==========================================
// DATABASE CONNECTION & MODEL
// ==========================================
mongoose.connect(process.env.MONGO_URI) // 🔒 Secured Connection
.then(() => console.log('🟢 Connected to MongoDB Successfully!'))
.catch((err) => console.error('🔴 MongoDB Connection Error:', err));

const Template = mongoose.model('Template', new mongoose.Schema({
    name: String,
    canvasData: Object,
    createdAt: { type: Date, default: Date.now }
}));

// ==========================================
// MIDDLEWARE
// ==========================================
app.use(cors()); 
app.use(express.json({ limit: '50mb' })); 
app.use(express.urlencoded({ extended: true, limit: '50mb' }));
app.use(express.static(path.join(__dirname, 'public')));

const requireAuth = (req, res, next) => {
    const apiKey = req.headers['x-api-key'];
    if (apiKey && apiKey === process.env.ADMIN_API_KEY) next(); // 🔒 Secured API check
    else res.status(403).json({ success: false, message: 'Unauthorized.' });
};

// ==========================================
// API ROUTES: TEMPLATES
// ==========================================
app.post('/api/templates', requireAuth, async (req, res) => {
    try {
        const newTemplate = new Template({ name: 'Hackathon Layout', canvasData: req.body });
        const savedTemplate = await newTemplate.save();
        res.status(200).json({ success: true, message: 'Saved!', templateId: savedTemplate._id });
    } catch (error) { res.status(500).json({ success: false }); }
});

app.get('/api/templates', requireAuth, async (req, res) => {
    try {
        const templates = await Template.find().select('name createdAt').sort({ createdAt: -1 });
        res.status(200).json({ success: true, templates });
    } catch (error) { res.status(500).json({ success: false }); }
});

app.get('/api/templates/:id', requireAuth, async (req, res) => {
    try {
        const template = await Template.findById(req.params.id);
        res.status(200).json({ success: true, template });
    } catch (error) { res.status(500).json({ success: false }); }
});

// ==========================================
// API ROUTES: AI ENGINES
// ==========================================
app.post('/api/map-data', async (req, res) => {
    const { csvHeaders, canvasVariables, useAI } = req.body;
    
    const runLocalMapping = () => {
        const fallbackMatch = csvHeaders.find(h => h.toLowerCase().includes('name') || h.toLowerCase().includes('nm'));
        return { "Name": fallbackMatch || csvHeaders[0] };
    };

    if (!useAI) return res.status(200).json({ success: true, mapping: runLocalMapping(), mode: 'Local' });

    try {
        const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" }); 
        const prompt = `Map these CSV Headers: [${csvHeaders.join(', ')}] to Canvas Variables: [${canvasVariables.join(', ')}]. Return minified JSON only.`;
        const result = await model.generateContent(prompt);
        let responseText = result.response.text().replace(/```json\n?|```/g, '').trim();
        res.status(200).json({ success: true, mapping: JSON.parse(responseText), mode: 'AI' });
    } catch (error) {
        res.status(200).json({ success: true, mapping: runLocalMapping(), mode: 'Fallback' });
    }
});

app.post('/api/generate-text', async (req, res) => {
    const { participants, useAI } = req.body; 

    const generateFallback = (p) => {
        const score = p['Score'] || p['Final_Eval_Score_Pts'] || p['Grade'] || '';
        const track = p['Track'] || p['Hackathon_Category_Chosen'] || p['Category'] || '';
        if (score && track) return `Outstanding work winning the ${track} track with a brilliant score of ${score}!`;
        if (track) return `Congratulations on your exceptional performance in the ${track} category!`;
        return "Congratulations on your exceptional performance and steadfast dedication!";
    };

    if (!useAI) return res.status(200).json({ success: true, mode: 'Local', messages: participants.map(generateFallback) });

    try {
        const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" }); 
        const prompt = `Write a unique 1-sentence congratulatory message for each participant in this JSON array: ${JSON.stringify(participants)}. Return ONLY a JSON array of strings in the exact same order.`;
        const result = await model.generateContent(prompt);
        let responseText = result.response.text().replace(/```json\n?|```/g, '').trim();
        res.status(200).json({ success: true, mode: 'AI', messages: JSON.parse(responseText) });
    } catch (error) {
        res.status(200).json({ success: true, mode: 'Fallback', messages: participants.map(generateFallback) });
    }
});

// ==========================================
// API ROUTES: EMAIL DISPATCH
// ==========================================
const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: process.env.EMAIL_USER, // 🔒 Secured Email
        pass: process.env.EMAIL_PASS  // 🔒 Secured Password
    },
    tls: { rejectUnauthorized: false }
});

app.post('/api/send-email', async (req, res) => {
    const { email, name, pdfBase64, certId } = req.body;
    if (!email || !email.includes('@')) return res.status(400).json({ success: false, message: 'Invalid email' });

    try {
        console.log(`📧 Sending certificate to ${email}...`);
        await transporter.sendMail({
            from: `"CertiFlow Open Innovation" <${process.env.EMAIL_USER}>`, // 🔒 Secured From Address
            to: email,
            subject: `🏅 Your Official Hackathon Certificate - ${certId}`,
            text: `Hello ${name},\n\nCongratulations on your exceptional performance!\n\nAttached is your official, cryptographically verified certificate. Verify authenticity here:\n${process.env.PUBLIC_URL || `http://localhost:${PORT}`}/verify/${certId}\n\nBest regards,\nThe Open Innovation Team`,
            attachments: [{ filename: `${name}_Certificate.pdf`, content: pdfBase64.split("base64,")[1], encoding: 'base64' }]
        });
        res.status(200).json({ success: true });
    } catch (error) {
        console.error("❌ Email failed:", error);
        res.status(500).json({ success: false });
    }
});

// ==========================================
// CATCH-ALL & QR VERIFICATION
// ==========================================
app.get('/verify/:id', (req, res) => {
    const certId = req.params.id;
    // We grab the name from the QR code URL query!
    const name = req.query.name || 'this participant';

    const html = `
    <!DOCTYPE html>
    <html lang="en">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Credential Verified | CertiFlow</title>
        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet">
        <style>
            body { font-family: 'Inter', sans-serif; background: #f8fafc; color: #0f172a; display: flex; justify-content: center; align-items: center; height: 100vh; margin: 0; }
            .card { background: white; padding: 40px; border-radius: 12px; box-shadow: 0 10px 25px -5px rgba(0,0,0,0.1), 0 8px 10px -6px rgba(0,0,0,0.1); text-align: center; max-width: 400px; width: 90%; border-top: 5px solid #10b981; }
            .icon { width: 60px; height: 60px; background: #d1fae5; color: #10b981; border-radius: 50%; display: flex; justify-content: center; align-items: center; font-size: 30px; font-weight: bold; margin: 0 auto 20px; }
            h1 { font-size: 24px; margin: 0 0 10px 0; color: #0f172a; }
            p { color: #475569; font-size: 14px; line-height: 1.6; margin-bottom: 25px; }
            .details { background: #f1f5f9; padding: 15px; border-radius: 8px; text-align: left; font-size: 13px; margin-bottom: 25px; border: 1px solid #e2e8f0; }
            .details-row { display: flex; justify-content: space-between; margin-bottom: 10px; border-bottom: 1px dashed #cbd5e1; padding-bottom: 10px; }
            .details-row:last-child { margin-bottom: 0; border-bottom: none; padding-bottom: 0; }
            .label { color: #64748b; font-weight: 500; }
            .value { font-weight: 600; color: #0f172a; text-align: right; }
            .btn { display: inline-block; background: #3b82f6; color: white; text-decoration: none; padding: 12px 20px; border-radius: 6px; font-weight: 600; font-size: 14px; transition: background 0.2s; width: 100%; box-sizing: border-box; }
            .btn:hover { background: #2563eb; }
            .footer { margin-top: 20px; font-size: 12px; color: #94a3b8; }
        </style>
    </head>
    <body>
        <div class="card">
            <div class="icon">✓</div>
            <h1>Credential Verified</h1>
            <p>This document is an authentic, secure credential issued by <strong>CertiFlow Open Innovation</strong>.</p>
            
            <div class="details">
                <div class="details-row">
                    <span class="label">Issued To:</span>
                    <span class="value">${name}</span>
                </div>
                <div class="details-row">
                    <span class="label">Credential ID:</span>
                    <span class="value" style="font-family: monospace; color: #3b82f6;">${certId}</span>
                </div>
                <div class="details-row">
                    <span class="label">System Status:</span>
                    <span class="value" style="color: #10b981;">Active & Valid</span>
                </div>
            </div>

            <a href="/" class="btn">Create Your Own Certificates</a>
            <div class="footer">🔒 Secured by CertiFlow</div>
        </div>
    </body>
    </html>
    `;
    res.send(html);
});

app.get(/(.*)/, (req, res) => res.sendFile(path.join(__dirname, 'public', 'index.html')));

app.listen(PORT, () => console.log(`🚀 CertiFlow Server running at http://localhost:${PORT}`));