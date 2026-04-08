const { loadDB, saveDB, getUser } = require("./db");

module.exports = {
  config: {
    name: "journalier",
    aliases: ["daily", "jour"],
    version: "1.0",
    author: "Custom",
    countDown: 5,
    role: 0,
    shortDescription: "Réclame tes 250 FCFA journaliers",
    category: "jeu",
    guide: { en: "{pn}" }
  },

  onStart: async function ({ message, event, api }) {
    const uid = event.senderID;
    const db = loadDB();
    const user = getUser(db, uid);
    const now = Date.now();
    const cooldown = 24 * 60 * 60 * 1000; // 24h

    if (user.lastDaily && now - user.lastDaily < cooldown) {
      const restant = Math.ceil((cooldown - (now - user.lastDaily)) / 3600000);
      return message.reply(
        `⏳ Tu as déjà réclamé ta récompense aujourd'hui !\n\n` +
        `🕐 Reviens dans ${restant}h.\n` +
        `💵 Solde actuel : ${user.solde} FCFA`
      );
    }

    // Récupère le nom du joueur
    try {
      const info = await api.getUserInfo(uid);
      user.nom = info[uid]?.name || user.nom || "Joueur";
    } catch {}

    user.solde += 250;
    user.lastDaily = now;
    saveDB(db);

    message.reply(
      `✅ RÉCOMPENSE JOURNALIÈRE\n\n` +
      `👤 ${user.nom}\n` +
      `💵 +250 FCFA reçus !\n` +
      `💰 Solde principal : ${user.solde} FCFA\n\n` +
      `📌 Reviens demain pour 250 FCFA de plus !`
    );
  }
};
