# Bulles 🫧

Jeu pour tout-petits : des bulles montent, on les éclate du doigt. Pas de perdant, pas de fin de partie. En ligne sur **https://jeux.kassir.fr/jeux/bulles/**.

C'est un jeu **statique** : aucun serveur, aucun build. Les scores partent au classement de [gameboard](../gameboard) quand on quitte.

## Comment ça marche (rétro-ingénierie du code existant)

| Fichier | Rôle |
| --- | --- |
| `index.html` | page : barre (bouton Quitter + score), ciel, boîte « prénom » de fin |
| `bulles.js` | tout le jeu, un module ES, aucune dépendance |
| `bulles.css` | décor, bulles (animations CSS), boîte de fin |
| `icon.svg` | icône de l'onglet |
| `game.json` | manifeste : liste des fichiers à publier, classement des scores |

**Boucle de jeu** : pas de boucle d'image. `setInterval(spawn, 700)` ajoute une bulle (12 à l'écran au maximum). Chaque bulle est un `div` :
- l'élément extérieur `.bubble` **monte** (animation CSS `rise`, 5 à 9 s, dérive horizontale aléatoire) et se retire à la fin (`animationend`) ;
- la balle intérieure `.ball` **éclate** au toucher (animation `pop`), ce qui incrémente le score. Deux éléments pour que les deux animations ne se gênent pas.

**Son** : généré à la volée (oscillateur Web Audio, pas de fichier). Le contexte audio n'existe qu'après le premier toucher (règle des navigateurs). **Vibration** de 15 ms si disponible.

**Score** : un simple compteur en mémoire, remis à zéro quand on recharge la page.

## Scores : comment ils arrivent dans gameboard

Un jeu sans serveur ne peut pas garder une clé d'API secrète : elle serait visible dans le navigateur. Le classement de Bulles est donc déclaré **« open »** dans gameboard : le navigateur envoie lui-même, `POST /api/v1/public-scores`, accepté seulement depuis le site (en-tête `Origin`), avec une limite par adresse IP et des bornes plausibles (1 à 5000 bulles).

Quand :
1. **Bouton « ⬅ Quitter »** : si le score est supérieur à 0, une boîte demande le prénom (mémorisé sur l'appareil, 1 à 16 lettres ou chiffres), puis envoie le score et retourne au menu. « Quitter sans envoyer » et « Continuer à jouer » sont aussi proposés. Un échec réseau ne retient jamais l'enfant.
2. **Fermeture ou changement d'appli** : si un prénom est déjà mémorisé, le score part tout seul (`fetch` avec `keepalive`, qui survit à la fermeture de la page). Sans prénom, rien ne part : aucune donnée sur un enfant sans qu'il l'ait saisie.

gameboard ne garde que le **meilleur score de chaque prénom**.

> Limite : le score vient du navigateur, donc un petit malin peut envoyer un faux score (dans les bornes). Acceptable pour un classement familial ; le vrai remède serait un serveur de jeu avec une clé, ce que Bulles n'a pas.

## Build et déploiement

Le « build » n'est qu'une **copie** : `npm run build` copie les fichiers de `game.json` dans `dist/`. Le déploiement (stack WEB_STACK, `deploy/scripts/`) copie `dist/` dans `web/jeux.kassir.fr/games/bulles/public/`, dossier servi par le portail. Sans redémarrage de conteneur.

Il faut aussi une entrée dans le catalogue de gameboard (`games.json`) et un classement `bulles` dans `src/games.js` : c'est déjà fait.

## Essayer en local

```bash
npm start   # http://127.0.0.1:5190/jeux/bulles/
```

L'envoi du score échoue sans bruit (pas de gameboard) et « Quitter » ramène à `/`.

## À plusieurs (1.1.0)

Bouton 👥 : salon (prénom, chat), salles de 2 à 6 joueurs, manches de 60 s. Une couleur par joueur ; les bulles portent la couleur d'un joueur. Sa couleur : +1 ; celle d'un autre : −5. Le contour de l'écran prend sa couleur. Le serveur (hub de gameboard, `serveur01`) crée les bulles et compte les points ; le navigateur n'envoie que « j'éclate la bulle N ». Score envoyé au classement « Bulles à plusieurs » à la fin de manche, en pause, en quittant ou en fermant la page, s'il bat le record. Fichiers : `core.js` (commun), `multi.js` (salon et partie), `bulles.js` (seul).
