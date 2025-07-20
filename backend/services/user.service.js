const userModel = require('../models/user.model');
module.exports.createUser = async (userData) => {
    const { email, password } = userData;

    if (!email || !password) {
        throw new Error('Email and password are required');
    }
    const existingUser = await userModel.findOne({ email });
    if (existingUser) {
        throw new Error('User already exists');
    }
    // Hash the password before saving
    const hashedPassword = await userModel.hashPassword(password);
    const user = new userModel({ email, password: hashedPassword });
    await user.save();
    return user;
}

module.exports.getAllUsers = async ({userId}) => {
    try {
        const users = await userModel.find(
            { _id: { $ne: userId } } // Exclude the logged-in user
        ); 
        return users;
    } catch (error) {
        throw new Error(`Failed to fetch users: ${error.message}`);
    }
}