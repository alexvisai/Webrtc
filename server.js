const express = require("express");
const http = require("http");
const app = express();
const server = http.createServer(app);
const socket = require("socket.io");
const io = socket(server);

const rooms = {};

io.on("connection", socket => {
    socket.on("join room", roomID => {
        if (rooms[roomID]) {
            if (rooms[roomID].length > 2) {
                socket.emit('limit-reached', socket.id)
                return
            }
            rooms[roomID].push(socket.id);
        } else {
            rooms[roomID] = [socket.id];
        }
        const otherUser = rooms[roomID].find(id => id !== socket.id);
        if (otherUser) {
            socket.emit("other user", otherUser);
        }   
    })
    
    socket.on("offer", payload => {
        io.to(payload.target).emit("offer", payload);
    });

    socket.on("answer", payload => {
        io.to(payload.target).emit("answer", payload);
    });

    socket.on("ice-candidate", incoming => {
        io.to(incoming.target).emit("ice-candidate", incoming.candidate);
    });

    socket.on("disconnect", () => {
        for (const roomID in rooms) {
            const index = rooms[roomID].indexOf(socket.id);
            if (index !== -1) {
                rooms[roomID].splice(index, 1);
                const otherUser = rooms[roomID].find(id => id !== socket.id);
                if (otherUser) {
                    socket.to(otherUser).emit("user disconnected", socket.id);
                }
                if (rooms[roomID].length === 0) {
                    delete rooms[roomID];
                }
                break;
            }
        }
    });
});



server.listen(8000, (url) => console.log('server is running on port 8000', url));
