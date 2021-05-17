const axios = require ("axios");
const http = require ('../http-common');

const jugarCarta = (data) => {
  return axios
    .post(http.URL_JUGADA_CREAR, data)
    .then(response => {
      return response.data;
    })
    .catch(err =>{
      console.log(err)
    });
};

const getRoundOrder = (data) => {
  //console.log(data)
  return axios
    .get(http.URL_JUGADA_GET_ORDEN + data.nronda + '/' + data.partida)
    .then(response => {
      //console.log(response);
      return response.data;
    })
    .catch(err =>{
      //console.log(err);
    });
};

const getRoundWinner = (data) => {
  return axios
    .put(http.URL_JUGADA_RECUENTO + data.nronda + '/' + data.partida)
    .then(response => {
      return response.data;
    })
    .catch(err =>{
      console.log(err)
    });
};

const findLastRound = (data) => {
  return axios
    .put(http.URL_JUGADA_ULTIMA_RONDA  + data.partida)
    .then(response => {
      return response.data;
    })
    .catch(err =>{
      console.log(err)
    });
};

module.exports = { jugarCarta, getRoundWinner, getRoundOrder, findLastRound};
