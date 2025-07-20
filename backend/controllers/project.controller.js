const projectModel = require('../models/project.model');
const { validationResult } = require('express-validator');
const projectService = require('../services/project.service');

module.exports.createProject = async(req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
    }

    try {
        const { name } = req.body;
        const userId = req.user._id;

        if (!name) {
            return res.status(400).json({ error: 'Project name is required' });
        }

        // Check if project already exists for this user
        const existingProject = await projectModel.findOne({name});
        if (existingProject) {
            return res.status(409).json({ error: 'Project already exists' });
        }

        const project = await projectService.createProject({ name, userId });

        res.status(201).json(project);
    } catch (error) {
        console.error('Error creating project:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
}

module.exports.getAllProjects = async(req, res) => {
    try {
        const userId = req.user._id;

        if (!userId) {
            return res.status(400).json({ error: 'User ID is required' });
        }

        const projects = await projectService.allUserProjects(userId);

        if (projects.length === 0) {
            return res.status(404).json({ message: 'No projects found for this user' });
        }

        res.status(200).json(projects);
    } catch (error) {
        console.error('Error fetching projects:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
}

module.exports.addUserToProject = async(req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
    }

    const { projectId, users } = req.body;
    const userId = req.user._id;

    const UpdatedProject = await projectService.addUserToProject(projectId, users, userId);
    if (!UpdatedProject) {
        return res.status(404).json({ error: 'Project not found or you are not authorized to add users' });
    }

    res.status(200).json(UpdatedProject);
}

module.exports.getProjectById = async(req, res) => {
    const { projectId } = req.params;
    // const userId = req.user._id;

    if (!projectId) {
        return res.status(400).json({ error: 'Project ID is required' });
    }

    try {
        const project = await projectModel.findById(projectId).populate('users'); // Populate user details
        if (!project) {
            return res.status(404).json({ error: 'Project not found' });
        }

        // if (!project.users.some(user => user._id.equals(userId))) {
        //     return res.status(403).json({ error: 'You are not authorized to view this project' });
        // }

        res.status(200).json(project);
    } catch (error) {
        console.error('Error fetching project:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
}
