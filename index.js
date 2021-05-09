const http = require('http');
const express = require('express');
const socketio = require('socket.io');
const cors = require('cors');

const { addUser, removeUser, getUser, getUsersInRoom, getUserByName } = require('./users');
const { joinGame, repartirCartas, findAllPlayers, robarCarta } = require("./services/pertenece.service");
const { findUser } = require("./services/usuario.service");
const { deleteCard } = require("./services/carta_disponible.service");
const { getTriunfo, cambiar7, cantar, partidaVueltas } = require("./services/partida.service");
const { jugarCarta, getRoundWinner, getRoundOrder } = require("./services/jugada.service");
const router = require('./router');

const app = express();
const server = http.createServer(app);
const io = socketio(server);

app.use(cors());
app.use(router);

io.on('connect',  (socket) => {
  //console.log(socket);

  socket.on('join',  ({ name, room, tipo }, callback) => {
    const { error, user } = addUser({ id: socket.id, name, room });
    var maxPlayers;
    if (tipo === 0){
      maxPlayers = 2;
    }else if (tipo === 1){
      maxPlayers = 4;
    }
    if(error) return callback(error);

    socket.join(user.room);
    var data = {
      jugador: name, partida: room
    }
    joinGame(data)
    .then(async data => {
      if (data.orden === maxPlayers){
        for (u of getUsersInRoom(user.room)){
          data = await repartirCartas({partida: u.room, jugador: u.name})
          console.log(data)
          socket.broadcast.to(user.room).emit('RepartirCartas', {repartidas: data});
          socket.emit('RepartirCartas', {repartidas: data});
        }
        await getTriunfo(user.room)
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

  /* FORMATO DE DATA
  data = {
    jugador: <username>,
    partida: <nombre_partida>,
    nronda: <numero_ronda>,
    carta: <carta_lanzada>
  }
  */
  socket.on('lanzarCarta', async (data, callback) => {
    const dataPlay = await jugarCarta(data)
    console.log(dataPlay);
    const uId = await getUser(data.juagdor);
    io.to(uId).emit('jugada', {mano: dataPlay.mano});
    io.to(data.partida).emit('cartaJugada', {cartaJugada: dataPlay.cartaJugada.carta, 
                                              jugador: dataPlay.cartaJugada.jugador});
  callback();
  });

  /* FORMATO DE DATA
  data = {
    partida: <nombre_partida>,
    nronda: <numero ronda>
  }
  */
  socket.on('robarCarta', async (data, callback) => {
    const orden = await getRoundOrder(data);
    console.log(orden);
    for (u of orden){
      data['jugador'] = u;
      console.log(data);
      const dataRob = await robarCarta(data)
      console.log(dataRob);
      io.to(data.partida).emit('roba', {carta: dataRob.carta, jugador: dataRob.jugador});
    }
    callback();
  });

    /* FORMATO DE DATA
  data = {
    partida: <nombre_partida>,
    nronda: <ronda>
  }
  */
  socket.on('contarPuntos', async (data, callback) => {
    const dataWinner = await getRoundWinner(data)
    console.log(dataWinner);
    io.to(data.partida).emit('winner', {winner: dataWinner.jugador});
    callback();
  });

    /* FORMATO DE DATA
  data = {
    partida: <nombre_partida>
  }
  */
  socket.on('finalizarPartida', async (data, callback) => {
    const dataPartida = await getTriunfo(data.partida)
    console.log(dataPartida);
    const dataDelete = await deleteCard({partida: data.partida, carta: 'NO'})
    console.log(dataDelete)
    if (dataPartida.puntos_e0 >= 101){
      io.to(data.partida).emit('Equipo ganador', {ganador: 'equipo 0'});
    }else if (dataPartida.puntos_e1 >= 101){
      io.to(data.partida).emit('Equipo ganador', {ganador: 'equipo 1'});
    }else{
      io.to(data.partida).emit('Vueltas', {mensaje: 'Se juega de vueltas'});
      const dataVueltas = await partidaVueltas(data)
      console.log(dataVueltas)
      //Se reparte de nuevo
      for (u of getUsersInRoom(data.partida)){
        var data = await repartirCartas({partida: u.room, jugador: u.name})
        console.log(data)
        socket.broadcast.to(data.partida).emit('RepartirCartas', {repartidas: data});
        socket.emit('RepartirCartas', {repartidas: data});
      }
      const dataTriunfo = await getTriunfo(data.partida)
      io.to(data.partida).emit('RepartirTriunfo', {triunfoRepartido: dataTriunfo.triunfo});
    }
    callback();
  });

  /* FORMATO DE DATA
  data = {
    jugador: <username>,
    nombre: <nombre_partida>,
  }
  */
  socket.on('cambiar7', async (data, callback) => {
    const dataCambio = await cambiar7(data)
    console.log(dataCambio);
    //const uId = await getUserByName(data.juagdor);
    io.to(data.nombre).emit('cartaCambio', {tuya: dataCambio.pertenece});
    io.to(data.nombre).emit('cartaMedio', {medio: dataCambio.partidaCante});
    callback();
  });

   /* FORMATO DE DATA
  data = {
    jugador: <username>,
    nombre: <nombre_partida>,
  }
  */
  socket.on('cantar', async (data, callback) => {
    const dataCante = await cantar(data)
    console.log(dataCante);
    //const uId = await getUserByName(data.juagdor);
    //io.to(uId.id).emit('Cante', {tuya: dataCante.pertenece});
    io.to(data.nombre).emit('cante', {cante: dataCante});
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