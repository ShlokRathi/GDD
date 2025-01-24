const localVideo = document.getElementById('localVideo');
const remoteVideo = document.getElementById('remoteVideo');
const startButton = document.getElementById('startButton');
const socket = new WebSocket('ws://localhost:3000');
const configuration = { iceServers: [{ urls: 'stun:stun.l.google.com:19302' }] };

let peerConnection;
let localStream;
let userId = `user-${Math.random().toString(36).substring(2, 10)}`; // Unique user ID for the session
const roomId = 'test-room';

// Handle "Start Video Call" button click
startButton.addEventListener('click', () => {
    startButton.style.display = 'none'; // Hide the start button
    initConnection();
});

// Open media devices
async function openMediaDevices(constraints) {
    try {
        const stream = await navigator.mediaDevices.getUserMedia(constraints);
        localVideo.srcObject = stream;
        return stream;
    } catch (error) {
        console.error('Error accessing media devices:', error);
    }
}

// Initialize connection
async function initConnection() {
    localStream = await openMediaDevices({ video: true, audio: true });

    peerConnection = new RTCPeerConnection(configuration);

    localStream.getTracks().forEach((track) => peerConnection.addTrack(track, localStream));

    peerConnection.ontrack = (event) => {
        if (!remoteVideo.srcObject) {
            remoteVideo.srcObject = event.streams[0];
        }
    };

    peerConnection.onicecandidate = (event) => {
        if (event.candidate) {
            socket.send(JSON.stringify({ roomId, type: 'candidate', candidate: event.candidate }));
        }
    };

    // Send an offer once the connection is initialized
    const offer = await peerConnection.createOffer();
    await peerConnection.setLocalDescription(offer);
    socket.send(JSON.stringify({ roomId, type: 'offer', offer }));
}

// WebSocket events
socket.addEventListener('open', () => {
    console.log('Connected to WebSocket server.');
    socket.send(JSON.stringify({ type: 'identify', userId }));
});

socket.addEventListener('message', async (message) => {
    const data = JSON.parse(message.data);
    console.log('Received message:', data);

    if (data.roomId && data.roomId !== roomId) return;

    switch (data.type) {
        case 'offer':
            await peerConnection.setRemoteDescription(new RTCSessionDescription(data.offer));
            const answer = await peerConnection.createAnswer();
            await peerConnection.setLocalDescription(answer);
            socket.send(JSON.stringify({ roomId, type: 'answer', answer }));
            break;

        case 'answer':
            await peerConnection.setRemoteDescription(new RTCSessionDescription(data.answer));
            break;

        case 'candidate':
            await peerConnection.addIceCandidate(new RTCIceCandidate(data.candidate));
            break;

        default:
            console.error('Unknown message type:', data.type);
    }
});

socket.addEventListener('close', () => {
    console.log('Disconnected from WebSocket server.');
});

socket.addEventListener('error', (error) => {
    console.error('WebSocket error:', error);
});
