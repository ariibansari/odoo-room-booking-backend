const express = require('express');
const createError = require('http-errors');
const morgan = require('morgan');
const cors = require("cors");
const corsOptions = require('./config/corsOptions');
require('dotenv').config();

const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(morgan('dev'));

app.use(cors(corsOptions))

app.use('/api/auth', require('./routes/auth.route'));
app.use('/api/user', require('./routes/user.route'));


app.use((req, res, next) => {
    next(createError.NotFound());
});


const server = require('http').Server(app);
const io = require('socket.io')(server, {
    cors: {
        origin: corsOptions.allowedOrigins
    }
});

const connectedClients = {};

io.on('connection', (socket) => {

    const { id } = socket.handshake.query;

    // Store the socket with its ID
    if (!connectedClients[id]) {
        connectedClients[id] = socket;
    }

    socket.on('disconnect', () => {
        // console.log('User disconnected - ', id);

        // Remove the socket from the list of connected clients when it disconnects
        delete connectedClients[id];
    });

    socket.on('sendMessage', ({ id, message }) => {
        console.log(`Received message from ${id}:`, message);
        // Emit the 'newMessage' event to all clients
        io.emit('newMessage', message);
    });
});

const emitMessageToClient = (clientId, eventName, eventBody) => {
    if (clientId === null) {
        io.emit(eventName, eventBody)
    }
    else {
        // Get the socket for the client with the given ID
        let clientSocket = connectedClients[clientId];
        if (clientSocket) {
            // Emit the 'newMessage' event to the client
            clientSocket.emit(eventName, eventBody);
        } else {
            console.log(`Client with ID ${clientId} not found`);
        }
    }


};

module.exports = { server, emitMessageToClient };