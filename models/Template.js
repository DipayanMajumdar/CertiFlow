// models/Template.js
const mongoose = require('mongoose');

const templateSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true,
        default: 'Untitled Certificate'
    },
    canvasData: {
        type: mongoose.Schema.Types.Mixed, // Allows us to store the complex Fabric.js JSON exactly as is
        required: true
    },
    createdAt: {
        type: Date,
        default: Date.now
    }
});

module.exports = mongoose.model('Template', templateSchema);