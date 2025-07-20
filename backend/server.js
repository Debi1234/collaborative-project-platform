const dotenv = require("dotenv");
dotenv.config();
const http = require('http');
const app = require('./app');
const server = http.createServer(app);
const connectDB = require('./db/db');
const { Server } = require('socket.io');
const jwt = require('jsonwebtoken');
const projectModel = require("./models/project.model");
const {generateResult} = require("./services/ai.service");

connectDB();

// Socket.io instance (will be initialized in initializeSocket)
let io = null;

// Function to verify JWT from socket handshake
function authorizeSocket(socket, next) {
    const token = socket.handshake.auth?.token || socket.handshake.headers?.authorization?.split(' ')[1];
    if (!token) {
        return next(new Error('Authentication error: No token provided'));
    }
    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        socket.user = decoded; // Attach user info to socket
        next();
    } catch (err) {
        next(new Error('Authentication error: Invalid token'));
    }
}

// Function to initialize socket.io
function initializeSocket(httpServer) {
    io = new Server(httpServer, {
        cors: {
            origin: '*',
        }
    });
    // Use middleware for authorization
    io.use(authorizeSocket);
    io.on('connection', onSocketConnection);
    console.log('Socket.io initialized');
    return io;
}

// Socket connection handler
async function onSocketConnection(socket) {
    console.log('user here');
    const projectId = socket.handshake.query.projectId;
    
    if (!projectId) {
        console.error('No projectId provided in socket connection');
        socket.disconnect();
        return;
    }
    
    try {
        const project = await projectModel.findById(projectId);
        if (project) {
            socket.project = project; // Assign project to socket
            const roomId = project._id.toString();
            socket.join(roomId);
            console.log(`User joined project room: ${roomId}`);
        } else {
            console.error('Project not found:', projectId);
            socket.disconnect();
            return;
        }
    } catch (error) {
        console.error('Error finding project:', error);
        socket.disconnect();
        return;
    }

    socket.on('project-message', (data) => {
        console.log('Project message received:', data);
        if(data.text && data.text.trim().startsWith('@ai ')) {
            const roomId = socket.project._id.toString();
            const prompt = data.text.trim().substring(4); // Remove '@ai ' prefix
            generateResult(prompt)
            .then(aiResult => {
                let parsed;
                try {
                    // Try to parse as JSON directly
                    parsed = typeof aiResult === 'string' ? JSON.parse(aiResult) : aiResult;
                } catch (e) {
                    // Try to extract JSON from a Markdown code block
                    if (typeof aiResult === 'string') {
                        const match = aiResult.match(/```json\n([\s\S]*?)\n```/);
                        if (match) {
                            try {
                                parsed = JSON.parse(match[1]);
                            } catch {
                                parsed = { text: aiResult, filetree: null };
                            }
                        } else {
                            parsed = { text: aiResult, filetree: null };
                        }
                    } else {
                        parsed = { text: '', filetree: null };
                    }
                }
                let filetree = parsed.fileTree || parsed.filetree;
                if (typeof filetree === 'string') {
                    try {
                        filetree = JSON.parse(filetree);
                    } catch {
                        if (filetree === 'null') filetree = null;
                    }
                }
                const aiMessage = {
                    text: parsed.text,
                    filetree,
                    sender: 'ai',
                    email: 'AI'
                };
                console.log(aiMessage)
                io.to(roomId).emit('project-message', aiMessage);
            })
                .catch(err => {
                    console.error('Error generating AI response:', err);
                    socket.emit('project-message', { text: 'Error generating AI response', sender: 'system' });
                });
            return;
        }

        // Broadcast message to all clients in the project room
        if (socket.project && socket.project._id) {
            const roomId = socket.project._id.toString();
            socket.broadcast.to(roomId).emit('project-message', data);
        }
    });

    socket.on('message', (data) => {
        // Handle incoming messages here
    });
    
    socket.on('disconnect', () => {
        console.log('Client disconnected:', socket.id);
    });
}

// Initialize socket.io with the HTTP server
initializeSocket(server);

const port = process.env.PORT || 3000;
server.listen(port, () => {
    console.log(`Server running on port ${port}`);
});

