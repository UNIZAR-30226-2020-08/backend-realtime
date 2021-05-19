const users = [];
const prRequest = [];

const addUser = ({ id, name, room, orden }) => {
  name = name.trim().toLowerCase();
  room = room.trim().toLowerCase();

  const existingUser = users.find((user) => user.room === room && user.name === name);

  if(!name || !room) return { error: 'Username and room are required.' };
  //if(existingUser) return { error: 'Username is taken.' };

  const user = { id, name, room, orden};

  users.push(user);
  //0 es no pausado
  prRequest.push({partida: room,usuario: name,pausado: 0})

  return { user };
}

const removeUser = (id) => {
  const index = users.findIndex((user) => user.id === id);

  if(index !== -1) return users.splice(index, 1)[0];
}

const getUser = (id) => users.find((user) => user.id === id);

const getUserByName = (name) => users.find((user) => user.name === name);

const getUsersInRoom = (room) => users.filter((user) => user.room === room);
//data = {
//  partida: <nombre_partida>,
//  usuario: <nombre_usuario>,
//  tipo: <tipo_partida>
//}
const pausarPartida = (data) => {
  var maxPlayers = (data.tipo + 1) * 2
  var index = prRequest.findIndex(({partida,usuario,pausado}) => ((partida === data.partida) && (usuario === data.usuario)));
  prRequest[index].pausado = 1;
  var vec = prRequest.filter(({partida,usuario,pausado}) => ((partida === data.partida) && (pausado==1)));
  console.log('el numero de pausas aceptadas es: ',vec)
  if (vec.length === maxPlayers){
    return 'PAUSA'
  }else{
    return 'VOTO ANOTADO'
  }
}

//data = {
//  partida: <nombre_partida>,
//  usuario: <nombre_usuario>,
//  tipo: <tipo_partida>
//}
const reanudarPartida = (data) => {
  console.log('EL DATA', data)
  var maxPlayers = (data.tipo + 1) * 2
  console.log('MAX PLAYERS ',maxPlayers)
  var index = prRequest.findIndex(({partida,usuario,pausado}) => ((partida === data.partida) && (usuario === data.usuario)));
  console.log('PR REQUEST', prRequest[index])
  prRequest[index].pausado = 0;
  var vec = prRequest.filter(({partida,usuario,pausado}) => ((partida === data.partida) && (pausado == 0)));
  console.log('el numero de pausas aceptadas es: ',vec)
  if (vec.length === maxPlayers){
    return 'SE REANUDA'
  }else{
    return 'VOTO ANOTADO'
  }
}

module.exports = { addUser, removeUser, getUser, getUsersInRoom, getUserByName, pausarPartida, reanudarPartida};