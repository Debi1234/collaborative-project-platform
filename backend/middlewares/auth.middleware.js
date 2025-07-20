const jwt = require('jsonwebtoken');
const redisClient = require('../services/redis.service');
const userModel = require('../models/user.model');

const authUser = async (req, res, next) => {
    try {
        const token = req.headers.authorization?.split(' ')[1] || req.cookies.token;
        if (!token) {
            return res.status(401).json({ error: 'Unauthorized' });
        }
        const isBlacklisted = await redisClient.get(token);
        if (isBlacklisted) {
            res.cookie('token', '', {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'strict',
            maxAge: 0 // Clear the cookie
        });
            return res.status(401).json({ error: 'Unauthorized' });
        }

        const decodedToken = jwt.verify(token, process.env.JWT_SECRET);
        // Fetch the complete user from the database
        const user = await userModel.findOne({ email: decodedToken.email }).select('-password');
        if (!user) {
            return res.status(401).json({ error: 'Unauthorized' });
        }
        req.user = user;
        next();
    } catch (error) {
        res.status(401).json({ error: 'Unauthorized' });
    }
};

module.exports = { authUser };