const axios = require ("axios");
const http = require ('../http-common');

const joinGame = (data) => {
  return axios
    .post(http.URL_PERTENECE_JOIN_GAME, data)
    .then(response => {
      return response.data;
    });
};

const repartirCartas = (data) => {
  return axios
    .put(http.URL_PERTENECE_REPARTIR + data.partida + '/' + data.jugador)
    .then(response => {
      return response.data;
    });
}

const findAllPlayers = (partida) => {
  return axios
    .get(http.URL_PERTENECE_FINDALL + partida)
    .then(response => {
      return response.data;
    });
}

module.exports = { joinGame, repartirCartas, findAllPlayers };