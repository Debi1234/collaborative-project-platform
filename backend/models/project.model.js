const mongoose = require('mongoose');

const projectSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true,
        trim: true,
        unique: true,
        lowercase: true
    },
    users:[
        {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
            // required: true
        }
    ]
});

module.exports = mongoose.model('Project', projectSchema);