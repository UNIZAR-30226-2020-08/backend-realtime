const http = require('http');
const express = require('express');
const socketio = require('socket.io');
const cors = require('cors');

const { addUser, removeUser, getUser, getUsersInRoom, getUserByName, pausarPartida, reanudarPartida } = require('./users');
const { addPlayer, removePlayer, getPlayer, getUsersInTournamet, partidaFinalizada } = require('./tournament');
const { joinGame, repartirCartas, findAllPlayers, robarCarta, findPlayer, deletePlayer } = require("./services/pertenece.service");
const { findUser,sumarCopas,restarCopas } = require("./services/usuario.service");
const { unirseTorneo, salirTorneo } = require("./services/participa_torneo.service");
const { emparejamientos, updateCuadroTorneo } = require("./services/torneo.service");
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
      const dataPlay = await pasueGame({partida: room, estado: 0});
      const { error, user } = addUser({id: socket.id, name, room, orden: data.orden})
      //const { error1, userIA } = addUser({name:'IA', room, orden: (data.orden + 1)})
      if(error) return callback(error);
      //if(error1) return callback(error1);
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
        const dataPlay = await pasueGame({partida: room, estado: 0});
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
    try {
      const user = getUser(socket.id);
      if (user){
        io.to(user.room).emit('message', { user: user.name, text: message });
      }
      callback();
    }catch(err){
      console.log(err)
    }
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
      console.log('El PAUSE: ', pausar )
      if (pausar === 'PRIMER VOTO ANOTADO'){
        socket.broadcast.to(data.partida).emit('pauseRequest', { pauseMessage: ` ${data.usuario} ha solicitado pausa` });
      }
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
    usuario: <nombre_usuario>,
    tipo: <tipo>
  }
  */
  socket.on('reanudarPartida', async (data, callback) => {
    try{
      const msgReanudar = reanudarPartida(data)
      console.log('MSG REANUDACION',msgReanudar)
      const dataP = await findPlayer({partida: data.partida, jugador: data.usuario})
      socket.emit('orden', dataP.orden);
      const { error, user } = addUser({id: socket.id, name: data.usuario, room: data.partida, orden: dataP.orden})
      if(error) return callback(error);
      socket.join(data.partida)
      socket.emit('message', { user: 'Las10últimas', text: `${user.name}, bienvenido a la sala ${user.room}.`});
      socket.broadcast.to(data.partida).emit('message', { user: 'Las10últimas', text: `${user.name} se ha unido!` });

      if(msgReanudar === "SE REANUDA"){
        const lastRound = await findLastRound(data)
        console.log(lastRound)
        const dataLastRound = await getRoundWinnerIA({nronda: lastRound.nronda,partida:data.partida})
        const dataT = await getTriunfo(data.partida)
        socket.broadcast.to(data.partida).emit('RepartirTriunfoRP', {triunfoRepartido: dataT.triunfo, nronda: lastRound.nronda, 
              winner:dataLastRound.jugador, puntos_e0: dataT.puntos_e0, puntos_e1: dataT.puntos_e1});
        socket.emit('RepartirTriunfoRP', {triunfoRepartido: dataT.triunfo, nronda: lastRound.nronda, 
              winner:dataLastRound.jugador, puntos_e0: dataT.puntos_e0, puntos_e1: dataT.puntos_e1});
        const dataPause = await pasueGame({partida: data.partida, estado: 0});
        const dataPlayers = await findAllPlayers(data.partida)
        for (u of dataPlayers){
          //const dataC = await repartirCartas({partida: u.room, jugador: u.name})
          const dataPlayer = await findUser(u.jugador)
          u['copas'] = dataPlayer.copas
          u['f_perfil'] = dataPlayer.f_perfil
          console.log(u)
          socket.broadcast.to(data.partida).emit('RepartirCartasRP', {repartidas: u});
          socket.emit('RepartirCartasRP', {repartidas: u});
        }
      }
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
    console.log('LLAMA A CARTA JUGADA', data)
    const dataPlay = await jugarCarta(data)
    //console.log(dataPlay.cartaJugada);
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
    const dataP = await getTriunfo(data.partida)
    if ((dataP.tipo === 0) && (data.nronda === 19)){
      console.log('INTENTA CAMBIAR EN LA ULTIMA RONDA: ', orden[0])
      const dataCambio = await cambiar7({jugador: orden[0], nombre: data.partida})
      io.to(data.nombre).emit('cartaCambio', {tuya: dataCambio});
    }else if ((dataP.tipo === 1) && (data.nronda === 9)){
      console.log('INTENTA CAMBIAR EN LA ULTIMA RONDA: ', orden[0])
      const dataCambio = await cambiar7({jugador: orden[0], nombre: data.partida})
      io.to(data.nombre).emit('cartaCambio', {tuya: dataCambio});
    }
    console.log('EL ORDEN ES: ',orden);
    for (u of orden){
      data['jugador'] = u;
      //console.log(data);
      const dataRob = await robarCarta(data)
      //console.log('Robar Carta', dataRob);
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
      //console.log('socket ID: ',toEmit)
      if (data.nronda > 0){
        const dataWinner = await getRoundWinnerIA({nronda: (data.nronda - 1), partida: data.partida})
        if (dataWinner.jugador === 'IA'){
          const dataCante = await cantar({nombre: data.partida, jugador: 'IA'})
          await sumarEnCante({nombre: data.partida, jugador: 'IA'},dataCante)
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
      //console.log(dataPlay)
      //console.log(data.partida)
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
      const dataPartida = await getTriunfo(data.partida)
      console.log('DATA RECUENTO', dataPartida )
      console.log('RESULTADO Y VUELTAS', {puntos_e0: dataPartida.puntos_e0, 
        puntos_e1: dataPartida.puntos_e1 } )
      //const dataPlayers = await findAllPlayers(data.partida)
      const dataDelete = await deleteCard({partida: data.partida, carta: 'NO'})
      //console.log(dataDelete)
      if (dataPartida.puntos_e0 >= 101){
        io.to(data.partida).emit('Resultado', {puntos_e0: dataPartida.puntos_e0, 
                                               puntos_e1: dataPartida.puntos_e1 });
        if (dataPartida.id_torneo !== 'NO'){
          const dataCuadroT = await updateCuadroTorneo({torneo: dataPartida.id_torneo, 
                    partida: dataPartida.nombre, eq_winner: 0})
        }                                       
        
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
        if (dataPartida.id_torneo !== 'NO'){
        const dataCuadroT = await updateCuadroTorneo({torneo: dataPartida.id_torneo, 
                  partida: dataPartida.nombre, eq_winner: 1})
        }  

        //Sumar a los ganadores Y restar a los perdedores
        const dataJugadores = await findAllPlayers(data.partida)
        var copas = {};
        for (a of dataJugadores){
          //console.log('EL EQUIPO', a.equipo)
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
        //console.log(dataVueltas)
        //Se reparte de nuevo
        const dataJugadores = await findAllPlayers(data.partida)
        for (u of dataJugadores){
          const dataC = await repartirCartas({partida: u.partida, jugador: u.jugador})
          const dataPlayer = await findUser(u.jugador)
          dataC['copas'] = dataPlayer.copas
          dataC['f_perfil'] = dataPlayer.f_perfil
          //console.log(dataC)
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
      await sumarEnCante(data,dataCante)
      //const uId = await getUserByName(data.jugador);
      //io.to(uId.id).emit('Cante', {tuya: dataCante.pertenece});
      io.to(data.nombre).emit('cante', dataCante);
      callback();
    }catch(err){
      console.log(err)
    }
  });

  socket.on('leavePartidaRP', async () => {
    try {
      const userID = getUser(socket.id);
      if (userID){
        socket.leave(userID.room)
        //io.to(userID.room).emit('message', { user: 'Las10últimas', text: `${user.name} abandonó la partida.` });
        //io.to(userID.room).emit('roomData', { room: user.room, users: getUsersInRoom(user.room)});
      }
      const user = removeUser(socket.id);
    }catch(err){
      console.log(err)
    }
  })

     /* FORMATO DE DATA
    data = {
    jugador: <username>,
    partida: <nombre_partida>,
    }
    */
  socket.on('leavePartida', async (data) => {
    try{
      console.log(`${data.jugador} HA ABANDONADO LA PARTIDA`)
      const dataPartida = await getTriunfo(data.partida)
      console.log(dataPartida)
      if (dataPartida.puntos_e0 < 101 && dataPartida.puntos_e1 < 101 && dataPartida.estado == 0){
          const dataJugadores = await findAllPlayers(data.partida)
          var copas = {};
          var miJugador = dataJugadores.find((e) => (data.jugador === e.jugador));
          console.log(` MI JUGADOR `, miJugador.equipo)
          var dataActualizada = {}
          if(miJugador.equipo === 0){
            console.log(` HA PERDIDO EL EQUIPO ${miJugador.equipo}`)
            //NO PAUSA EL JUEGO 
            //ES UN Partida.update
            dataActualizada = await pasueGame({partida: data.partida, puntos_e0: 0,puntos_e1: 101})
            if (dataPartida.id_torneo !== 'NO'){
              const dataCuadroT = await updateCuadroTorneo({torneo: dataPartida.id_torneo, 
                        partida: dataPartida.nombre, eq_winner: 1})
            }  
          }else if(miJugador.equipo === 1){
            console.log(` HA PERDIDO EL EQUIPO ${miJugador.equipo}`)
            //NO PAUSA EL JUEGO 
            //ES UN Partida.update
            dataActualizada = await pasueGame({partida: data.partida, puntos_e0: 101,puntos_e1: 0})
            if (dataPartida.id_torneo !== 'NO'){
              const dataCuadroT = await updateCuadroTorneo({torneo: dataPartida.id_torneo, 
                        partida: dataPartida.nombre, eq_winner: 0})
            }  
          }
          const data2send = await getTriunfo(data.partida)
          console.log('DATA 2 SEND', data2send)
          
          io.to(data.partida).emit('Resultado', {puntos_e0: data2send.puntos_e0, 
            puntos_e1: data2send.puntos_e1 });
          
            for (a of dataJugadores){
            if (a.equipo === miJugador.equipo){
              copas = await restarCopas(a.jugador)
            }else{
              copas = await sumarCopas(a.jugador)
            }
            io.to(data.partida).emit('copasActualizadas', copas)
          }
      }else if (dataPartida.estado === 2){
        const dataDelete = await deletePlayer({partida: data.partida, jugador: data.jugador})
      }
      
      socket.leave(data.partida)
      const user = removeUser(socket.id);
  
      if(user) {
        io.to(user.room).emit('message', { user: 'Las10últimas', text: `${user.name} abandonó la partida.` });
        io.to(user.room).emit('roomData', { room: user.room, users: getUsersInRoom(user.room)});
      }
    }catch(err){
      console.log(err)
    }
  })

  socket.on('disconnect', async () => {
    try {
      const user = getUser(socket.id);
      if (user){
        const dataPartida = await getTriunfo(user.room)
        //console.log(dataPartida)
        if (dataPartida.puntos_e0 < 101 && dataPartida.puntos_e1 < 101  && dataPartida.estado == 0){
            const dataJugadores = await findAllPlayers(user.room)
            var copas = {};
            console.log(dataJugadores)
            var miJugador = dataJugadores.find((e) => (user.name === e.jugador));
            console.log(` MI JUGADOR `, miJugador.equipo)
            var dataActualizada = {}
            if(miJugador.equipo === 0){
              console.log(` HA PERDIDO EL EQUIPO ${miJugador.equipo}`)
              //NO PAUSA EL JUEGO 
              //ES UN Partida.update
              dataActualizada = await pasueGame({partida: user.room, puntos_e0: 0,puntos_e1: 101})
              if (dataPartida.id_torneo !== 'NO'){
                const dataCuadroT = await updateCuadroTorneo({torneo: dataPartida.id_torneo, 
                          partida: dataPartida.nombre, eq_winner: 1})
              }  
            }else if(miJugador.equipo === 1){
              console.log(` HA PERDIDO EL EQUIPO ${miJugador.equipo}`)
              //NO PAUSA EL JUEGO 
              //ES UN Partida.update
              dataActualizada = await pasueGame({partida: user.room, puntos_e0: 101,puntos_e1: 0})
              if (dataPartida.id_torneo !== 'NO'){
                const dataCuadroT = await updateCuadroTorneo({torneo: dataPartida.id_torneo, 
                          partida: dataPartida.nombre, eq_winner: 0})
              }  
            }
            const data2send = await getTriunfo(user.room)
            console.log('DATA 2 SEND', data2send)
            
            io.to(user.room).emit('Resultado', {puntos_e0: data2send.puntos_e0, 
              puntos_e1: data2send.puntos_e1 });
            
              for (a of dataJugadores){
              if (a.equipo === miJugador.equipo){
                copas = await restarCopas(a.jugador)
              }else{
                copas = await sumarCopas(a.jugador)
              }
              io.to(user.room).emit('copasActualizadas', copas)
            }
        }else if (dataPartida.estado === 2){
            const dataDelete = await deletePlayer({partida: user.room, jugador: user.name})
        }

        socket.leave(user.room)
        const user2 = removeUser(socket.id);
    
        if(user2) {
          io.to(user2.room).emit('message', { user: 'Las10últimas', text: `${user2.name} abandonó la partida.` });
          io.to(user2.room).emit('roomData', { room: user2.room, users: getUsersInRoom(user2.room)});
        }
      }

    }catch(err){
      console.log(err)
    }
  })


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
        //Se hacen los emparejamientos
        var dataMatches
        if (nTeams === 16){
          console.log('EL TORNEO ES DE 16')
          dataMatches = await emparejamientos({torneo: tournament, fase: '0'})
        }else if (nTeams === 8){
          console.log('EL TORNEO ES DE 8')
          dataMatches = await emparejamientos({torneo: tournament, fase: '1'})
        }
        console.log('LOS MATCHES: ', dataMatches)
        io.to(tournament).emit('matches', dataMatches);
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
  socket.on('partidaTorneoFin',  async(data, callback) => {
    try {
      const dataFin = partidaFinalizada(data)

      if ((dataFin === 'TODAS ACABADAS') && (data.fase < 3)){
        const nextFase = data.fase + 1
        const dataMatches = await emparejamientos({torneo: data.torneo, fase: nextFase.toString()})
        io.to(data.torneo).emit('matches', dataMatches);
      }
      callback();
    }catch(err){
      console.log(err)
    }
  });

  /* FORMATO DE DATA
  data = {
    username: <username_remitente>, 
    nombre: <nombre_partida>, 
    tipo: <tipo_partida>, 
    destinatario: <username_destinatario>
  }
  */
  socket.on('enviarInvitacion',  async(data, callback) => {
    try{
      console.log("Invitiacion a partida")
      console.log(data)
      io.emit('invitacionRecibida', data);
      callback();
    }catch(err){
      console.log(err)
    }
  });

  //Fin del IO
});

server.listen(process.env.PORT || 5000, () => console.log(`Server has started.`));

const sumarEnCante = async (data,dataCante) => {
  const dataPartida = await getTriunfo(data.nombre)
  console.log(dataPartida)
  var puntos_e0 = dataPartida.puntos_e0
  var puntos_e1 = dataPartida.puntos_e1
  var dataActualizada
  console.log(dataCante);
  if (dataCante.length !== 0){
    for (c of dataCante){
      const dataPlayer = await findPlayer({partida: data.nombre, jugador: data.jugador})
      console.log('EL DATA PLAYER', dataPlayer)
      if (c.palo[0].toUpperCase() === dataPartida.triunfo[1]){
        if (dataPlayer.equipo === 0){
          puntos_e0 = puntos_e0 + 40
          console.log('SE SUMAN', {partida: data.nombre, puntos_e0: puntos_e0})
          dataActualizada = await pasueGame({partida: data.nombre, puntos_e0: puntos_e0})
        }else if (dataPlayer.equipo === 1){
          puntos_e1 = puntos_e1 + 40
          console.log('SE SUMAN', {partida: data.nombre, puntos_e1: puntos_e1})
          dataActualizada = await pasueGame({partida: data.nombre, puntos_e1: puntos_e1})
        }
      }else{
        if (dataPlayer.equipo === 0){
          puntos_e0 = puntos_e0 + 20
          console.log('SE SUMAN', {partida: data.nombre, puntos_e0: puntos_e0})
          dataActualizada = await pasueGame({partida: data.nombre, puntos_e0: puntos_e0})
        }else if (dataPlayer.equipo === 1){
          puntos_e1 = puntos_e1 + 20
          console.log('SE SUMAN', {partida: data.nombre, puntos_e1: puntos_e1})
          dataActualizada = await pasueGame({partida: data.nombre, puntos_e1: puntos_e1})
        }
      }
    }
  }
}