const { loadDB, saveDB, getUser } = require("./db");

const sessions = new Map();

// Chiffres en emoji
const chiffres = ["1️⃣", "2️⃣", "3️⃣"];

function afficherSeaux(caches) {
  // caches = [true, false, true] → seau caché ou vide révélé
  const ligne1 = caches.map(c => c ? "🪣" : "🟩").join("");
  const ligne2 = chiffres.join("");
  return `${ligne1}\n${ligne2}`;
}

module.exports = {
  config: {
    name: "concombre",
    aliases: ["game", "jeu", "jouer"],
    version: "1.0",
    author: "Custom",
    countDown: 5,
    role: 0,
    shortDescription: "Jeu du concombre caché — Gagne gros !",
    category: "jeu",
    guide: { en: "{pn} <mise> [1|2|3]" }
  },

  onStart: async function ({ args, message, event }) {
    const uid = event.senderID;
    const db = loadDB();
    const user = getUser(db, uid);

    // Affiche le menu si pas d'args
    if (!args[0]) {
      return message.reply(
        `🥒 JEU DU CONCOMBRE\n\n` +
        `Un concombre est caché sous l'un des 3 seaux.\n` +
        `Trouve-le et multiplie ta mise !\n\n` +
        `🪣🪣🪣\n${chiffres.join("")}\n\n` +
        `━━━ MODES ━━━\n` +
        `🔴 MODE DIFFICILE — !concombre <mise> difficile\n` +
        `   3 seaux cachés → Tu choisis 1 → ×2 si gagné\n` +
        `   Chances : 40%\n\n` +
        `🟡 MODE NORMAL — !concombre <mise> normal\n` +
        `   1 seau vide révélé → Tu choisis parmi 2 → ×1.5 si gagné\n` +
        `   Chances : 45%\n\n` +
        `🟢 MODE FACILE — !concombre <mise> facile\n` +
        `   2 seaux vides révélés → 1 seau reste → ×1 si gagné\n` +
        `   Chances : 55%\n\n` +
        `💰 Ton solde : ${user.solde} FCFA`
      );
    }

    const mise = parseInt(args[0]);
    const mode = (args[1] || "difficile").toLowerCase();

    if (!mise || mise <= 0)
      return message.reply("❌ Mise invalide.\nEx: !concombre 100 difficile");

    if (!["difficile", "normal", "facile"].includes(mode))
      return message.reply("❌ Mode invalide. Choisis : difficile | normal | facile");

    if (user.solde < mise)
      return message.reply(
        `❌ Solde insuffisant !\n💰 Solde : ${user.solde} FCFA\n\n` +
        `Utilise !retirer pour récupérer de l'argent de ta banque.`
      );

    if (mise < 50)
      return message.reply("❌ Mise minimum : 50 FCFA");

    // Placement aléatoire du concombre (1, 2 ou 3)
    const position = Math.floor(Math.random() * 3); // 0, 1 ou 2

    // Révélation selon le mode
    let seauxCaches = [true, true, true];
    let revelesVides = [];

    if (mode === "normal") {
      // Révèle 1 seau vide (pas celui du concombre)
      const videsDispos = [0, 1, 2].filter(i => i !== position);
      const aReveler = videsDispos[Math.floor(Math.random() * videsDispos.length)];
      seauxCaches[aReveler] = false;
      revelesVides = [aReveler];
    }

    if (mode === "facile") {
      // Révèle 2 seaux vides
      const videsDispos = [0, 1, 2].filter(i => i !== position);
      seauxCaches[videsDispos[0]] = false;
      seauxCaches[videsDispos[1]] = false;
      revelesVides = videsDispos;
    }

    const multiplicateur = mode === "difficile" ? 2 : mode === "normal" ? 1.5 : 1;
    const chanceBase = mode === "difficile" ? 0.40 : mode === "normal" ? 0.45 : 0.55;

    // Stocke la session
    sessions.set(uid, { mise, mode, position, multiplicateur, chanceBase, seauxCaches });

    const dispoCaches = seauxCaches
      .map((c, i) => c ? chiffres[i] : null)
      .filter(Boolean)
      .join(" ");

    const msg = await message.reply(
      `🥒 CONCOMBRE CACHÉ — Mode ${mode.toUpperCase()}\n\n` +
      `${afficherSeaux(seauxCaches)}\n` +
      (revelesVides.length > 0
        ? `\n🟩 = Seau vide révélé\n`
        : "\n") +
      `━━━━━━━━━━━━\n` +
      `💰 Mise : ${mise} FCFA\n` +
      `✖️ Multiplicateur : ×${multiplicateur}\n` +
      `🍀 Chances : ${Math.round(chanceBase * 100)}%\n\n` +
      `👆 Réponds avec le numéro de ton seau (${dispoCaches})`
    );

    global.GoatBot.onReply.set(msg.messageID, {
      commandName: "concombre",
      uid
    });
  },

  onReply: async function ({ message, event, Reply }) {
    const uid = Reply.uid;
    const session = sessions.get(uid);
    if (!session) return;

    const db = loadDB();
    const user = getUser(db, uid);

    const choix = parseInt(event.body.trim()) - 1; // 0-index

    if (isNaN(choix) || choix < 0 || choix > 2) {
      return message.reply("❌ Réponds avec 1, 2 ou 3 !");
    }

    if (!session.seauxCaches[choix]) {
      return message.reply("❌ Ce seau est déjà révélé comme vide ! Choisis un autre.");
    }

    sessions.delete(uid);
    global.GoatBot.onReply.delete(event.messageReplyInfo.messageID);

    // Détermine si le joueur gagne
    // 40/45/55% de chance de gagner selon le mode
    const aGagné = Math.random() < session.chanceBase;
    const concombrePosition = session.position;

    // Révèle tous les seaux
    const revelation = ["🪣", "🪣", "🪣"];
    revelation[concombrePosition] = "🥒";

    const ligneRevelation = revelation.join("") + "\n" + chiffres.join("");
    const choixEmoji = chiffres[choix];

    if (aGagné) {
      const gain = Math.floor(session.mise * session.multiplicateur);
      user.solde += gain;
      saveDB(db);

      message.reply(
        `🎉 GAGNÉ !\n\n` +
        `${ligneRevelation}\n\n` +
        `Tu as choisi ${choixEmoji} — Le concombre était là ! 🥒\n\n` +
        `💰 Mise : ${session.mise} FCFA\n` +
        `✖️ ${session.multiplicateur} = +${gain} FCFA\n` +
        `💵 Nouveau solde : ${user.solde} FCFA`
      );
    } else {
      user.solde -= session.mise;
      saveDB(db);

      message.reply(
        `😢 PERDU !\n\n` +
        `${ligneRevelation}\n\n` +
        `Tu as choisi ${choixEmoji} — Le concombre était sous le ${chiffres[concombrePosition]} !\n\n` +
        `💸 Perdu : -${session.mise} FCFA\n` +
        `💵 Solde restant : ${user.solde} FCFA\n\n` +
        `🔄 Retente ta chance avec !concombre`
      );
    }
  }
};
