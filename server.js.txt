const WebSocket = require('ws');
const express = require('express');
const app = express();
const PORT = 3000;

// WebSocket server setup
const server = new WebSocket.Server({ port: PORT });
const clients = new Map(); // Map to track clients and their IDs

// Serve static files (optional, if you want to serve a frontend)
app.use(express.static('public'));
app.use(express.json()); // For parsing application/json

// Start Express server
app.listen(3001, () => {
    console.log('Express server is running on http://localhost:3001');
});

// WebSocket events for signaling and client management
server.on('connection', (socket) => {
    console.log('A user connected.');

    // Assign a unique ID to the client and store it
    const userId = `user-${Math.random().toString(36).substring(2, 10)}`;
    clients.set(socket, userId);
    console.log(`Assigned userId: ${userId}`);

    // Handle incoming messages
    socket.on('message', (message) => {
        console.log('Received message:', message);

        const data = JSON.parse(message);

        switch (data.type) {
            case 'identify':
                console.log(`Identified user: ${data.userId}`);
                clients.set(socket, data.userId);
                break;

            case 'join-room':
                console.log(`${clients.get(socket)} joined room: ${data.roomId}`);
                broadcast({ type: 'room-joined', userId: clients.get(socket), roomId: data.roomId });
                break;

            case 'candidate':
            case 'offer':
            case 'answer':
                // Relay signaling messages to all other clients
                broadcast(data, socket);
                break;

            default:
                console.error('Unknown message type:', data.type);
        }
    });

    // Handle client disconnection
    socket.on('close', () => {
        console.log(`A user disconnected: ${clients.get(socket) || 'Unknown'}`);
        broadcast({ type: 'user-disconnected', userId: clients.get(socket) });
        clients.delete(socket);
    });
});

// Helper function to broadcast messages to all connected clients
function broadcast(data, excludeSocket = null) {
    server.clients.forEach((client) => {
        if (client !== excludeSocket && client.readyState === WebSocket.OPEN) {
            client.send(JSON.stringify(data));
        }
    });
}

console.log(`WebSocket server is running on ws://localhost:${PORT}`);
