const BACK_IP = "las10ultimas-backend.herokuapp.com";
const BACK_PORT = "443";
const BACK_PROTOCOL = "https";
const BASE_URL = BACK_PROTOCOL+"://"+BACK_IP+":"+BACK_PORT+"/api/";
module.exports = {
  AUTH_TOKEN: "auTh-Token-sTr726445",
  AUTH_SECRET: "C0ntra5enya-s3creta-t0ken",
  URL_AUTH_SIGNIN: BASE_URL + "auth/signin/",
  URL_AUTH_SIGNUP: BASE_URL + "auth/signup/",
  URL_AUTH_UPDATEUSER: BASE_URL + "auth/editprofile/",
  URL_PARTIDA_GETALL: BASE_URL + "partida/findAllGames/",
  URL_PERTENECE_JOIN_GAME: BASE_URL + "pertenece/",
  URL_USUARIO_FIND: BASE_URL + "usuario/findUser/",
  URL_PERTENECE_REPARTIR: BASE_URL + "pertenece/repartir/",
  URL_PERTENECE_FINDALL: BASE_URL + "pertenece/findAllBelong/",
  URL_PERTENECE_FIND: BASE_URL + "pertenece/findBelong/",
  URL_PARTIDA_FIND: BASE_URL + "partida/findGame/",
  URL_PERTENECE_ROBAR: BASE_URL + "pertenece/robar/",
  URL_JUGADA_CREAR: BASE_URL + "jugada/",
  URL_JUGADA_GET_ORDEN: BASE_URL + "jugada/getRoundOrder/",
  URL_PARTIDA_CANTAR: BASE_URL + "partida/cantar/",
  URL_PARTIDA_CAMBIAR7: BASE_URL + "partida/cambiar7/",
  URL_JUGADA_RECUENTO: BASE_URL + "jugada/getRoundWinner/",
  URL_PARTIDA_VUELTAS: BASE_URL + "partida/partidaVueltas/",
  URL_CARTA_DISPONIBLE_DELETE: BASE_URL + "cartaDisponible/dropACard/",
  URL_TORNEO_EMPAREJAR: BASE_URL + "torneo/matchRound/",
  URL_PARTIDA_RECUENTO: BASE_URL + "partida/recuento/",
  URL_PARTIDA_UPDATE: BASE_URL + "partida/updateGame/",
  URL_USUARIO_SUMAR: BASE_URL + "usuario/ganarPartida/",
  URL_USUARIO_RESTAR: BASE_URL + "usuario/perderPartida/",
  URL_PARTICIPANTES_TORNEO_CREATE : BASE_URL + "participantes_torneo/",
  URL_PARTICIPANTES_TORNEO_DELETE: BASE_URL + "participantes_torneo/dropTournamentParticipants/",
};