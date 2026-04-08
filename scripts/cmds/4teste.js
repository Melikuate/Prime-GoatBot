const { loadDB, saveDB, getUser } = require("./db");

const enAttente = new Map();

module.exports = {
  config: {
    name: "transfert",
    aliases: ["envoyer", "send"],
    version: "1.0",
    author: "Custom",
    countDown: 10,
    role: 0,
    shortDescription: "Transférer de l'argent vers un autre joueur",
    category: "jeu",
    guide: { en: "{pn} <uid> <montant>" }
  },

  onStart: async function ({ args, message, event }) {
    const uid = event.senderID;
    const db = loadDB();
    const user = getUser(db, uid);

    if (!user.banque?.crée)
      return message.reply("❌ Tu dois avoir un compte bancaire pour transférer.\nFais !banque créer d'abord.");

    const cibleUID = args[0];
    const montant = parseInt(args[1]);

    if (!cibleUID || !montant || montant <= 0)
      return message.reply(
        "❌ Format : !transfert <uid> <montant>\n" +
        "Ex: !transfert 100012345678 500"
      );

    if (cibleUID === uid)
      return message.reply("❌ Tu ne peux pas te transférer à toi-même !");

    if (user.banque.solde < montant)
      return message.reply(
        `❌ Solde bancaire insuffisant !\n💰 Solde banque : ${user.banque.solde} FCFA`
      );

    const cible = getUser(db, cibleUID);
    if (!cible.banque?.crée)
      return message.reply("❌ Ce joueur n'a pas de compte bancaire.");

    enAttente.set(uid, { cibleUID, montant, nomCible: cible.banque.nom });

    const msg = await message.reply(
      `💸 TRANSFERT BANCAIRE\n\n` +
      `📤 Vers : ${cible.banque.nom}\n` +
      `💰 Montant : ${montant} FCFA\n\n` +
      `🔐 Entre ton code PIN pour confirmer.`
    );

    global.GoatBot.onReply.set(msg.messageID, {
      commandName: "transfert",
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
      return message.reply("❌ Code PIN incorrect ! Transfert annulé.");
    }

    const cible = getUser(db, session.cibleUID);

    user.banque.solde -= session.montant;
    cible.banque.solde += session.montant;

    enAttente.delete(uid);
    saveDB(db);

    message.reply(
      `✅ TRANSFERT RÉUSSI !\n\n` +
      `📤 Envoyé à : ${session.nomCible}\n` +
      `💸 Montant : ${session.montant} FCFA\n` +
      `🏦 Ton solde banque : ${user.banque.solde} FCFA`
    );

    global.GoatBot.onReply.delete(event.messageReplyInfo.messageID);
  }
};
