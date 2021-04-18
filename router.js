const express = require("express");
const router = express.Router();

router.get("/", (req, res) => {
  res.send({ response: "Server is up and running on http://localhost:4000" }).status(200);
});

module.exports = router;