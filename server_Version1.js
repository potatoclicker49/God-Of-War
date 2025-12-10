const express = require('express');
const http = require('http');
const socketio = require('socket.io');
const path = require('path');

const app = express();
const server = http.createServer(app);
const io = socketio(server);

const PORT = process.env.PORT || 3000;

const users = {}; // { socket.id: { name, isAdmin, x, y, flying } }
let ownerPassword = 'admin123'; // Change this!

app.use(express.static(path.join(__dirname, 'public')));

app.use(express.json());

// Simple login for admin panel
app.post('/api/login', (req, res) => {
    const { password } = req.body;
    if (password === ownerPassword) {
        res.json({ success: true, token: 'admintoken' });
    } else {
        res.json({ success: false });
    }
});

io.on('connection', (socket) => {
    socket.on('join', ({ name }) => {
        users[socket.id] = { name, isAdmin: false, x: 10, y: 10, flying: false };
        io.emit('players', users);
    });

    socket.on('move', (dir) => {
        if (!users[socket.id]) return;
        let { x, y } = users[socket.id];
        if (dir === 'left') x -= 1;
        if (dir === 'right') x += 1;
        if (dir === 'up') y -= 1;
        if (dir === 'down') y += 1;
        users[socket.id].x = x;
        users[socket.id].y = y;
        io.emit('players', users);
    });

    socket.on('setAdmin', (adminToken, targetId) => {
        if (adminToken === 'admintoken' && users[targetId]) {
            users[targetId].isAdmin = true;
            io.emit('players', users);
        }
    });

    socket.on('adminEvent', (adminToken, eventName) => {
        if (adminToken === 'admintoken') {
            if (eventName === 'fly') {
                Object.keys(users).forEach(id => users[id].flying = true);
                io.emit('players', users);
            }
        }
    });

    socket.on('disconnect', () => {
        delete users[socket.id];
        io.emit('players', users);
    });
});

server.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
});