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
    .get(http.URL_PARTIDA_FIND + data.nronda + '/' + data.partida)
    .then(response => {
      //console.log(response);
      return response.data;
    })
    .catch(err =>{
      //console.log(err);
    });
};
module.exports = { jugarCarta, getRoundOrder };