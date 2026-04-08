const { loadDB, saveDB, getUser } = require("./db");

const enAttente = new Map(); // Pour stocker les étapes d'inscription

module.exports = {
  config: {
    name: "banque",
    aliases: ["bank"],
    version: "1.0",
    author: "Custom",
    countDown: 5,
    role: 0,
    shortDescription: "Gérer ton compte bancaire",
    category: "jeu",
    guide: { en: "{pn} créer | {pn} déposer <montant> | {pn} solde" }
  },

  onStart: async function ({ args, message, event }) {
    const uid = event.senderID;
    const db = loadDB();
    const user = getUser(db, uid);
    const action = (args[0] || "").toLowerCase();

    // ─── CRÉER COMPTE ───────────────────────────────────────────────
    if (action === "créer" || action === "creer" || action === "ouvrir") {
      if (user.banque?.crée)
        return message.reply(
          `⚠️ Tu as déjà un compte bancaire !\n\n` +
          `🏦 Titulaire : ${user.banque.nom}\n` +
          `💰 Solde banque : ${user.banque.solde} FCFA`
        );

      enAttente.set(uid, { etape: "nom" });

      const msg = await message.reply(
        `🏦 OUVERTURE DE COMPTE BANCAIRE\n\n` +
        `Étape 1/2 : Entre ton nom complet pour le compte.`
      );
      global.GoatBot.onReply.set(msg.messageID, {
        commandName: "banque",
        uid,
        action: "créer"
      });
      return;
    }

    // ─── DÉPOSER ────────────────────────────────────────────────────
    if (action === "déposer" || action === "deposer" || action === "depot") {
      if (!user.banque?.crée)
        return message.reply("❌ Tu n'as pas de compte bancaire.\nFais !banque créer d'abord.");

      const montant = parseInt(args[1]);
      if (!montant || montant <= 0)
        return message.reply("❌ Format : !banque déposer <montant>");
      if (user.solde < montant)
        return message.reply(`❌ Solde insuffisant ! Solde principal : ${user.solde} FCFA`);

      enAttente.set(uid, { etape: "pin_depot", montant });
      const msg = await message.reply(
        `🔐 Entre ton code PIN à 5 chiffres pour confirmer le dépôt de ${montant} FCFA.`
      );
      global.GoatBot.onReply.set(msg.messageID, {
        commandName: "banque",
        uid,
        action: "depot"
      });
      return;
    }

    // ─── SOLDE ──────────────────────────────────────────────────────
    if (action === "solde" || action === "info") {
      if (!user.banque?.crée)
        return message.reply("❌ Tu n'as pas de compte bancaire.\nFais !banque créer d'abord.");

      return message.reply(
        `🏦 COMPTE BANCAIRE\n\n` +
        `👤 Titulaire : ${user.banque.nom}\n` +
        `💰 Solde banque : ${user.banque.solde} FCFA\n` +
        `💵 Solde principal : ${user.solde} FCFA`
      );
    }

    message.reply(
      `🏦 BANQUE — Commandes :\n\n` +
      `• !banque créer — Ouvrir un compte\n` +
      `• !banque déposer <montant> — Déposer de l'argent\n` +
      `• !banque solde — Voir ton solde\n` +
      `• !retirer <montant> — Retirer vers compte principal`
    );
  },

  onReply: async function ({ message, event, Reply }) {
    const uid = Reply.uid;
    const db = loadDB();
    const user = getUser(db, uid);
    const reponse = event.body.trim();
    const session = enAttente.get(uid);

    // ─── CRÉATION : étape nom ────────────────────────────────────────
    if (Reply.action === "créer" && session?.etape === "nom") {
      enAttente.set(uid, { etape: "pin", nom: reponse });
      const msg = await message.reply(
        `✅ Nom enregistré : "${reponse}"\n\n` +
        `Étape 2/2 : Choisis un code PIN à 5 chiffres (ex: 12345)`
      );
      global.GoatBot.onReply.set(msg.messageID, {
        commandName: "banque",
        uid,
        action: "créer"
      });
      global.GoatBot.onReply.delete(event.messageReplyInfo.messageID);
      return;
    }

    // ─── CRÉATION : étape pin ────────────────────────────────────────
    if (Reply.action === "créer" && session?.etape === "pin") {
      if (!/^\d{5}$/.test(reponse))
        return message.reply("❌ Le PIN doit être exactement 5 chiffres. Réessaie.");

      user.banque = { crée: true, nom: session.nom, pin: reponse, solde: 0 };
      enAttente.delete(uid);
      saveDB(db);

      message.reply(
        `🎉 COMPTE CRÉÉ AVEC SUCCÈS !\n\n` +
        `🏦 Titulaire : ${session.nom}\n` +
        `🔐 PIN : *****\n` +
        `💰 Solde initial : 0 FCFA\n\n` +
        `Utilise !banque déposer <montant> pour alimenter ton compte.`
      );
      global.GoatBot.onReply.delete(event.messageReplyInfo.messageID);
      return;
    }

    // ─── DÉPÔT : confirmation PIN ────────────────────────────────────
    if (Reply.action === "depot") {
      if (reponse !== user.banque.pin)
        return message.reply("❌ Code PIN incorrect ! Dépôt annulé.");

      const montant = session.montant;
      user.solde -= montant;
      user.banque.solde += montant;
      enAttente.delete(uid);
      saveDB(db);

      message.reply(
        `✅ DÉPÔT RÉUSSI !\n\n` +
        `💵 +${montant} FCFA → Banque\n` +
        `🏦 Solde banque : ${user.banque.solde} FCFA\n` +
        `💰 Solde principal : ${user.solde} FCFA`
      );
      global.GoatBot.onReply.delete(event.messageReplyInfo.messageID);
    }
  }
};
