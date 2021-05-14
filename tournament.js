const players = [];

const addPlayer = ({ id, name, tournament, tipo, nTeams }) => {
  maxPlayers = (tipo + 1)*nTeams
  if (players.length < maxPlayers){
    name = name.trim().toLowerCase();
    tournament = tournament.trim().toLowerCase();

    const existingUser = players.find((user) => user.tournament === tournament && user.name === name);

    if(!name || !tournament) return { error: 'Username and tournament are required.' };
    if(existingUser) return { error: 'Ya participas en este torneo' };

    const player = { id, name, tournament, tipo, nTeams};

    players.push(player);

    return { player, nPlayers: players.length };
  }else{
    return { error: 'torneo completo' };
  }
}

const removePlayer = (id) => {
  const index = players.findIndex((player) => player.id === id);

  if(index !== -1) return players.splice(index, 1)[0];
}

const getPlayer = (id) => players.find((player) => player.id === id);

const getPlayerByName = (name) => players.find((player) => player.name === name);

const getUsersInTournamet = (tournament) => players.filter((player) => player.tournament === tournament);

module.exports = { addPlayer, removePlayer, getPlayer, getUsersInTournamet };