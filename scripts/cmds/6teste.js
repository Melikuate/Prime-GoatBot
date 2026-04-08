// db.js — Base de données partagée
const fs = require("fs");
const path = require("path");
const dbPath = path.join(__dirname, "gameDB.json");

const ADMIN_UID = "61582944640666";

function loadDB() {
  if (!fs.existsSync(dbPath)) {
    const init = {};
    init[ADMIN_UID] = {
      nom: "Administration",
      solde: 999999999999999,
      banque: { crée: true, nom: "Administration", pin: "00000", solde: 999999999999999999 }
    };
    fs.writeFileSync(dbPath, JSON.stringify(init, null, 2));
  }
  return JSON.parse(fs.readFileSync(dbPath, "utf8"));
}

function saveDB(db) {
  fs.writeFileSync(dbPath, JSON.stringify(db, null, 2));
}

function getUser(db, uid) {
  if (!db[uid]) {
    db[uid] = { nom: "Joueur", solde: 0, banque: null };
  }
  return db[uid];
}

module.exports = { loadDB, saveDB, getUser, ADMIN_UID };
