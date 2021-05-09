const axios = require ("axios");
const http = require ('../http-common');

const getTriunfo = (partida) => {
  return axios
    .get(http.URL_PARTIDA_FIND + partida)
    .then(response => {
      return response.data;
    })
    .catch(err =>{
      //console.log(err);
    });
};

const cambiar7 = (data) => {
  return axios
    .put(http.URL_PARTIDA_CAMBIAR7 + data.nombre + '/' + data.jugador)
    .then(response => {
      return response.data;
    });
}

const cantar = (data) => {
  return axios
    .put(http.URL_PARTIDA_CANTAR + data.nombre + '/' + data.jugador)
    .then(response => {
      return response.data;
    });
}

const partidaVueltas = (data) => {
  return axios
    .put(http.URL_PARTIDA_VUELTAS + data.partida)
    .then(response => {
      return response.data;
    });
};

module.exports = { getTriunfo, cambiar7, cantar, partidaVueltas };