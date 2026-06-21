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

### 📈 Mes progrès

Un bouton **« Voir mes progrès »** (sur l'accueil) ouvre un tableau de bord qui
mémorise toutes les parties et **mesure la progression et les acquis** :

- **Résumé** : nombre de parties, taux de réussite moyen, étoiles gagnées,
  meilleure série.
- **Tendance** : compare les dernières parties aux précédentes (en progression,
  stable, ou à retravailler).
- **Graphe** des scores des 10 dernières parties.
- **Maîtrise par table** (de 2 à 10) avec un niveau calculé à partir du taux de
  réussite : **Acquis ✅**, **En cours 🟡**, **À revoir 🔴** ou *Pas encore testée*.
- **Calculs à revoir en priorité** + un bouton **« M'entraîner sur ces calculs 🎯 »**
  qui lance une partie ciblée sur les points faibles.
- Un lien discret **« Effacer mes progrès »** pour repartir de zéro.

Toutes ces données restent **sur l'appareil** (rien n'est envoyé sur Internet).

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
