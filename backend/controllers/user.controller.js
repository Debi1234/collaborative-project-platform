const userModel = require('../models/user.model');
const userService = require('../services/user.service');
const { validationResult } = require('express-validator');
const redisClient = require('../services/redis.service');

module.exports.createUser = async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
    }
    try {
        const user = await userService.createUser(req.body);
        // Generate JWT token after user creation
        const token = user.generateAuthToken();
        // Set token as HTTP-only cookie
        // res.cookie('token', token, {
        //     httpOnly: true,
        //     secure: process.env.NODE_ENV === 'production',
        //     sameSite: 'strict',
        //     maxAge: 24 * 60 * 60 * 1000 // 1 day
        // });
        res.status(201).json({user,token});
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
}

module.exports.loginUser = async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
    }
    try {
        const { email, password } = req.body;
        const user = await userModel.findOne({ email }).select('+password');
        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }
        const isMatch = await user.comparePassword(password);
        if (!isMatch) {
            return res.status(401).json({ error: 'Invalid password' });
        }
        // Generate JWT token after successful login
        const token = user.generateAuthToken();
        // Set token as HTTP-only cookie
        // res.cookie('token', token, {
        //     httpOnly: true,
        //     secure: process.env.NODE_ENV === 'production',
        //     sameSite: 'strict',
        //     maxAge: 24 * 60 * 60 * 1000 // 1 day
        // });
        res.status(200).json({user,token});
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
}

module.exports.getUserProfile = async (req, res) => {
    try {
        const user = req.user; // User is set by authUser middleware
        res.status(200).json(user);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
}

module.exports.logoutUser = async (req, res) => {
    try {
        // Clear the cookie by setting its maxAge to 0
        res.cookie('token', '', {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'strict',
            maxAge: 0 // Clear the cookie
        });

        const token = req.cookies.token || req.headers.authorization?.split(' ')[1];

        if (token) {
            redisClient.set(token, 'logged_out', 'EX', 60 * 60 * 24); // Store token in Redis with 1 day expiration
        }
        
        res.status(200).json({ message: 'Logged out successfully' });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
}

module.exports.getAllUsers = async (req, res) => {
    try {
        const users = await userService.getAllUsers({userId: req.user._id});
        res.status(200).json(users);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
}