const express = require("express");
const router = express.Router();
const { query } = require("../db");
const md5 = require("md5");
const jwt = require("jsonwebtoken");

router.get("/", async (req, res) => {
  try {
    const sql = `
      SELECT
        LOGIN_USU,
        SENHA_USU
      FROM PESSOAS
      WHERE USUARIO_PESS = 'S'
    `;

    const rows = await query(sql);
    res.json(rows);
  } catch (error) {
    console.error("Erro ao buscar usuários:", error);
    res.status(500).json({
      error: "INTERNAL_ERROR",
      message: error.message,
    });
  }
});

router.post("/login", async (req, res) => {
  try {
    const { usuario, senha } = req.body || {};

    if (!usuario || !senha) {
      return res.status(400).json({ error: "Informe usuário e senha." });
    }

    const sql = `
      SELECT LOGIN_USU, SENHA_USU
      FROM PESSOAS
      WHERE USUARIO_PESS = 'S'
        AND LOGIN_USU = ?
    `;

    const rows = await query(sql, [String(usuario).trim()]);

    if (!rows?.length) {
      return res.status(401).json({ error: "Usuário ou senha inválidos." });
    }

    const user = rows[0];
    const senhaHash = md5(String(senha));

    const senhaBanco = String(user.SENHA_USU ?? user.senha_usu ?? "");

    if (senhaHash !== senhaBanco) {
      return res.status(401).json({ error: "Usuário ou senha inválidos." });
    }

    const token = jwt.sign(
      { usuario: user.LOGIN_USU ?? user.login_usu },
      process.env.JWT_SECRET || "troque_esse_segredo",
      { expiresIn: "8h" }
    );

    return res.json({
      token,
      user: { usuario: user.LOGIN_USU ?? user.login_usu },
    });
  } catch (error) {
    console.error("Erro login:", error);
    return res.status(500).json({
      error: "INTERNAL_ERROR",
      message: error.message,
    });
  }
});

module.exports = router;