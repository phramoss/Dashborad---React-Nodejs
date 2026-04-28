const express = require("express");
const router = express.Router();

// rota simples só pra não quebrar
router.get("/clientes", (req, res) => {
  res.json({ ok: true, msg: "rota clientes funcionando" });
});

module.exports = router;
