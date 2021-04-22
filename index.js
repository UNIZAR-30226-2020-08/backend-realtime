const http = require('http');
const express = require('express');
const socketio = require('socket.io');
const cors = require('cors');

const { addUser, removeUser, getUser, getUsersInRoom } = require('./users');
const { joinGame, repartirCartas, findAllPlayers, robarCarta } = require("./services/pertenece.service");
const { findUser } = require("./services/usuario.service");
const { getTriunfo } = require("./services/partida.service");
const { jugarCarta } = require("./services/jugada.service");
const router = require('./router');

const app = express();
const server = http.createServer(app);
const io = socketio(server);

app.use(cors());
app.use(router);

io.on('connect',  (socket) => {
  //console.log(socket);

  socket.on('join',  ({ name, room }, callback) => {
    const { error, user } = addUser({ id: socket.id, name, room });

    if(error) return callback(error);

    

    socket.join(user.room);
    var data = {
      jugador: name, partida: room
    }
    joinGame(data)
    .then(async data => {
      if (data.orden == 4){
        for (u of getUsersInRoom(user.room)){
          data = await repartirCartas({partida: u.room, jugador: u.name})
          console.log(data)
          socket.broadcast.to(user.room).emit('RepartirCartas', {repartidas: data});
          socket.emit('RepartirCartas', {repartidas: data});
        }
        getTriunfo(user.room)
        .then( data => {
          socket.broadcast.to(user.room).emit('RepartirTriunfo', {triunfoRepartido: data.triunfo});
          socket.emit('RepartirTriunfo', {triunfoRepartido: data.triunfo});
        }).catch(err => {
        });
      }
    }).catch(err => {
      //console.log(err);
    });
    
    socket.emit('message', { user: 'Las10últimas', text: `${user.name}, bienvenido a la sala ${user.room}.`});

    socket.broadcast.to(user.room).emit('message', { user: 'Las10últimas', text: `${user.name} se ha unido!` });
    // Falta buscar informacion de usuario 
    for (u of getUsersInRoom(user.room)){
      findUser(u.name)
      .then( dataUser => {
        findAllPlayers(u.room)
        .then(dataPer => {
          io.to(u.id).emit('Datos de usuario + jugadores en sala ', dataUser, dataPer);
        }).catch(err => {
          //console.log(err);
        });
      }).catch( err => {
        //console.log(err);
      });
    }
    io.to(user.room).emit('roomData', { room: user.room, users: getUsersInRoom(user.room) });

    callback();
  });

  socket.on('sendMessage', (message, callback) => {
    const user = getUser(socket.id);

    io.to(user.room).emit('message', { user: user.name, text: message });

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