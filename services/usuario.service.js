const axios = require ("axios");
const http = require ('../http-common');

class UsuarioService {
  findUser(username) {
    return axios
      .get(http.URL_USUARIO_FIND + username)
      .then(respone=> {
        return respone.data;
      });
  }
}
