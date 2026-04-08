const { loadDB, saveDB, getUser } = require("./db");

const enAttente = new Map();

module.exports = {
  config: {
    name: "retirer",
    aliases: ["withdraw", "retrait"],
    version: "1.0",
    author: "Custom",
    countDown: 5,
    role: 0,
    shortDescription: "Retirer de la banque vers ton compte principal",
    category: "jeu",
    guide: { en: "{pn} <montant>" }
  },

  onStart: async function ({ args, message, event }) {
    const uid = event.senderID;
    const db = loadDB();
    const user = getUser(db, uid);

    if (!user.banque?.crée)
      return message.reply("❌ Tu n'as pas de compte bancaire.\nFais !banque créer d'abord.");

    const montant = parseInt(args[0]);
    if (!montant || montant <= 0)
      return message.reply("❌ Format : !retirer <montant>\nEx: !retirer 500");

    if (user.banque.solde < montant)
      return message.reply(
        `❌ Solde bancaire insuffisant !\n💰 Solde banque : ${user.banque.solde} FCFA`
      );

    enAttente.set(uid, { montant });

    const msg = await message.reply(
      `🏦 RETRAIT DE ${montant} FCFA\n\n` +
      `🔐 Entre ton code PIN à 5 chiffres pour confirmer.`
    );

    global.GoatBot.onReply.set(msg.messageID, {
      commandName: "retirer",
      uid
    });
  },

  onReply: async function ({ message, event, Reply }) {
    const uid = Reply.uid;
    const db = loadDB();
    const user = getUser(db, uid);
    const pin = event.body.trim();
    const session = enAttente.get(uid);

    if (!session) return;

    if (pin !== user.banque.pin) {
      enAttente.delete(uid);
      global.GoatBot.onReply.delete(event.messageReplyInfo.messageID);
      return message.reply("❌ Code PIN incorrect ! Retrait annulé.");
    }

    user.banque.solde -= session.montant;
    user.solde += session.montant;
    enAttente.delete(uid);
    saveDB(db);

    message.reply(
      `✅ RETRAIT RÉUSSI !\n\n` +
      `💵 +${session.montant} FCFA → Compte principal\n` +
      `🏦 Solde banque : ${user.banque.solde} FCFA\n` +
      `💰 Solde principal : ${user.solde} FCFA\n\n` +
      `🎮 Tu peux maintenant jouer avec !concombre`
    );

    global.GoatBot.onReply.delete(event.messageReplyInfo.messageID);
  }
};
