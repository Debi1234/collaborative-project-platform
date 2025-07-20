const {Router} = require('express');
const userController = require('../controllers/user.controller');
const { body } = require('express-validator');
const router = Router();
const { authUser } = require('../middlewares/auth.middleware');

// Validation rules for user creation
router.post('/register', [
    body('email').isEmail().withMessage('Invalid email format'),
    body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters long')
], userController.createUser);

router.post('/login', [
    body('email').isEmail().withMessage('Invalid email format'),
    body('password').exists().withMessage('Password is required')
], userController.loginUser);

router.get('/profile', authUser, userController.getUserProfile);
router.get('/logout', authUser, userController.logoutUser);
router.get('/all', authUser, userController.getAllUsers);

module.exports = router;