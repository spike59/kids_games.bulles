# passer sur swordfish

**Statut** : à faire · créé le 2026-11-10 · chantier `multijoueur-normalise` (`concept/chantiers/multijoueur-normalise/plan.md` du principal)

**En une phrase** : Faire tourner le jeu sur swordfish (module de jeu) et retirer son ancien réseau.

## Détails
Aujourd'hui : module du hub de gameboard (`/api/v1/hub`, serveur01) ; suit le nouveau standard.

## Avancement le 2026-11-10
Le client `multi.js` se connecte maintenant à `/jeux/swordfish/hub` et les règles du jeu sont le module `api/hub/bulles.js` de swordfish (inchangé). Déployé le 2026-11-10. : le déploiement en production a été refusé par le système ; reste à faire : `game_manager` redeploy de `swordfish`, `gameboard`, puis `bulles`.

**Origine** : décision de l'utilisateur du 2026-11-10 (les trois prochaines étapes principales : serveur de dev, mise à jour des cards, multijoueur normalisé).
