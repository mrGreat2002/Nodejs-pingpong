const express = require('express');
const app = express();
const http = require('http').createServer(app);
const io = require('socket.io')(http);

let players = {};

app.use(express.static('public'));

app.get('/', (req, res) => {
    res.sendFile(__dirname + '/index.html');
});


io.on('connection', (socket) => {
    // Assign player number (1 or 2)
    const playerNumber = Object.keys(players).length < 2 ? Object.keys(players).length + 1 : null;
    if (playerNumber) {
        players[socket.id] = playerNumber;
        socket.emit('playerNumber', playerNumber);

        console.log(`Player ${playerNumber} connected`);
    } else {
        console.log('New player attempted to connect, but room is full.');
        socket.emit('roomFull');
        socket.disconnect();
    }

    socket.on('paddleMove', (data) => {
        socket.broadcast.emit('paddleUpdate', { player: players[socket.id], y: data });
    });

    socket.on('disconnect', () => {
        console.log(`Player ${players[socket.id]} disconnected`);
        delete players[socket.id];
    });
});

http.listen(3000, () => {
    console.log('listening on *:3000');
});


