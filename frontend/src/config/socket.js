import { io } from 'socket.io-client';

// Function to create and export a socket instance
// Pass JWT token as auth for secure connection
export let socketInstance = null;

export function initialize(projectId) {
    const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:5000';
    console.log('Connecting to socket server:', apiUrl);
    
    socketInstance = io(apiUrl, {
        auth: { token: localStorage.getItem('token') },
        query: { projectId },
        // Add reconnection options
        reconnection: true,
        reconnectionAttempts: 5,
        reconnectionDelay: 1000,
        reconnectionDelayMax: 5000,
        timeout: 20000,
    });

    // Add connection event listeners
    socketInstance.on('connect', () => {
        console.log('Socket connected successfully');
    });

    socketInstance.on('disconnect', (reason) => {
        console.log('Socket disconnected:', reason);
    });

    socketInstance.on('reconnect', (attemptNumber) => {
        console.log('Socket reconnected after', attemptNumber, 'attempts');
    });

    socketInstance.on('reconnect_error', (error) => {
        console.error('Socket reconnection error:', error);
    });

    return socketInstance;
}

export function receiveMessage(event, callback) {
    if (!socketInstance) {
        console.error('Socket instance not initialized');
        return;
    }
    socketInstance.on(event, callback);
    return () => {
        socketInstance.off(event, callback);
    };
}

export function sendMessage(event, data) {
    if (!socketInstance) {
        console.error('Socket instance not initialized');
        return;
    }
    socketInstance.emit(event, data);
}

