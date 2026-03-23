// ==========================================
// 1. INITIALIZATION & TOAST SYSTEM
// ==========================================
const canvas = new fabric.Canvas('certificateCanvas', { width: 800, height: 600, backgroundColor: '#ffffff' });

window.alert = function (message) {
    const container = document.getElementById('toastContainer');
    if (!container) { console.log(message); return; }

    const safeMessage = String(message);
    const toast = document.createElement('div');

    let type = 'info', icon = 'ri-information-line';
    const msgLower = safeMessage.toLowerCase();

    if (msgLower.includes('error') || msgLower.includes('failed') || msgLower.includes('please') || msgLower.includes('invalid')) {
        type = 'error'; icon = 'ri-error-warning-line';
    } else if (msgLower.includes('success') || msgLower.includes('done') || msgLower.includes('loaded') || msgLower.includes('import') || msgLower.includes('resized') || msgLower.includes('grouped')) {
        type = 'success'; icon = 'ri-checkbox-circle-line';
    }

    toast.className = `toast ${type}`;
    toast.innerHTML = `<i class="${icon}"></i> <span>${safeMessage}</span>`;
    container.appendChild(toast);

    setTimeout(() => {
        toast.style.animation = 'fadeOutRight 0.3s ease-in forwards';
        setTimeout(() => toast.remove(), 300);
    }, 3500);
};

fabric.Object.prototype.set({
    transparentCorners: false, borderColor: '#8b5cf6', cornerColor: '#ffffff',
    cornerStrokeColor: '#8b5cf6', cornerStyle: 'circle', cornerSize: 10,
    padding: 6, borderDashArray: [4, 4]
});

const bgRect = new fabric.Rect({
    left: 20, top: 20, fill: 'transparent', width: 760, height: 560,
    stroke: '#cbd5e1', strokeWidth: 10, selectable: false, id: 'default_bg'
});
canvas.add(bgRect);

// ==========================================
// 2. WORKSPACE CONTROLS (Layout & Zoom)
// ==========================================
let baseCanvasWidth = 800; let baseCanvasHeight = 600; let currentZoom = 1;
const zoomLevelText = document.getElementById('zoomLevel');

document.getElementById('pageLayout').addEventListener('change', function () {
    const dimensions = this.value.split('x');
    baseCanvasWidth = parseInt(dimensions[0]); baseCanvasHeight = parseInt(dimensions[1]);

    canvas.setWidth(baseCanvasWidth * currentZoom);
    canvas.setHeight(baseCanvasHeight * currentZoom);

    const rect = canvas.getObjects().find(obj => obj.id === 'default_bg' || (obj.fill === 'transparent' && obj.strokeWidth === 10));
    if (rect) rect.set({ width: baseCanvasWidth - 40, height: baseCanvasHeight - 40 });

    canvas.calcOffset(); canvas.requestRenderAll();
    alert(`Success: Page layout resized to ${baseCanvasWidth} x ${baseCanvasHeight}`);
});

function applyZoom(zoom) {
    currentZoom = Math.min(Math.max(0.2, zoom), 3);
    canvas.setZoom(currentZoom);
    canvas.setWidth(baseCanvasWidth * currentZoom);
    canvas.setHeight(baseCanvasHeight * currentZoom);
    zoomLevelText.innerText = Math.round(currentZoom * 100) + '%';
}
document.getElementById('zoomInBtn').addEventListener('click', () => applyZoom(currentZoom + 0.1));
document.getElementById('zoomOutBtn').addEventListener('click', () => applyZoom(currentZoom - 0.1));
document.getElementById('zoomResetBtn').addEventListener('click', () => applyZoom(1));
canvas.on('mouse:wheel', function (opt) {
    if (opt.e.altKey) {
        let zoom = canvas.getZoom(); zoom *= 0.999 ** opt.e.deltaY;
        applyZoom(zoom); opt.e.preventDefault(); opt.e.stopPropagation();
    }
});

const ctx = canvas.getSelectionContext();
canvas.on('object:moving', function (e) {
    const obj = e.target;
    const cX = canvas.getWidth() / canvas.getZoom() / 2;
    const cY = canvas.getHeight() / canvas.getZoom() / 2;
    const oX = obj.left + (obj.width * obj.scaleX) / 2;
    const oY = obj.top + (obj.height * obj.scaleY) / 2;

    canvas.clearContext(ctx);
    if (Math.abs(oX - cX) < 5) { obj.set({ left: cX - (obj.width * obj.scaleX) / 2 }); drawLine(cX, 0, cX, canvas.getHeight()); }
    if (Math.abs(oY - cY) < 5) { obj.set({ top: cY - (obj.height * obj.scaleY) / 2 }); drawLine(0, cY, canvas.getWidth(), cY); }
});
canvas.on('before:render', () => canvas.clearContext(canvas.contextTop));
canvas.on('mouse:up', () => canvas.clearContext(ctx));

function drawLine(x1, y1, x2, y2) {
    ctx.save(); ctx.lineWidth = 1; ctx.strokeStyle = '#ec4899'; ctx.beginPath();
    ctx.moveTo(x1 * canvas.getZoom(), y1 * canvas.getZoom());
    ctx.lineTo(x2 * canvas.getZoom(), y2 * canvas.getZoom());
    ctx.stroke(); ctx.restore();
}

// ==========================================
// 3. SHAPES & MEDIA TOOLS
// ==========================================
document.getElementById('addTextBtn').addEventListener('click', () => {
    const text = new fabric.Textbox('Double Click to Edit', {
        left: canvas.getWidth() / 2, top: canvas.getHeight() / 2, originX: 'center', originY: 'center',
        width: 400, textAlign: 'center', fontFamily: 'Helvetica', fontSize: 24, fill: '#333333'
    });
    canvas.add(text); canvas.setActiveObject(text);
});

document.getElementById('addAiMessageBtn').addEventListener('click', () => {
    const text = new fabric.Textbox(`{{AIMessage}}`, {
        left: canvas.getWidth() / 2, top: canvas.getHeight() / 2, originX: 'center', originY: 'center',
        width: 400, textAlign: 'center', fontFamily: 'Georgia', fontSize: 20, fill: '#475569'
    });
    canvas.add(text); canvas.setActiveObject(text);
});

document.getElementById('addRectBtn').addEventListener('click', () => {
    const rect = new fabric.Rect({ left: 350, top: 250, fill: '#3b82f6', width: 100, height: 100, rx: 10, ry: 10 });
    canvas.add(rect); canvas.setActiveObject(rect);
});
document.getElementById('addCircBtn').addEventListener('click', () => {
    const circle = new fabric.Circle({ left: 350, top: 250, fill: '#10b981', radius: 50 });
    canvas.add(circle); canvas.setActiveObject(circle);
});
document.getElementById('addLineBtn').addEventListener('click', () => {
    const line = new fabric.Line([50, 50, 250, 50], { left: 300, top: 250, stroke: '#ef4444', strokeWidth: 5 });
    canvas.add(line); canvas.setActiveObject(line);
});

const drawBtn = document.getElementById('drawBtn');
drawBtn.addEventListener('click', function () {
    canvas.isDrawingMode = !canvas.isDrawingMode;
    if (canvas.isDrawingMode) {
        drawBtn.innerHTML = "<i class='ri-stop-circle-line'></i> Stop Drawing"; drawBtn.className = "btn danger-btn";
        canvas.freeDrawingBrush.color = document.getElementById('textColor').value || '#000000'; canvas.freeDrawingBrush.width = 3;
    } else {
        drawBtn.innerHTML = "<i class='ri-pen-nib-line'></i> Draw Signature"; drawBtn.className = "btn";
        drawBtn.style.color = "var(--primary)"; drawBtn.style.borderColor = "var(--primary)";
    }
});

document.getElementById('bgUpload').addEventListener('change', function (e) {
    const file = e.target.files[0]; if (!file) return;
    const reader = new FileReader();
    reader.onload = function (f) {
        const data = f.target.result; const rawImg = new Image(); rawImg.src = data;
        rawImg.onload = function () {
            const colorThief = new ColorThief(); const dominantColor = colorThief.getColor(rawImg);
            const brightness = Math.round(((parseInt(dominantColor[0]) * 299) + (parseInt(dominantColor[1]) * 587) + (parseInt(dominantColor[2]) * 114)) / 1000);
            const optimalTextColor = (brightness > 125) ? '#1e3a8a' : '#ffffff';

            fabric.Image.fromURL(data, function (img) {
                img.set({ scaleX: canvas.width / img.width, scaleY: canvas.height / img.height, originX: 'left', originY: 'top' });
                canvas.setBackgroundImage(img, canvas.renderAll.bind(canvas));
                canvas.getObjects().forEach(obj => { if (obj.text) obj.set('fill', optimalTextColor); });
                canvas.requestRenderAll();
                alert(`Success: Vision AI auto-styled text to ${optimalTextColor === '#ffffff' ? 'White' : 'Dark Blue'} for contrast.`);
            });
        };
    }; reader.readAsDataURL(file);
});

document.getElementById('imageUpload').addEventListener('change', function (e) {
    const file = e.target.files[0]; if (!file) return;
    const reader = new FileReader();
    reader.onload = function (f) {
        fabric.Image.fromURL(f.target.result, function (img) {
            img.scaleToWidth(150); img.set({ left: 100, top: 100 });
            canvas.add(img); canvas.setActiveObject(img);
        });
    }; reader.readAsDataURL(file);
});

// ==========================================
// 4. EDITOR CONTROLS & PROPERTIES PANEL
// ==========================================
const propertiesPanel = document.getElementById('propertiesPanel');
const textControls = document.getElementById('textControls');

canvas.on({
    'selection:created': handleSelection,
    'selection:updated': handleSelection,
    'selection:cleared': () => propertiesPanel.style.display = 'none'
});

function handleSelection(e) {
    const obj = e.selected[0]; if (!obj) return;
    propertiesPanel.style.display = 'flex';

    const op = obj.opacity !== undefined ? obj.opacity : 1;
    document.getElementById('opacitySlider').value = op;
    document.getElementById('opacityVal').innerText = Math.round(op * 100) + '%';
    document.getElementById('shadowToggle').checked = !!obj.shadow;

    if (obj.text !== undefined) {
        textControls.style.display = 'block';
        document.getElementById('textColor').value = obj.fill || '#333333';
        document.getElementById('textBgColor').value = obj.textBackgroundColor || '#ffffff';
        document.getElementById('fontSize').value = obj.fontSize || 24;
        document.getElementById('fontFamily').value = obj.fontFamily || 'Helvetica';
        document.getElementById('lineHeight').value = obj.lineHeight || 1.1;
        document.getElementById('charSpacing').value = obj.charSpacing || 0;
    } else { textControls.style.display = 'none'; }
}

document.getElementById('textColor').addEventListener('input', function () { const obj = canvas.getActiveObject(); if (obj) { obj.set('fill', this.value); if (canvas.isDrawingMode) canvas.freeDrawingBrush.color = this.value; canvas.requestRenderAll(); } });
document.getElementById('fontSize').addEventListener('input', function () { const obj = canvas.getActiveObject(); if (obj) { obj.set('fontSize', parseInt(this.value, 10)); canvas.requestRenderAll(); } });
document.getElementById('boldBtn').addEventListener('click', function () { const obj = canvas.getActiveObject(); if (obj) { obj.set('fontWeight', obj.fontWeight === 'bold' ? 'normal' : 'bold'); canvas.requestRenderAll(); } });
document.getElementById('italicBtn').addEventListener('click', function () { const obj = canvas.getActiveObject(); if (obj) { obj.set('fontStyle', obj.fontStyle === 'italic' ? 'normal' : 'italic'); canvas.requestRenderAll(); } });
document.getElementById('fontFamily').addEventListener('change', function () { const obj = canvas.getActiveObject(); if (obj && obj.text) { obj.set('fontFamily', this.value); canvas.requestRenderAll(); } });
document.getElementById('underlineBtn').addEventListener('click', function () { const obj = canvas.getActiveObject(); if (obj && obj.text) { obj.set('underline', !obj.underline); canvas.requestRenderAll(); } });
document.getElementById('strikeBtn').addEventListener('click', function () { const obj = canvas.getActiveObject(); if (obj && obj.text) { obj.set('linethrough', !obj.linethrough); canvas.requestRenderAll(); } });
document.getElementById('textBgColor').addEventListener('input', function () { const obj = canvas.getActiveObject(); if (obj && obj.text) { obj.set('textBackgroundColor', this.value === '#ffffff' ? '' : this.value); canvas.requestRenderAll(); } });
document.getElementById('lineHeight').addEventListener('input', function () { const obj = canvas.getActiveObject(); if (obj && obj.text) { obj.set('lineHeight', parseFloat(this.value)); canvas.requestRenderAll(); } });
document.getElementById('charSpacing').addEventListener('input', function () { const obj = canvas.getActiveObject(); if (obj && obj.text) { obj.set('charSpacing', parseInt(this.value, 10)); canvas.requestRenderAll(); } });
const setAlignment = (align) => { const obj = canvas.getActiveObject(); if (obj && obj.text) { obj.set('textAlign', align); canvas.requestRenderAll(); } };
document.getElementById('alignLeftBtn').addEventListener('click', () => setAlignment('left'));
document.getElementById('alignCenterBtn').addEventListener('click', () => setAlignment('center'));
document.getElementById('alignRightBtn').addEventListener('click', () => setAlignment('right'));

document.getElementById('bringFrontBtn').addEventListener('click', () => { const obj = canvas.getActiveObject(); if (obj) canvas.bringForward(obj); });
document.getElementById('sendBackBtn').addEventListener('click', () => { const obj = canvas.getActiveObject(); if (obj) canvas.sendBackwards(obj); });
document.getElementById('groupBtn').addEventListener('click', function () { const obj = canvas.getActiveObject(); if (obj && obj.type === 'activeSelection') { obj.toGroup(); canvas.requestRenderAll(); alert("Success: Objects grouped!"); } else { alert("Error: Please hold Shift and select multiple items to group them."); } });
document.getElementById('ungroupBtn').addEventListener('click', function () { const obj = canvas.getActiveObject(); if (obj && obj.type === 'group') { obj.toActiveSelection(); canvas.requestRenderAll(); alert("Success: Objects ungrouped!"); } });
document.getElementById('lockBtn').addEventListener('click', function () { const obj = canvas.getActiveObject(); if (obj) { obj.set({ lockMovementX: true, lockMovementY: true, lockRotation: true, lockScalingX: true, lockScalingY: true, hasControls: false, borderColor: '#ef4444' }); canvas.discardActiveObject(); canvas.requestRenderAll(); } });
document.getElementById('unlockBtn').addEventListener('click', function () { const obj = canvas.getActiveObject(); if (obj) { obj.set({ lockMovementX: false, lockMovementY: false, lockRotation: false, lockScalingX: false, lockScalingY: false, hasControls: true, borderColor: '#8b5cf6' }); canvas.requestRenderAll(); } else { alert("Error: Select a locked object to unlock it."); } });
document.getElementById('deleteBtn').addEventListener('click', deleteSelected);
window.addEventListener('keydown', function (e) { if ((e.key === 'Delete' || e.key === 'Backspace') && canvas.getActiveObject() && !canvas.getActiveObject().isEditing) deleteSelected(); });
function deleteSelected() { const objs = canvas.getActiveObjects(); if (objs.length) { canvas.discardActiveObject(); objs.forEach(obj => canvas.remove(obj)); } }

document.getElementById('centerHBtn').addEventListener('click', () => { const obj = canvas.getActiveObject(); if (obj) { obj.centerH(); obj.setCoords(); canvas.requestRenderAll(); } });
document.getElementById('centerVBtn').addEventListener('click', () => { const obj = canvas.getActiveObject(); if (obj) { obj.centerV(); obj.setCoords(); canvas.requestRenderAll(); } });
document.getElementById('opacitySlider').addEventListener('input', function () { const obj = canvas.getActiveObject(); if (obj) { obj.set('opacity', parseFloat(this.value)); document.getElementById('opacityVal').innerText = Math.round(this.value * 100) + '%'; canvas.requestRenderAll(); } });
document.getElementById('shadowToggle').addEventListener('change', function () { const obj = canvas.getActiveObject(); if (obj) { if (this.checked) obj.set('shadow', new fabric.Shadow({ color: 'rgba(0,0,0,0.3)', blur: 5, offsetX: 3, offsetY: 3 })); else obj.set('shadow', null); canvas.requestRenderAll(); } });

// ==========================================
// 5. HISTORY & CLIPBOARD (Undo/Redo)
// ==========================================
let canvasHistory = []; let historyIndex = -1; let isHistoryProcessing = false;
function saveHistory() {
    if (isHistoryProcessing) return;
    if (historyIndex < canvasHistory.length - 1) canvasHistory = canvasHistory.slice(0, historyIndex + 1);
    canvasHistory.push(JSON.stringify(canvas.toJSON(['id']))); historyIndex++;
}
setTimeout(saveHistory, 100);
canvas.on('object:added', saveHistory); canvas.on('object:modified', saveHistory); canvas.on('object:removed', saveHistory);

function undo() { if (historyIndex > 0) { isHistoryProcessing = true; historyIndex--; canvas.loadFromJSON(canvasHistory[historyIndex], function () { canvas.requestRenderAll(); isHistoryProcessing = false; }); } }
function redo() { if (historyIndex < canvasHistory.length - 1) { isHistoryProcessing = true; historyIndex++; canvas.loadFromJSON(canvasHistory[historyIndex], function () { canvas.requestRenderAll(); isHistoryProcessing = false; }); } }

let clipboard = null;
function copy() { canvas.getActiveObject().clone(function (cloned) { clipboard = cloned; }); }
function paste() {
    if (!clipboard) return;
    clipboard.clone(function (clonedObj) {
        canvas.discardActiveObject(); clonedObj.set({ left: clonedObj.left + 20, top: clonedObj.top + 20, evented: true });
        if (clonedObj.type === 'activeSelection') { clonedObj.canvas = canvas; clonedObj.forEachObject(function (obj) { canvas.add(obj); }); clonedObj.setCoords(); } else { canvas.add(clonedObj); }
        clipboard.top += 20; clipboard.left += 20; canvas.setActiveObject(clonedObj); canvas.requestRenderAll();
    });
}
window.addEventListener('keydown', function (e) {
    const obj = canvas.getActiveObject(); if (obj && obj.isEditing) return;
    if (e.ctrlKey || e.metaKey) {
        if (e.key === 'c' || e.key === 'C') { if (obj) copy(); }
        else if (e.key === 'v' || e.key === 'V') paste();
        else if (e.key === 'z' || e.key === 'Z') { if (e.shiftKey) redo(); else undo(); }
        else if (e.key === 'y' || e.key === 'Y') redo();
    }
});

// ==========================================
// 6. DASHBOARDS (Export, Proofs, Templates)
// ==========================================
// 🛡️ THE ULTIMATE FIX: Native HTML5 Snapshot (0% Memory Load)
document.getElementById('downloadProofBtn').addEventListener('click', function () {
    try {
        canvas.discardActiveObject();
        canvas.requestRenderAll(); // Async clear of the blue selection boxes

        // Wait 100ms for the blue boxes to visually disappear, then SNAPSHOT
        setTimeout(() => {
            // Grab the raw pixel buffer directly from the browser (Lightning fast, no memory spikes)
            const rawCanvas = document.getElementById('certificateCanvas');
            const dataURL = rawCanvas.toDataURL('image/jpeg', 0.95);

            const link = document.createElement('a');
            link.download = 'CertiFlow_Proof.jpg';
            link.href = dataURL;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);

            alert("Success: Proof Downloaded Instantly!");
        }, 100);
    } catch (err) {
        console.error(err);
        alert("Error: Browser prevented download. Try refreshing.");
    }
});

document.getElementById('exportBtn').addEventListener('click', async () => {
    const templateData = canvas.toJSON(['id']); const btn = document.getElementById('exportBtn');
    btn.innerHTML = "<i class='ri-loader-4-line ri-spin'></i> Saving..."; btn.disabled = true;
    try {
        const response = await fetch('/api/templates', { method: 'POST', headers: { 'Content-Type': 'application/json', 'x-api-key': 'certiflow-admin-2026' }, body: JSON.stringify(templateData) });
        if (response.ok) alert("Success: Template Saved!"); else alert("Error: Could not save template.");
    } catch (error) { alert("Error: Cannot connect to server."); }
    finally { btn.innerHTML = "<i class='ri-save-3-line'></i> Save Template"; btn.disabled = false; }
});

const modal = document.getElementById('templateModal');
const templateList = document.getElementById('templateList');

document.getElementById('viewTemplatesBtn').addEventListener('click', async () => {
    modal.style.display = 'flex'; setTimeout(() => modal.classList.add('active'), 10);
    templateList.innerHTML = '<p style="text-align:center;"><i class="ri-loader-4-line ri-spin"></i> Loading templates...</p>';
    try {
        const response = await fetch('/api/templates', { headers: { 'x-api-key': 'certiflow-admin-2026' } });
        const data = await response.json();
        if (data.success && data.templates.length > 0) {
            templateList.innerHTML = '';
            data.templates.forEach(t => {
                const dateString = new Date(t.createdAt).toLocaleDateString();
                const card = document.createElement('div');
                card.style.cssText = 'padding: 12px; border: 1px solid var(--border); border-radius: 8px; display: flex; justify-content: space-between; align-items: center; background: #f8fafc; cursor: pointer;';
                card.innerHTML = `<div><strong style="font-size:14px;">${t.name}</strong><br><small style="color: var(--text-muted);">Saved: ${dateString}</small></div><button class="btn primary-btn load-btn" style="width:auto; padding: 6px 12px;" data-id="${t._id}">Load</button>`;
                templateList.appendChild(card);
            });
            document.querySelectorAll('.load-btn').forEach(btn => {
                btn.addEventListener('click', async (e) => {
                    try {
                        const res = await fetch(`/api/templates/${e.target.getAttribute('data-id')}`, { headers: { 'x-api-key': 'certiflow-admin-2026' } });
                        const d = await res.json();
                        if (d.success) {
                            canvas.loadFromJSON(d.template.canvasData, function () {
                                canvas.requestRenderAll(); document.getElementById('closeModalBtn').click(); alert('Success: Template loaded successfully!');
                            });
                        }
                    } catch (err) { alert('Error: Failed to load template.'); }
                });
            });
        } else { templateList.innerHTML = '<p style="text-align:center; color: var(--text-muted);">No saved templates found.</p>'; }
    } catch (error) { templateList.innerHTML = '<p style="text-align:center; color: var(--danger);">Error loading templates.</p>'; }
});

document.getElementById('closeModalBtn').addEventListener('click', () => {
    modal.classList.remove('active'); setTimeout(() => modal.style.display = 'none', 200);
});

// ==========================================
// 7. BULK GENERATOR & EMAIL ENGINE
// ==========================================
let parsedCSVData = []; let smartMapping = {};

document.getElementById('csvUpload').addEventListener('change', function (e) {
    const file = e.target.files[0]; if (!file) return;
    const statusDiv = document.getElementById('csvStatus');
    statusDiv.style.color = '#3b82f6'; statusDiv.innerText = "⚙️ Analyzing data...";

    Papa.parse(file, {
        header: true, skipEmptyLines: true,
        complete: async function (results) {
            parsedCSVData = results.data; const headers = Object.keys(parsedCSVData[0]);
            const container = document.getElementById('dynamicFieldsContainer'); container.innerHTML = '';
            headers.forEach(header => {
                const btn = document.createElement('button');
                btn.className = 'btn small-btn'; btn.style.background = '#e2e8f0'; btn.innerText = `+ {{${header}}}`;
                btn.onclick = () => {
                    const text = new fabric.Textbox(`{{${header}}}`, {
                        left: canvas.getWidth() / 2, top: canvas.getHeight() / 2, originX: 'center', originY: 'center',
                        width: 500, textAlign: 'center', fontFamily: 'Helvetica', fontSize: 30, fill: '#1e40af', fontWeight: 'bold'
                    });
                    canvas.add(text); canvas.setActiveObject(text);
                };
                container.appendChild(btn);
            });

            let existingCanvasVars = [];
            canvas.getObjects().forEach(obj => {
                if (obj.text) { const matches = obj.text.match(/{{(.*?)}}/g); if (matches) matches.forEach(m => existingCanvasVars.push(m.replace(/{{|}}/g, ''))); }
            });

            try {
                const isAIToggledOn = document.getElementById('useAIToggle').checked;
                const response = await fetch('/api/map-data', {
                    method: 'POST', headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ csvHeaders: headers, canvasVariables: existingCanvasVars.length ? existingCanvasVars : ['Name'], useAI: isAIToggledOn })
                });
                const data = await response.json();
                if (data.success) {
                    smartMapping = data.mapping; statusDiv.style.color = '#10b981'; statusDiv.innerText = `✅ Loaded ${parsedCSVData.length} records.`;
                    document.getElementById('generateBatchBtn').style.display = 'block'; document.getElementById('emailBatchBtn').style.display = 'block';
                    alert(`Success: Imported ${parsedCSVData.length} rows!`);
                }
            } catch (error) {
                statusDiv.style.color = '#ef4444'; statusDiv.innerText = "❌ Mapping failed, but custom variables are ready.";
                document.getElementById('generateBatchBtn').style.display = 'block'; document.getElementById('emailBatchBtn').style.display = 'block';
            }
        }
    });
});

// NATIVE PDF RENDER ENGINE
const renderCanvasToPDFNative = (pdfDoc) => {
    const cWidth = canvas.getWidth(); const cHeight = canvas.getHeight();
    if (canvas.backgroundImage) {
        const bgData = canvas.backgroundImage.toDataURL({ format: 'jpeg', quality: 0.8 }); pdfDoc.addImage(bgData, 'JPEG', 0, 0, cWidth, cHeight);
    } else if (canvas.backgroundColor && canvas.backgroundColor !== 'transparent') {
        pdfDoc.setFillColor(canvas.backgroundColor); pdfDoc.rect(0, 0, cWidth, cHeight, 'F');
    }
    canvas.getObjects().forEach(obj => {
        if (obj.type === 'rect') {
            pdfDoc.setDrawColor(obj.stroke || '#000000'); pdfDoc.setLineWidth(obj.strokeWidth || 1);
            if (obj.fill && obj.fill !== 'transparent') pdfDoc.setFillColor(obj.fill);
            let style = (obj.fill !== 'transparent' && obj.strokeWidth > 0) ? 'DF' : (obj.fill !== 'transparent' ? 'F' : 'S');
            pdfDoc.rect(obj.left, obj.top, obj.width * obj.scaleX, obj.height * obj.scaleY, style);
        } else if (obj.type === 'circle') {
            if (obj.fill && obj.fill !== 'transparent') pdfDoc.setFillColor(obj.fill);
            let style = (obj.fill !== 'transparent' && obj.strokeWidth > 0) ? 'DF' : (obj.fill !== 'transparent' ? 'F' : 'S');
            pdfDoc.circle(obj.left + obj.radius, obj.top + obj.radius, obj.radius * obj.scaleX, style);
        } else if (obj.type === 'line') {
            pdfDoc.setDrawColor(obj.stroke || '#000000'); pdfDoc.setLineWidth(obj.strokeWidth || 1);
            pdfDoc.line(obj.left, obj.top, obj.left + (obj.width * obj.scaleX), obj.top + (obj.height * obj.scaleY));
        } else if (obj.type === 'image' || obj.id === 'temp_qr') {
            pdfDoc.addImage(obj.toDataURL({ format: 'png' }), 'PNG', obj.left, obj.top, obj.width * obj.scaleX, obj.height * obj.scaleY);
        } else if (obj.text !== undefined) {
            let fontName = 'helvetica'; if (obj.fontFamily && (obj.fontFamily.toLowerCase().includes('georgia') || obj.fontFamily.toLowerCase().includes('times'))) fontName = 'times';
            let fontStyle = 'normal';
            if (obj.fontWeight === 'bold' && obj.fontStyle === 'italic') fontStyle = 'bolditalic';
            else if (obj.fontWeight === 'bold') fontStyle = 'bold';
            else if (obj.fontStyle === 'italic') fontStyle = 'italic';
            pdfDoc.setFont(fontName, fontStyle); pdfDoc.setFontSize(obj.fontSize * obj.scaleY); pdfDoc.setTextColor(obj.fill || '#000000');

            let trueLeft = obj.left; if (obj.originX === 'center') trueLeft -= (obj.width * obj.scaleX) / 2; if (obj.originX === 'right') trueLeft -= (obj.width * obj.scaleX);
            let trueTop = obj.top; if (obj.originY === 'center') trueTop -= (obj.height * obj.scaleY) / 2; if (obj.originY === 'bottom') trueTop -= (obj.height * obj.scaleY);

            let y = trueTop + (obj.fontSize * obj.scaleY * 0.85); let x = trueLeft; let options = { align: 'left' };
            if (obj.textAlign === 'center') { x = trueLeft + ((obj.width * obj.scaleX) / 2); options.align = 'center'; }
            else if (obj.textAlign === 'right') { x = trueLeft + (obj.width * obj.scaleX); options.align = 'right'; }
            if (obj.text) pdfDoc.text(obj.text.split('\n'), x, y, options);
        }
    });
};

const addQRCode = (url) => {
    return new Promise((resolve) => {
        const qr = new QRious({ value: url, size: 100 });
        fabric.Image.fromURL(qr.toDataURL(), (img) => {
            if (img) { img.set({ left: 40, top: (canvas.getHeight() / canvas.getZoom()) - 140, id: 'temp_qr' }); canvas.add(img); }
            resolve(img);
        });
    });
};

// DOWNLOAD BATCH LISTENER
document.getElementById('generateBatchBtn').addEventListener('click', async function () {
    if (parsedCSVData.length === 0) return alert("Error: Please upload a CSV first.");
    const btn = document.getElementById('generateBatchBtn'); btn.disabled = true;
    const zip = new JSZip(); const { jsPDF } = window.jspdf; let singlePdf;
    const pdfConfig = { orientation: 'landscape', unit: 'px', format: [canvas.getWidth(), canvas.getHeight()] };
    if (document.getElementById('outputFormat').value === 'single_pdf') singlePdf = new jsPDF(pdfConfig);

    const isAIToggledOn = document.getElementById('useAIToggle').checked; let aiMessages = [];
    if (canvas.getObjects().some(obj => obj.text && obj.text.includes('{{AIMessage}}'))) {
        btn.innerHTML = "<i class='ri-loader-4-line ri-spin'></i> Connecting to Engine...";
        try {
            const response = await fetch('/api/generate-text', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ participants: parsedCSVData, useAI: isAIToggledOn }) });
            const data = await response.json(); if (data.success) aiMessages = data.messages;
        } catch (error) { console.error(error); }
    }

    const textObjects = canvas.getObjects().filter(obj => obj.text !== undefined);
    const originalTextStates = textObjects.map(obj => ({ obj: obj, originalText: obj.text, originalWidth: obj.width, originalLeft: obj.left, originalTop: obj.top }));

    try {
        for (let i = 0; i < parsedCSVData.length; i++) {
            const row = parsedCSVData[i];
            originalTextStates.forEach(item => {
                let newText = item.originalText || "";
                if (newText && newText.includes('{{AIMessage}}') && aiMessages[i]) newText = newText.replace('{{AIMessage}}', aiMessages[i]);
                const matches = newText ? newText.match(/{{(.*?)}}/g) : null;
                if (matches) {
                    matches.forEach(match => {
                        const varName = match.replace(/{{|}}/g, ''); const mappedKey = smartMapping[varName] || varName;
                        newText = newText.replace(match, row[mappedKey] || '');
                    });
                }
                item.obj.set('text', newText);
            });

            const participantIdName = row[smartMapping['Name']] || Object.keys(row)[0] || `Participant_${i}`;
            const certId = 'CF-' + Math.random().toString(36).substr(2, 9).toUpperCase();
            const currentDomain = window.location.origin;
            const qrImg = await addQRCode(`${currentDomain}/verify/${certId}?name=${encodeURIComponent(participantIdName)}`);
            canvas.renderAll();

            const outputFormat = document.getElementById('outputFormat').value;
            if (outputFormat === 'zip_png') {
                const safeDataURL = canvas.toDataURL({ format: 'jpeg', quality: 0.9, multiplier: 1 / canvas.getZoom() });
                zip.file(`${participantIdName}_Certificate.jpg`, safeDataURL.replace(/^data:image\/jpeg;base64,/, ""), { base64: true });
            } else if (outputFormat === 'zip_pdf') {
                const tempPdf = new jsPDF(pdfConfig); renderCanvasToPDFNative(tempPdf);
                zip.file(`${participantIdName}_Certificate.pdf`, tempPdf.output('blob'));
            } else if (outputFormat === 'single_pdf') {
                renderCanvasToPDFNative(singlePdf); if (i < parsedCSVData.length - 1) singlePdf.addPage();
            }

            if (qrImg) canvas.remove(qrImg);
            btn.innerHTML = `<i class='ri-loader-4-line ri-spin'></i> Rendering ${i + 1} / ${parsedCSVData.length}`;
            await new Promise(r => setTimeout(r, 10));
        }
    } catch (err) { alert("Error: Render failed."); btn.innerHTML = "<i class='ri-download-cloud-2-line'></i> 2. Download Batch"; btn.disabled = false; return; }

    originalTextStates.forEach(state => state.obj.set({ text: state.originalText, width: state.originalWidth, left: state.originalLeft, top: state.originalTop }));
    canvas.renderAll(); btn.innerHTML = "<i class='ri-loader-4-line ri-spin'></i> Finalizing...";

    if (document.getElementById('outputFormat').value === 'single_pdf') {
        singlePdf.save("CertiFlow_Combined_Batch.pdf");
        btn.innerHTML = "<i class='ri-download-cloud-2-line'></i> 2. Download Batch"; btn.disabled = false; alert("Success: PDF Downloaded!");
    } else {
        zip.generateAsync({ type: "blob" }).then(function (content) {
            saveAs(content, "CertiFlow_Batch_Archive.zip");
            btn.innerHTML = "<i class='ri-download-cloud-2-line'></i> 2. Download Batch"; btn.disabled = false; alert("Success: ZIP Downloaded!");
        });
    }
});

// EMAIL BATCH LISTENER
document.getElementById('emailBatchBtn').addEventListener('click', async function () {
    if (parsedCSVData.length === 0) return alert("Error: Please upload a CSV first.");
    const emailKey = Object.keys(parsedCSVData[0]).find(k => k.toLowerCase().includes('email') || k.toLowerCase().includes('mail'));
    if (!emailKey) return alert("Error: Could not find an 'Email' column in your CSV!");

    const btn = document.getElementById('emailBatchBtn'); btn.disabled = true;
    if (!confirm(`Are you sure you want to instantly email ${parsedCSVData.length} certificates?`)) { btn.disabled = false; return; }

    const { jsPDF } = window.jspdf;
    const pdfConfig = { orientation: 'landscape', unit: 'px', format: [canvas.getWidth(), canvas.getHeight()] };

    // 🛡️ FIXED: Fetch AI Messages before looping!
    const isAIToggledOn = document.getElementById('useAIToggle').checked;
    let aiMessages = [];
    if (canvas.getObjects().some(obj => obj.text && obj.text.includes('{{AIMessage}}'))) {
        btn.innerHTML = "<i class='ri-loader-4-line ri-spin'></i> Connecting to AI Engine...";
        try {
            const response = await fetch('/api/generate-text', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ participants: parsedCSVData, useAI: isAIToggledOn }) });
            const data = await response.json(); if (data.success) aiMessages = data.messages;
        } catch (error) { console.error(error); }
    }

    const textObjects = canvas.getObjects().filter(obj => obj.text !== undefined);
    const originalTextStates = textObjects.map(obj => ({ obj: obj, originalText: obj.text, originalWidth: obj.width, originalLeft: obj.left, originalTop: obj.top }));

    let successCount = 0;

    for (let i = 0; i < parsedCSVData.length; i++) {
        const row = parsedCSVData[i];
        btn.innerHTML = `<i class='ri-loader-4-line ri-spin'></i> Sending ${i + 1} / ${parsedCSVData.length}...`;

        originalTextStates.forEach(item => {
            let newText = item.originalText || "";

            // 🛡️ FIXED: Replace the AI Message tag!
            if (newText && newText.includes('{{AIMessage}}') && aiMessages[i]) {
                newText = newText.replace('{{AIMessage}}', aiMessages[i]);
            }

            const matches = newText ? newText.match(/{{(.*?)}}/g) : null;
            if (matches) matches.forEach(match => { const varName = match.replace(/{{|}}/g, ''); newText = newText.replace(match, row[smartMapping[varName] || varName] || ''); });
            item.obj.set('text', newText);
        });

        const participantIdName = row[smartMapping['Name']] || Object.keys(row)[0] || `Participant_${i}`;
        const targetEmail = row[emailKey];
        const certId = 'CF-' + Math.random().toString(36).substr(2, 9).toUpperCase();

        const currentDomain = window.location.origin;
        const qrImg = await addQRCode(`${currentDomain}/verify/${certId}?name=${encodeURIComponent(participantIdName)}`);
        canvas.renderAll();

        const tempPdf = new jsPDF(pdfConfig); renderCanvasToPDFNative(tempPdf);
        const pdfBase64 = tempPdf.output('datauristring');
        if (qrImg) canvas.remove(qrImg);

        if (targetEmail && targetEmail.includes('@')) {
            try {
                const response = await fetch('/api/send-email', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email: targetEmail, name: participantIdName, pdfBase64: pdfBase64, certId: certId }) });
                const result = await response.json();
                
                if (response.ok && result.success) {
                    successCount++;
                } else {
                    console.error("Server rejected email:", result.errorDetails);
                    alert(`Error sending to ${targetEmail}: ${result.errorDetails}`);
                }
            } catch (e) { 
                console.error("Failed to fetch email API", e); 
                alert(`Fatal Error connecting to email server.`);
            }
        }
    }

    originalTextStates.forEach(state => state.obj.set({ text: state.originalText, width: state.originalWidth, left: state.originalLeft, top: state.originalTop }));
    canvas.renderAll();
    btn.innerHTML = "<i class='ri-mail-send-line'></i> Auto-Email All"; btn.disabled = false;
    alert(`Success: Emailed ${successCount} out of ${parsedCSVData.length} certificates.`);
});