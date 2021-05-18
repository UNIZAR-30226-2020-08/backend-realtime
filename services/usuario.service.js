const axios = require ("axios");
const http = require ('../http-common');

const findUser = (username) => {
  return axios
    .get(http.URL_USUARIO_FIND + username)
    .then(respone=> {
      return respone.data;
    });
}

const sumarCopas = (usuario) => {
  return axios
    .put(http.URL_USUARIO_SUMAR + usuario)
    .then(respone=> {
      return respone.data;
    });
}

const restarCopas = (usuario) => {
  return axios
    .put(http.URL_USUARIO_RESTAR + usuario)
    .then(respone=> {
      return respone.data;
    });
}

module.exports = {findUser,sumarCopas,restarCopas};