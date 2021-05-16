const http = require('http');
const express = require('express');
const socketio = require('socket.io');
const cors = require('cors');

const { addUser, removeUser, getUser, getUsersInRoom, getUserByName } = require('./users');
const { addPlayer, removePlayer, getPlayer, getUsersInTournamet } = require('./tournament');
const { joinGame, repartirCartas, findAllPlayers, robarCarta, findPlayer } = require("./services/pertenece.service");
const { findUser,sumarCopas,restarCopas } = require("./services/usuario.service");
const { unirseTorneo,salirTorneo } = require("./services/participa_torneo.service");
const { emparejamientos } = require("./services/torneo.service");
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
      const dataPartida = await getTriunfo(room)
      var data;
      if (dataPartida.id_torneo === 'NO'){
        data = await joinGame({jugador: name, partida: room})
      }else{
        data = await findPlayer({partida: room, jugador: name})
      }
      const { error, user } = addUser({id: socket.id, name, room, orden: data.orden})
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
    partida: <nombre_partida>,
  }
  */
  socket.on('pausar', async (data, callback) => {
    try{
      const dataPause = await pasueGame({partida: data.partda, estado: 1});

      io.to(data.partida).emit('pause', { pauseMessage: 'se ha pausado la partida' });
  
      callback();
    }catch(err){
      console.log(err)
    }
  });
  /* FORMATO DE DATA
  data = {
    partida: <nombre_partida>,
  }
  */
  socket.on('reaudarPartida', async (data, callback) => {
    try{
      const dataPause = await pasueGame({partida: data.partda, estado: 0});
      const dataPlayers = await findAllPlayers(data.partida)
      for (u of dataPlayers){
        //const dataC = await repartirCartas({partida: u.room, jugador: u.name})
        const dataPlayer = await findUser(u.jugador)
        u['copas'] = dataPlayer.copas
        u['f_perfil'] = dataPlayer.f_perfil
        console.log(u)
        socket.broadcast.to(data.partda).emit('RepartirCartas', {repartidas: u});
        socket.emit('RepartirCartas', {repartidas: u});
      }
      const dataT = await getTriunfo(data.partida)
      socket.broadcast.to(data.partida).emit('RepartirTriunfo', {triunfoRepartido: dataT.triunfo});
      socket.emit('RepartirTriunfo', {triunfoRepartido: dataT.triunfo});
      io.to(data.partida).emit('pause', { pauseMessage: 'se ha pausado la partida' });  
      callback();
    }catch(err){
      console.log(err)
    }
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
      const dataPlayers = await findAllPlayers(data.partida)
      console.log(dataPartida);
      const dataDelete = await deleteCard({partida: data.partida, carta: 'NO'})
      console.log(dataDelete)
      if (dataPartida.puntos_e0 >= 101){
        io.to(data.partida).emit('Resultado', {puntos_e0: dataPartida.puntos_e0, 
                                               puntos_e1: dataPartida.puntos_e1 });
        
        //Sumar a los ganadores Y restar a los perdedores
        const dataJugadores = await findAllPlayers(data.partida)
        var copas = {};
        for (a of dataJugadores){
          if (a.equipo === 0){
            copas = sumarCopas(a.juagdor)
          }else{
            copas = restarCopas(a.juagdor)
          }
          io.to(data.partida).emit('copasActualizadas', copas)
        }
      }else if (dataPartida.puntos_e1 >= 101){
        io.to(data.partida).emit('Resultado', {puntos_e0: dataPartida.puntos_e0, 
                                               puntos_e1: dataPartida.puntos_e1 });

        //Sumar a los ganadores Y restar a los perdedores
        const dataJugadores = await findAllPlayers(data.partida)
        var copas = {};
        for (a of dataJugadores){
          if (a.equipo === 0){
            copas = sumarCopas(a.juagdor)
          }else{
            copas = restarCopas(a.juagdor)
          }
          io.to(data.partida).emit('copasActualizadas', copas)
        }
      }else{
        io.to(data.partida).emit('Vueltas', {mensaje: 'Se juega de vueltas'});
        const dataVueltas = await partidaVueltas(data)
        console.log(dataVueltas)
        //Se reparte de nuevo
        for (u of getUsersInRoom(data.partida)){
          const dataC = await repartirCartas({partida: u.room, jugador: u.name})
          const dataPlayer = await findUser(u.name)
          dataC['copas'] = dataPlayer.copas
          dataC['f_perfil'] = dataPlayer.f_perfil
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
    try{
      const dataCambio = await cambiar7(data)
      console.log(dataCambio);
      //const uId = await getUserByName(data.juagdor);
      io.to(data.nombre).emit('cartaCambio', {tuya: dataCambio});
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
  socket.on('cantar', async (data, callback) => {
    try{
      const dataCante = await cantar(data)
      console.log(dataCante);
      //const uId = await getUserByName(data.juagdor);
      //io.to(uId.id).emit('Cante', {tuya: dataCante.pertenece});
      io.to(data.nombre).emit('cante', dataCante);
      callback();
    }catch(err){
      console.log(err)
    }
  });

  socket.on('disconnect', () => {
    const user = removeUser(socket.id);

    if(user) {
      io.to(user.room).emit('message', { user: 'Las10últimas', text: `${user.name} abandonó la partida.` });
      io.to(user.room).emit('roomData', { room: user.room, users: getUsersInRoom(user.room)});
    }
  })
// Empieza codigo de los torneos
     /* FORMATO DE DATA
  data = {
    name: <username>,
    tournament: <nombre_partida>,
    tipo: <tipo>,
    nTeams: <nEquipos>
  }
  */
  socket.on('joinTournament',  async({name, tournament, tipo, nTeams}, callback) => {
    try {
      maxPlayers = (tipo + 1)*nTeams
      const { error, player, nPlayers } = addPlayer({ id: socket.id, name, tournament, tipo, nTeams })
      console.log('Entra al torneo ', player)
      if(error) return callback(error);
      const dataJoin = await unirseTorneo({torneo: tournament, jugador: name})
      console.log('se ha insertado en la bd ', dataJoin)
      io.to(player.tournament).emit('joinedT', {player});
      if (nPlayers === maxPlayers){
        io.to(player.tournament).emit('completo', {message: `torneo ${tournament} completo`});
      }
      callback();
    }catch(err){
      console.log(err)
    }
  });
  
 /* FORMATO DE DATA
  data = {
    torneo: <nombre_torneo>,
    fase: <nFase>,
  }
  */
  socket.on('matchTournament',  async(data, callback) => {
    try {
      const dataMatches = await emparejamientos(data)
      io.to(data.torneo).emit('matches', dataMatches);
    }catch(err){
      console.log(err)
    }
  });

  //Fin del IO
});

server.listen(process.env.PORT || 5000, () => console.log(`Server has started.`));