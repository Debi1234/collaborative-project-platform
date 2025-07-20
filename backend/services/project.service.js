const projectModel = require("../models/project.model");

const createProject = async ({ name, userId }) => {
    try {
        if (!name || !userId) {
            throw new Error('Project name and user ID are required');
        }

        const project = new projectModel({
            name,
            users: [userId]
        });

        await project.save();
        return project;
    } catch (error) {
        throw new Error(`Failed to create project: ${error.message}`);
    }
}

const allUserProjects = async (userId) => {
    try {
        if (!userId) {
            throw new Error('User ID is required');
        }
        const projects = await projectModel.find({ users: userId });
        return projects;
    } catch (error) {
        throw new Error(`Failed to fetch user projects: ${error.message}`);
    }
}

const addUserToProject = async (projectId, users,LoggedInUserId) => {
    try {
        if (!projectId || !users || users.length === 0) {
            throw new Error('Project ID and users array are required');
        }

        const project = await projectModel.findById(projectId);
        if (!project) {
            throw new Error('Project not found');
        }

        if (project.users.includes(LoggedInUserId)) {
            project.users.push(...users);
            await project.save();
            return project;
        }
        
    } catch (error) {
        throw new Error(`Failed to add user to project: ${error.message}`);
    }
}

module.exports = {
    createProject,
    allUserProjects,
    addUserToProject
}