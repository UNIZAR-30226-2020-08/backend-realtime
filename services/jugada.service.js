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

}

const getRoundWinner = (data) => {
  return axios
    .put(http.URL_JUGADA_RECUENTO + data.nronda + '/' + data.partida)
    .then(response => {
      return response.data;
    })
    .catch(err =>{
      console.log(err)
    });

}

module.exports = { jugarCarta, getRoundWinner };