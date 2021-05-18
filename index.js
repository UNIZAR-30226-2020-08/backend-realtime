const http = require('http');
const express = require('express');
const socketio = require('socket.io');
const cors = require('cors');

const { addUser, removeUser, getUser, getUsersInRoom, getUserByName, pausarPartida, reanudarPartida } = require('./users');
const { addPlayer, removePlayer, getPlayer, getUsersInTournamet } = require('./tournament');
const { joinGame, repartirCartas, findAllPlayers, robarCarta, findPlayer } = require("./services/pertenece.service");
const { findUser,sumarCopas,restarCopas } = require("./services/usuario.service");
const { unirseTorneo,salirTorneo } = require("./services/participa_torneo.service");
const { emparejamientos } = require("./services/torneo.service");
const { deleteCard } = require("./services/carta_disponible.service");
const { getTriunfo, cambiar7, cantar, partidaVueltas, recuento, pasueGame,juegaIA} = require("./services/partida.service");
const { jugarCarta, getRoundWinner, getRoundOrder,findLastRound, getRoundWinnerIA } = require("./services/jugada.service");
const router = require('./router');

const app = express();
const server = http.createServer(app);
const io = socketio(server);

app.use(cors());
app.use(router);

io.on('connect',  (socket) => {
  //console.log(socket);
  socket.on('joinPartidaIA',  async({ name, room, tipo }, callback) => {
    try {
      const data = await joinGame({jugador: name, partida: room})
      const dataIA = await joinGame({jugador: 'IA', partida: room})
      const { error, user } = addUser({id: socket.id, name, room, orden: data.orden})
      //const { error, userIA } = addUser({name:'IA', room, orden: (data.orden + 1)})
      if(error) return callback(error);
      console.log('Socket ID de join IA: ', user.id)
      io.to(user.room).emit('roomData', { room: user.room, users: getUsersInRoom(user.room)});
    
      socket.join(user.room);
      socket.emit('orden', data.orden);
      //Se reparte al usuario 
      const dataC = await repartirCartas({partida: user.room, jugador: user.name})
      const dataPlayer = await findUser(user.name)
      dataC['copas'] = dataPlayer.copas
      dataC['f_perfil'] = dataPlayer.f_perfil
      console.log(dataC)
      console.log('user.room es: ',user.room)
      socket.broadcast.to(user.room).emit('RepartirCartas', {repartidas: dataC});
      socket.emit('RepartirCartas', {repartidas: dataC});
      //Se reparte a la IA
      const dataC_IA = await repartirCartas({partida: user.room, jugador: 'IA'})

      const dataT = await getTriunfo(user.room)
      socket.broadcast.to(user.room).emit('RepartirTriunfo', {triunfoRepartido: dataT.triunfo});
      socket.emit('RepartirTriunfo', {triunfoRepartido: dataT.triunfo});
      socket.emit('message', { user: 'Las10últimas', text: `${user.name}, bienvenido a la sala ${user.room}.`});
    }catch(err){
      console.log(err)
    }
  });
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
      if(error) return callback(error);
      //console.log(user)
      
      io.to(user.room).emit('roomData', { room: user.room, users: getUsersInRoom(user.room)});
    
      socket.join(user.room);
      socket.emit('orden', data.orden);
      //console.log(`Tu orden es : ${data.orden}`)
      var maxPlayers = (tipo+1)*2
      if (data.orden === maxPlayers){
        for (u of getUsersInRoom(user.room)){
          const dataC = await repartirCartas({partida: u.room, jugador: u.name})
          const dataPlayer = await findUser(u.name)
          dataC['copas'] = dataPlayer.copas
          dataC['f_perfil'] = dataPlayer.f_perfil
          console.log(dataC)
          console.log('user.room es: ',user.room)
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
    usuario: <nombre_usuario>,
    tipo: <tipo_partida>
  }
  */
  socket.on('pausar', async (data, callback) => {
    try{
      const pausar = pausarPartida(data);
      if (pausar === 'PAUSA'){
        const dataPause = await pasueGame({partida: data.partida, estado: 1});
        io.to(data.partida).emit('pause', { pauseMessage: 'se ha pausado la partida' });
      }
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
      const dataPause = await pasueGame({partida: data.partida, estado: 0});
      const dataPlayers = await findAllPlayers(data.partida)
      for (u of dataPlayers){
        //const dataC = await repartirCartas({partida: u.room, jugador: u.name})
        const dataPlayer = await findUser(u.jugador)
        u['copas'] = dataPlayer.copas
        u['f_perfil'] = dataPlayer.f_perfil
        console.log(u)
        socket.broadcast.to(data.partida).emit('RepartirCartas', {repartidas: u});
        socket.emit('RepartirCartas', {repartidas: u});
      }
      const dataT = await getTriunfo(data.partida)
      socket.broadcast.to(data.partida).emit('RepartirTriunfo', {triunfoRepartido: dataT.triunfo});
      socket.emit('RepartirTriunfo', {triunfoRepartido: dataT.triunfo});
      
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
    const uId = await getUser(data.jugador);
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
    console.log('EL ORDEN ES: ',orden);
    for (u of orden){
      data['jugador'] = u;
      //console.log(data);
      const dataRob = await robarCarta(data)
      console.log('Robar Carta', dataRob);
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
    console.log(data)
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
    partida: <nombre_partida>,
    carta: <carta_rival>,
    nronda: <ronda>
  }
  */
  socket.on('lanzarCartaIA', async (data, callback) => {
    try{
      const dataJug =  getUsersInRoom(data.partida)
      const toEmit = dataJug[0].id
      console.log('socket ID: ',toEmit)
      if (data.nronda > 0){
        const dataWinner = await getRoundWinnerIA({nronda: (data.nronda - 1), partida: data.partida})
        if (dataWinner.jugador === 'IA'){
          const dataCante = await cantar({nombre: data.partida, jugador: 'IA'})
          socket.emit('cante', dataCante);
          const dataPartida = await getTriunfo(data.partida)
          if(dataPartida.triunfo[1] > 6 || dataPartida.triunfo[1] === '0' || dataPartida.triunfo[1] === '2' ){
            const dataCambio = await cambiar7({nombre: data.partida, jugador: 'IA'})
            socket.emit('cartaCambio', {tuya: dataCambio});
          }
        }
      }
      console.log('DATA DE ANDRES', data)
      const dataIA = await juegaIA(data)
      console.log('EL DATA IA', dataIA)
      var data2Write = {
        jugador: 'IA',
        partida: data.partida,
        nronda: data.nronda,
        carta: dataIA.carta
      }
      const dataPlay = await jugarCarta(data2Write)
      console.log(dataPlay)
      console.log(data.partida)
      io.to(data.partida).emit('cartaJugadaIA', dataIA);
      //socket.emit('cartaJugadaIA', dataIA);
      callback();
    }catch(err){
      console.log(err)
    }
  });

    /* FORMATO DE DATA
  data = {
    partida: <nombre_partida>
  }
  */
  socket.on('finalizarPartida', async (data, callback) => {
    try {
      const dataPartida = await recuento(data.partida)
      console.log('DATA RECUENTO', dataPartida )
      const dataPlayers = await findAllPlayers(data.partida)
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
            copas = await sumarCopas(a.jugador)
          }else{
            copas = await restarCopas(a.jugador)
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
          console.log('EL EQUIPO', a.equipo)
          if (a.equipo === 1){
            copas = await sumarCopas(a.jugador)
          }else{
            copas = await restarCopas(a.jugador)
          }
          io.to(data.partida).emit('copasActualizadas', copas)
        }
      }else{
        io.to(data.partida).emit('Vueltas', {mensaje: 'Se juega de vueltas',puntos_e0: dataPartida.puntos_e0, 
          puntos_e1: dataPartida.puntos_e1 });
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
      //const uId = await getUserByName(data.jugador);
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
      //const uId = await getUserByName(data.jugador);
      //io.to(uId.id).emit('Cante', {tuya: dataCante.pertenece});
      io.to(data.nombre).emit('cante', dataCante);
      callback();
    }catch(err){
      console.log(err)
    }
  });

  socket.on('leavePartida', () => {
    const user = removeUser(socket.id);

    if(user) {
      io.to(user.room).emit('message', { user: 'Las10últimas', text: `${user.name} abandonó la partida.` });
      io.to(user.room).emit('roomData', { room: user.room, users: getUsersInRoom(user.room)});
    }
  })

  socket.on('disconnect', () => {})


// EMPIEZA CODIGO DE LOS TORNEOS 
  

/* FORMATO DE DATA
  data = {
    name: <username>,
    tournament: <nombre_partida>,
    tipo: <tipo>,
    nTeams: <nEquipos>
  }*/
  socket.on('joinTournament',  async({name, tournament, tipo, nTeams}, callback) => {
    try {
      var maxPlayers = (tipo + 1)* nTeams
      const { error, player, nPlayers } = addPlayer({ id: socket.id, name, tournament, tipo, nTeams })
      socket.join(player.tournament);
      console.log('Entra al torneo ', player, nPlayers)
      if(error) return callback(error);
      const dataJoin = await unirseTorneo({torneo: tournament, jugador: name})
      console.log('se ha insertado en la bd ', dataJoin)
      console.log('el mesaje se envia a ', player.id)
      io.to(tournament).emit('joinedT', {player});
      if (nPlayers === maxPlayers){
        console.log('Se envia completo', nPlayers)
        io.to(tournament).emit('completo', {message: `torneo ${tournament} completo`});
      }
      callback();
    }catch(err){
      console.log(err)
    }
  });

 /* FORMATO DE DATA
  data = {
    torneo: <nombre_torneo>,
    ronda: <nFase>,
  }
  */
  socket.on('matchTournament',  async(data, callback) => {
    try {
      const dataMatches = await emparejamientos(data)
      io.to(data.torneo).emit('matches', dataMatches);
      callback();
    }catch(err){
      console.log(err)
    }
  });

  //Fin del IO
});

server.listen(process.env.PORT || 5000, () => console.log(`Server has started.`));