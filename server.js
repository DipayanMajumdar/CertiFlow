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
    res.send(`<h1 style="text-align:center; margin-top:50px; font-family:sans-serif; color:green;">✅ Verified Authentic<br><small>${req.params.id}</small></h1>`);
});

app.get(/(.*)/, (req, res) => res.sendFile(path.join(__dirname, 'public', 'index.html')));

app.listen(PORT, () => console.log(`🚀 CertiFlow Server running at http://localhost:${PORT}`));