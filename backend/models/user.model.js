const mongoose = require('mongoose');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');

const userSchema = new mongoose.Schema({
    email: {
        type: String,
        required: true,
        unique: true,
        lowercase: true,
        trim: true,
        minLength: [5, 'Email must be at least 5 characters long'],
        maxLength: [50, 'Email must be at most 50 characters long'],
        match: [/^\S+@\S+\.\S+$/, 'Please enter a valid email address']
    },
    password: {
        type: String,
        required: true,
        minLength: [6, 'Password must be at least 6 characters long'],
        select: false // Do not return password in queries by default
    }
});

userSchema.statics.hashPassword = async function (password) {
    if (!password) {
        throw new Error('Password is required');
    }
    const hashedPassword = await bcrypt.hash(password, 10);
    return hashedPassword;
};

userSchema.methods.comparePassword = async function (password) {
    return await bcrypt.compare(password, this.password);
};

userSchema.methods.generateAuthToken = function () {
    const token = jwt.sign({email: this.email }, process.env.JWT_SECRET, {
        expiresIn: '24h'
    });
    return token;
}

module.exports = mongoose.model('User', userSchema);
