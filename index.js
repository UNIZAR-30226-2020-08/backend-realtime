const pertenece = require("./services/pertenece.service");
const usuario = require("./services/usuario.service");
const http = require('http');
const express = require('express');
const socketio = require('socket.io');
const cors = require('cors');

const { addUser, removeUser, getUser, getUsersInRoom } = require('./users');

const router = require('./router');

const app = express();
const server = http.createServer(app);
const io = socketio(server);

app.use(cors());
app.use(router);

io.on('connect', (socket) => {
  console.log(socket);

  socket.on('join', ({ name, room }, callback) => {
    const { error, user } = addUser({ id: socket.id, name, room });

    if(error) return callback(error);

    socket.join(user.room);
    pertenece.joinGame({juagdor: name, partida: room})
    .then(data => {
      if (data.orden === '4'){
        for (u of getUsersInRoom(user.room)){
          pertenece.repartirCartas({partida: user.room, jugador: user.name})
          .then(data => {
            io.to(u.id).emit('RepartirCartas', data);
          }).catch( err =>{
            console.log(err);
          });
        }
      }
    }).catch(err => {
      console.log(err);
    });
    socket.emit('message', { user: 'Las10últimas', text: `${user.name}, bienvenido a la sala ${user.room}.`});

    socket.broadcast.to(user.room).emit('message', { user: 'Las10últimas', text: `${user.name} se ha unido!` });
    // Falta buscar informacion de usuario 
    io.to(user.room).emit('roomData', { room: user.room, users: getUsersInRoom(user.room) });

    callback();
  });

  socket.on('sendMessage', (message, callback) => {
    const user = getUser(socket.id);

    io.to(user.room).emit('message', { user: user.name, text: message });

    callback();
  });

  socket.on('sendMessage', (message, callback) => {
    const user = getUser(socket.id);

    io.to(user.room).emit('message', { user: user.name, carta: message });

    callback();
  });

  socket.on('disconnect', () => {
    const user = removeUser(socket.id);

    if(user) {
      io.to(user.room).emit('message', { user: 'Las10últimas', text: `${user.name} abandonó la partida.` });
      io.to(user.room).emit('roomData', { room: user.room, users: getUsersInRoom(user.room)});
    }
  })
});

server.listen(process.env.PORT || 5000, () => console.log(`Server has started.`));