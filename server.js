const express = require('express');
const app = express();
const http = require('http').createServer(app);
const io = require('socket.io')(http);

let players = {};
let ball = { x: 300, y: 200, vx: 3, vy: 3 }; // Adjusted for slower ball speed
let score = { player1: 0, player2: 0 };
let gameStarted = false;

app.use(express.static('public'));

app.get('/', (req, res) => {
    res.sendFile(__dirname + '/index.html');
});

io.on('connection', (socket) => {
    console.log("Player connected:", socket.id);


    if (Object.keys(players).length < 2) {
        const playerNumber = Object.keys(players).length + 1;
        players[socket.id] = { paddleY: 150, playerNumber: playerNumber };
        socket.emit('playerNumber', playerNumber);

        if (Object.keys(players).length === 2) {
            io.emit('readyToStart');
        }
    } else {
        socket.emit('roomFull');
        socket.disconnect();
    }

    socket.on('startGame', () => {
        if (Object.keys(players).length === 2 && !gameStarted) {
            gameStarted = true;
            io.emit('gameStarted', { players, ball, score });
            startGame();
        }
    });

    socket.on('paddleMove', (data) => {
        if (players[socket.id]) {
            players[socket.id].paddleY = data.y;
            socket.broadcast.emit('paddleUpdate', { playerNumber: players[socket.id].playerNumber, y: data.y });
        }
    });

    socket.on('resetGame', () => {
        gameStarted = false;
    players = {};
    ball = { x: 300, y: 200, vx: 3, vy: 3 };
    score = { player1: 0, player2: 0 };
    io.emit('gameReset'); // Notify all clients to reset their game state
    });

    socket.on('disconnect', () => {
        delete players[socket.id];
        if (Object.keys(players).length < 2) {
            gameStarted = false;
            io.emit('gameReset');
        }
    });
});

function startGame() {
    const gameInterval = setInterval(() => {
        if (!gameStarted) {
            clearInterval(gameInterval);
            return;
        }

        // Update ball position
        ball.x += ball.vx;
        ball.y += ball.vy;

        // Reflect ball on top or bottom walls
        if (ball.y <= 0 || ball.y >= 400) {
            ball.vy = -ball.vy;
        }

        // Check for paddle collisions
        checkPaddleCollisions();

        // Check for scoring
        if (ball.x <= 0 || ball.x >= 600) {
            const scoringPlayer = ball.x <= 0 ? 'player2' : 'player1';
            score[scoringPlayer]++;
            resetBall();

            if (score[scoringPlayer] === 5) {
                clearInterval(gameInterval);
                io.emit('gameOver', score);
                gameStarted = false;
                resetGame();
            }
        }

        // Emit updated game state to all clients
        io.emit('gameState', { ball, score });

    }, 1000 / 60); // 60 FPS update rate
}

function checkPaddleCollisions() {
    const leftPaddleX = 10; // x position of the left paddle
    const rightPaddleX = 580; // x position of the right paddle
    const paddleWidth = 10; // Width of the paddle
    const paddleHeight = 100; // Height of the paddle
    const ballRadius = 7; // Radius of the ball

    // Check collision with left paddle
    if (ball.x - ballRadius < leftPaddleX + paddleWidth && ball.x - ballRadius > leftPaddleX) {
        let leftPlayerId = Object.keys(players)[0]; // Assuming the first player is on the left
        if (ball.y + ballRadius > players[leftPlayerId].paddleY && ball.y - ballRadius < players[leftPlayerId].paddleY + paddleHeight) {
            ball.vx = Math.abs(ball.vx); // Ensure ball moves right
        }
    }

    // Check collision with right paddle
    if (ball.x + ballRadius > rightPaddleX && ball.x + ballRadius < rightPaddleX + paddleWidth) {
        let rightPlayerId = Object.keys(players)[1]; // Assuming the second player is on the right
        if (ball.y + ballRadius > players[rightPlayerId].paddleY && ball.y - ballRadius < players[rightPlayerId].paddleY + paddleHeight) {
            ball.vx = -Math.abs(ball.vx); // Ensure ball moves left
        }
    }
}

function resetBall() {
    ball.x = 300;
    ball.y = 200;
    ball.vx = -ball.vx;
    ball.vy = -ball.vy;
}

function resetGame() {
    players = {};
    ball = { x: 300, y: 200, vx: 3, vy: 3 }; // Reset to slower ball speed
    score = { player1: 0, player2: 0 };
}

http.listen(3000, () => {
    console.log('Server is running on port 3000');
});
