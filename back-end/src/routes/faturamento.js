const express = require("express");
const router = express.Router();
const auth = require("../middlewares/auth");
const { query } = require("../db");
const { addEqFilter, addDateRange } = require("../utils/sqlFilters");

router.get("/faturamento", async (req, res, next) => {
  try {
    const {
      cod_empresa,
      cod_cliente,
      cod_vendedor,
      cod_ma,
      cod_grp,

      mercado,
      cobranca,
      classificacao,
      tipo,
      uf,
      pais,

      nom_pess,

      data_ini,
      data_fim,
      data_tipo,

      page = "1",
      pageSize = "500",
    } = req.query;

    const p = Math.max(1, Number(page));
    const ps = Math.min(500, Math.max(1, Number(pageSize)));

    const where = [];
    const params = [];

    // --------- filtros por CÓDIGO ----------
    addEqFilter(where, params, "FAT.COD_EMPRESA", cod_empresa, Number);
    addEqFilter(where, params, "FAT.COD_CLIENTE", cod_cliente, Number);
    addEqFilter(where, params, "FAT.COD_VENDEDOR", cod_vendedor, Number);
    addEqFilter(where, params, "FAT.COD_MA", cod_ma, Number);
    addEqFilter(where, params, "FAT.COD_GRP", cod_grp, Number);

    // --------- filtros por TEXTO (exatos) ----------
    addEqFilter(where, params, "FAT.MERCADO", mercado, String);
    addEqFilter(where, params, "FAT.COBRANCA", cobranca, String);
    addEqFilter(where, params, "FAT.CLASSIFICACAO", classificacao, String);
    addEqFilter(where, params, "FAT.TIPO", tipo, String); // aqui é igualdade, não CONTAINING
    addEqFilter(where, params, "FAT.UF", uf, String);
    addEqFilter(where, params, "FAT.PAIS", pais, String);

    // se quiser pesquisar por nome, deixe apenas como busca (opcional)
    if (nom_pess) {
      where.push("FAT.NOM_PESS CONTAINING ?");
      params.push(String(nom_pess));
    }

    const campoData =
      String(data_tipo || "emissao").toLowerCase() === "saida"
        ? "FAT.DATA_SAIDA"
        : "FAT.DATA_EMISAO";

    addDateRange(where, params, campoData, data_ini, data_fim);

    const whereSql = where.length ? `WHERE ${where.join(" AND ")}` : "";

    const startRow = (p - 1) * ps + 1;
    const endRow = p * ps;

    const sql = `
     SELECT
        FAT.COD_DOC, FAT.COD_FAT, FAT.COD_ESTQ, FAT.ESP_DOC, FAT.COD_EMPRESA, FAT.COD_CLIENTE, FAT.COD_MD, FAT.COD_MA,
        FAT.MATERIAL, FAT.COD_GRP, FAT.COD_VENDEDOR, FAT.PEDIDO, FAT.INVOICE, FAT.DATA_EMISAO, FAT.DATA_SAIDA,
        FAT.MERCADO, FAT.COBRANCA, FAT.PARCELAMENTO, FAT.CLASSIFICACAO, FAT.TRANSPORTADOR,  IIF(FAT.VENDEDOR = '.' OR FAT.VENDEDOR IS NULL OR FAT.VENDEDOR = '' OR FAT.VENDEDOR = ' ', 'SEM VENDEDOR', FAT.VENDEDOR) AS VENDEDOR,
        FAT.ATRAVESSADOR, FAT.VEND_ADICIONAL, FAT.TIPO, FAT.LOTE, FAT.CAVALETE, FAT.QTDE_PC, FAT.BLOCO, FAT.UNIDADE,
        FAT.ESP_LIQ, FAT.QTDE, FAT.DESCONTO, FAT.CONTAINER, FAT.CAMBIO, FAT.TOTAL_DOCIT, FAT.TOTAL_ORIGINAL,
        FAT.NF, FAT.UF, FAT.MUN, FAT.PAIS, FAT.LIMITE, FAT.FONE1, FAT.FONE2, FAT.CEL, FAT.EMAIL, FAT.NOM_PESS,
        MA.MATERIAL AS NOM_MA, GRP.NOM_GRP 
      FROM BI_FATURAMENTO FAT
      LEFT JOIN BI_MATERIAL MA ON MA.COD_MA = FAT.COD_MA
      LEFT JOIN BI_GRUPO GRP ON GRP.COD_GRP = FAT.COD_GRP
      ${whereSql}
      ORDER BY ${campoData} DESC
      ROWS ${startRow} TO ${endRow}
    `;

    const rows = await query(sql, params);

    res.json({ page: p, pageSize: ps, rows });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
