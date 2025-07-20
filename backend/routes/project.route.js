const { Router } = require('express');
const projectController = require('../controllers/project.controller');
const { authUser } = require('../middlewares/auth.middleware');
const { body } = require('express-validator');
const router = Router();

router.post('/create', authUser,
    body('name').notEmpty().withMessage('Project name is required'),
    projectController.createProject);

router.get('/all', authUser, projectController.getAllProjects);
router.put('/add-user',
    authUser,
    body('projectId').notEmpty().isString().withMessage('Project ID is required'),
    body('users').isArray({ min: 1 }).withMessage('Users must be a non-empty array')
        .custom((arr) => arr.every(id => typeof id === 'string' && id.match(/^[a-fA-F0-9]{24}$/))).withMessage('Each user must be a valid MongoId'),
    projectController.addUserToProject);

router.get('/get-project/:projectId', authUser, projectController.getProjectById);

module.exports = router;