const Firebird = require("node-firebird");
require("dotenv").config();

const fbOptions = {
  host: process.env.FB_HOST,
  port: Number(process.env.FB_PORT || 3050),
  database: process.env.FB_DATABASE,
  user: process.env.FB_USER,
  password: process.env.FB_PASSWORD,
  role: null,
  pageSize: 4096,
  lowercase_keys: true,
  charset: "UTF8",
};

function query(sql, params = []) {
  return new Promise((resolve, reject) => {
    Firebird.attach(fbOptions, (err, db) => {
      if (err) return reject(err);

      db.query(sql, params, (err2, result) => {
        db.detach(); // fecha conexão
        if (err2) return reject(err2);
        resolve(result);
      });
    });
  });
}

console.log("FB_HOST:", fbOptions.host);
console.log("FB_PORT:", fbOptions.port);
console.log("FB_DATABASE:", fbOptions.database);
console.log("FB_USER:", fbOptions.user);
console.log("FB_PASSWORD:", fbOptions.password ? "****" : "(not set)");

module.exports = { query };
