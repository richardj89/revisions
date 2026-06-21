/*
 * themes.js — Le contenu des révisions d'Ella.
 *
 * 👉 POUR AJOUTER UN THÈME PLUS TARD : ajoute simplement un objet dans le
 *    tableau THEMES ci-dessous. Deux sortes de thèmes sont possibles :
 *
 *    1) type: "multiplication"  → les questions sont fabriquées toutes seules
 *       à partir des tables choisies (rien d'autre à écrire).
 *
 *    2) type: "quiz"            → tu écris toi-même une liste de questions.
 *       Chaque question = { question, choix: [...], reponse: "la bonne" }
 *       Exemple tout en bas du fichier (commenté).
 *
 * Chaque thème a aussi : id, titre, emoji, couleur, et une petite phrase.
 */

const THEMES = [
  {
    id: "tables",
    titre: "Les tables de multiplication",
    emoji: "✖️",
    couleur: "#7C5CFC",
    phrase: "De 2 à 10 — deviens la championne du calcul !",
    type: "multiplication",
    tables: [2, 3, 4, 5, 6, 7, 8, 9, 10],
  },

  // ─────────────────────────────────────────────────────────────────────
  // Les prochains thèmes viendront ici. Exemple prêt à l'emploi (à dé-commenter) :
  //
  // {
  //   id: "lecture",
  //   titre: "Les sons et les mots",
  //   emoji: "📖",
  //   couleur: "#4ECDC4",
  //   phrase: "Lis bien, choisis le bon mot !",
  //   type: "quiz",
  //   questions: [
  //     { question: "Quel mot contient le son « ou » ?", choix: ["chat", "loup", "lit"], reponse: "loup" },
  //     { question: "Combien de syllabes dans « ba-teau » ?", choix: ["1", "2", "3"], reponse: "2" },
  //   ],
  // },
  // ─────────────────────────────────────────────────────────────────────
];
