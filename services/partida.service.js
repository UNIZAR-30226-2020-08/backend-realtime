const axios = require ("axios");
const http = require ('../http-common');

const getTriunfo = (partida) => {
  //console.log(data)
  return axios
    .get(http.URL_PARTIDA_FIND + partida)
    .then(response => {
      //console.log(response);
      return response.data;
    })
    .catch(err =>{
      //console.log(err);
    })
    ;

};

module.exports = { getTriunfo };