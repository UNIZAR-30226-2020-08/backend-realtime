const axios = require ("axios");
const http = require ('../http-common');

const emparejamientos = (data) => {
  return axios
    .put(http.URL_TORNEO_EMPAREJAR + data.torneo + '/' + data.ronda)
    .then(respone=> {
      return respone.data;
    });  
}

module.exports = {emparejamientos};