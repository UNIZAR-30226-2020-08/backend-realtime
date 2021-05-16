const axios = require ("axios");
const http = require ('../http-common');

const unirseTorneo = (data) => {
  return axios
    .post(http.URL_PARTICIPANTES_TORNEO_CREATE, data)
    .then(respone=> {
      return respone.data;
    });
}

const salirTorneo = (data) => {
  return axios
    .delete(http.URL_PARTICIPANTES_TORNEO_DELETE + data.torneo + '/' + data.jugador)
    .then(respone=> {
      return respone.data;
    });
}


module.exports = {unirseTorneo,salirTorneo};