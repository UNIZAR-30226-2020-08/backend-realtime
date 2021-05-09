const axios = require ("axios");
const http = require ('../http-common');

const deleteCard = (data) => {
  //console.log(data)
  return axios
    .delete(http.URL_CARTA_DISPONIBLE_DELETE + data.partida + '/' + data.carta)
    .then(response => {
      return response.data;
    })
    .catch(err =>{
      console.log(err);
    });
};

module.exports = { deleteCard };