# Les révisions d'Ella 🦊

Un petit jeu de quiz **rigolo et motivant** pour réviser, fait sur mesure pour
Ella (7 ans). Premier thème : **les tables de multiplication de 2 à 10**.

## Comment jouer

1. Ouvre le fichier **`index.html`** dans un navigateur (double-clic, ou
   clic droit → « Ouvrir avec » → Chrome / Firefox / Safari / Edge).
2. C'est tout ! Aucune installation, ça marche aussi **hors connexion**.

Ça fonctionne aussi très bien sur **tablette ou téléphone** : les boutons sont
gros et faciles à toucher.

## Ce qu'il y a dans le jeu

- **Choix des tables** : une seule, plusieurs, ou le « 🎲 Mélange surprise ».
- **10 questions** par partie, à choix multiple (on touche la bonne réponse).
- **Filou le renard 🦊** réagit, encourage et fait la fête.
- **Étoiles, série de bonnes réponses (🔥) et records** sauvegardés sur l'appareil.
- **Confettis et petits sons** pour féliciter (le son se coupe avec 🔇 en haut).
- **Messages drôles et bienveillants**, même quand on se trompe.

## Ajouter un nouveau thème plus tard

Tout le contenu est dans **`themes.js`**. Pour ajouter un jeu, on ajoute un objet
dans la liste `THEMES`. Deux possibilités :

- **`type: "multiplication"`** → les questions sont générées automatiquement à
  partir des tables indiquées.
- **`type: "quiz"`** → on écrit soi-même les questions, par exemple :

  ```js
  {
    id: "lecture",
    titre: "Les sons et les mots",
    emoji: "📖",
    couleur: "#4ECDC4",
    phrase: "Lis bien, choisis le bon mot !",
    type: "quiz",
    questions: [
      { question: "Quel mot contient le son « ou » ?", choix: ["chat", "loup", "lit"], reponse: "loup" },
    ],
  }
  ```

Un exemple complet (commenté) est déjà prêt dans `themes.js`.

## Les fichiers

| Fichier        | Rôle                                            |
| -------------- | ----------------------------------------------- |
| `index.html`   | La page à ouvrir                                |
| `styles.css`   | Les couleurs et la mise en page                 |
| `app.js`       | Le moteur du jeu (questions, score, confettis)  |
| `themes.js`    | **Le contenu** — c'est ici qu'on ajoute des thèmes |
