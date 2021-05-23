const players = [];
const finalizadas = [];
const braquets = [];

const addPlayer = ({ id, name, tournament, tipo, nTeams }) => {
  maxPlayers = (tipo + 1)*nTeams
  const usersInT = getUsersInTournamet(tournament)
  if ((usersInT.length) < maxPlayers){
    name = name.trim().toLowerCase();
    tournament = tournament.trim().toLowerCase();

    const existingUser = players.find((user) => user.tournament === tournament && user.name === name);

    if(!name || !tournament) return { error: 'Username and tournament are required.' };
    if(existingUser) return { error: 'Ya participas en este torneo' };

    const player = { id, name, tournament, tipo, nTeams};

    players.push(player);

    return { player, nPlayers: (usersInT.length  + 1)  };
  }else{
    return { error: 'torneo completo' };
  }
}

const removePlayer = (data) => {
  const index = players.findIndex((player) => (player.id === data.id) && 
                                              (player.tournament === data.tournament));

  if(index !== -1) return players.splice(index, 1)[0];
}

const partidaFinalizada = (data) => {
  const fase = data.fase
  console.log('LA FASE: ', fase)
  const torneo = data.torneo  
  const partida = data.partida
  var nPartidas = 0;

  if (fase === 0){nPartidas=8}else if(fase === 1){nPartidas=4}
  else if(fase === 2){nPartidas=2}else if(fase === 3){nPartidas=1}
  console.log('NPARTIDAS: ', nPartidas)

  const prevFinished = finalizadas.find((g) => g.partida === partida);
  if (!prevFinished){
    const partida = finalizadas.push(data)
  }
  const partidasAcabadas = finalizadas.filter((p) => ((p.fase === fase) && (p.torneo === torneo)))
  console.log('EL NUMERO DE PARTIDAS ACABADAS: ', partidasAcabadas.length)
  if (partidasAcabadas.length < nPartidas){
    return 'QUEDAN PARTIDAS POR ACABAR'
  }else if (partidasAcabadas.length === nPartidas){
    console.log('TODAS ACABADAS')
    return 'TODAS ACABADAS'
  }
};

const getPlayer = (id) => players.find((player) => player.id === id);

const getPlayerByName = (name) => players.find((player) => player.name === name);

const getUsersInTournamet = (tournament) => players.filter((player) => player.tournament === tournament);

const torneoFinalizado = ((partida) => finalizadas.find((t) => t.partida === partida))

//{torneo, matches}
const saveMatches =  (data) => {
  braquets.push(data)
}

//torneo
const getMatches = (data) => {
  const partidasBraquet = braquets.filter((p) => (p.torneo === data.torneo))
  return partidasBraquet
}

module.exports = { addPlayer, removePlayer, getPlayer, getUsersInTournamet, partidaFinalizada,saveMatches, getMatches, torneoFinalizado};