const axios = require ("axios");
const http = require ('../http-common');

class PerteneceService {
  joinGame(data) {
    return axios
      .post(http.URL_PERTENECE_JOIN_GAME, data)
      .then(response => {
        return response.data;
      });
  }

  repartirCartas(data){
    return axios
      .put(http.URL_PERTENECE_REPARTIR + data.partida + '/' + data.jugador)
      .then(response => {
        return response.data;
      });
  }
}

export default new PerteneceService();