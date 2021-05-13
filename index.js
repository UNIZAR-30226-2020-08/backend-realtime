const http = require('http');
const express = require('express');
const socketio = require('socket.io');
const cors = require('cors');

const { addUser, removeUser, getUser, getUsersInRoom, getUserByName } = require('./users');
const { joinGame, repartirCartas, findAllPlayers, robarCarta, findPlayer } = require("./services/pertenece.service");
const { findUser } = require("./services/usuario.service");
const { createTorneo, emparejamientos } = require("./services/torneo.service");
const { deleteCard } = require("./services/carta_disponible.service");
const { getTriunfo, cambiar7, cantar, partidaVueltas, recuento, pasueGame} = require("./services/partida.service");
const { jugarCarta, getRoundWinner, getRoundOrder } = require("./services/jugada.service");
const router = require('./router');

const app = express();
const server = http.createServer(app);
const io = socketio(server);

app.use(cors());
app.use(router);

io.on('connect',  (socket) => {
  //console.log(socket);

  socket.on('join',  async({ name, room, tipo }, callback) => {
    try {
      const data = await joinGame({jugador: name, partida: room})
      const { error, user } = addUser({ id: socket.id, name, room, orden: data.orden})
      console.log(user)
      var maxPlayers = (tipo+1)*2
      io.to(user.room).emit('roomData', { room: user.room, users: getUsersInRoom(user.room)});
      
      if(error) return callback(error);
  
      socket.join(user.room);
      socket.emit('orden', data.orden);
      console.log(`Tu orden es : ${data.orden}`)
      if (data.orden === maxPlayers){
        for (u of getUsersInRoom(user.room)){
          const dataC = await repartirCartas({partida: u.room, jugador: u.name})
          const dataPlayer = await findUser(u.name)
          dataC['copas'] = dataPlayer.copas
          dataC['f_perfil'] = dataPlayer.f_perfil
          console.log(dataC)
          socket.broadcast.to(user.room).emit('RepartirCartas', {repartidas: dataC});
          socket.emit('RepartirCartas', {repartidas: dataC});
        }
        const dataT = await getTriunfo(user.room)
        socket.broadcast.to(user.room).emit('RepartirTriunfo', {triunfoRepartido: dataT.triunfo});
        socket.emit('RepartirTriunfo', {triunfoRepartido: dataT.triunfo});
      }
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
  
      callback();
    }catch(err){
      console.log(err)
    }
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
  socket.on('pause', async (data, callback) => {
    const dataPause = await pasueGame(data.partda);

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
    console.log(dataPlay.cartaJugada);
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
    //console.log(orden);
    for (u of orden){
      data['jugador'] = u;
      //console.log(data);
      const dataRob = await robarCarta(data)
      console.log('Robar Carta',dataRob);
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
    const dataPuntos = await getTriunfo(data.partida)
    console.log('Contar Puntos', dataWinner);
    console.log('Puntos', {puntos_e0: dataPuntos.puntos_e0, puntos_e1: dataPuntos.puntos_e1});
    io.to(data.partida).emit('winner', {winner: dataWinner.jugador});
    io.to(data.partida).emit('puntos', {puntos_e0: dataPuntos.puntos_e0, puntos_e1: dataPuntos.puntos_e1});
    callback();
  });

    /* FORMATO DE DATA
  data = {
    partida: <nombre_partida>
  }
  */
  socket.on('finalizarPartida', async (data, callback) => {
    try {
      const dataPartida = await recuento(data.partida)
      console.log(dataPartida);
      const dataDelete = await deleteCard({partida: data.partida, carta: 'NO'})
      console.log(dataDelete)
      if (dataPartida.puntos_e0 >= 101 | dataPartida.puntos_e1 >= 101){
        io.to(data.partida).emit('Resultado', {puntos_e0: dataPartida.puntos_e0, 
                                               puntos_e1: dataPartida.puntos_e1 });
      }else{
        io.to(data.partida).emit('Vueltas', {mensaje: 'Se juega de vueltas'});
        const dataVueltas = await partidaVueltas(data)
        console.log(dataVueltas)
        //Se reparte de nuevo
        for (u of getUsersInRoom(data.partida)){
          const dataC = await repartirCartas({partida: u.room, jugador: u.name})
          console.log(dataC)
          socket.broadcast.to(data.partida).emit('RepartirCartas', {repartidas: dataC});
          socket.emit('RepartirCartas', {repartidas: dataC});
        }
        const dataTriunfo = await getTriunfo(data.partida)
        io.to(data.partida).emit('RepartirTriunfo', {triunfoRepartido: dataTriunfo.triunfo});
      }
      callback();
    }catch(err){
      console.log(err)
    }
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
    io.to(data.nombre).emit('cartaCambio', {tuya: dataCambio});
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
    io.to(data.nombre).emit('cante', dataCante);
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