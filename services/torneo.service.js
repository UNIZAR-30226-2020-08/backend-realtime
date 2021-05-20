const axios = require ("axios");
const http = require ('../http-common');

const emparejamientos = (data) => {
  return axios
    .put(http.URL_TORNEO_EMPAREJAR + data.torneo + '/' + data.fase)
    .then(respone=> {
      return respone.data;
    });  
}

const updateCuadroTorneo = (data) => {
  return axios
    .put(http.URL_CUADRO_TORNEO_UPDATE + data.torneo + '/' + data.partida, data)
    .then(respone=> {
      return respone.data;
    });  
}

module.exports = {emparejamientos, updateCuadroTorneo};