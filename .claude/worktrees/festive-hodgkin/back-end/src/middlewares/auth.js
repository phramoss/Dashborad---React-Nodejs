const jwt = require("jsonwebtoken");

module.exports = function auth(req, res, next) {
  const header = req.headers.authorization || "";
  const token = header.startsWith("Bearer ") ? header.slice(7) : null;

  if (!token) {
    return res.status(401).json({ error: "TOKEN_REQUIRED" });
  }

  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET || "troque_esse_segredo");
    req.user = payload;
    return next();
  } catch {
    return res.status(401).json({ error: "TOKEN_INVALID" });
  }
};