const axios = require ("axios");
const http = require ('../http-common');

const createTorneo = (data) => {
  return axios
    .post(http.URL_TORNEO_CREATE, data)
    .then(respone=> {
      return respone.data;
    });
}

const emparejamientos = (data) => {
  return axios
    .put(http.URL_TORNEO_CREATE + data.torneo + '/' + data.ronda)
    .then(respone=> {
      return respone.data;
    });  
}

module.exports = {createTorneo, emparejamientos};