# classer les modes et serveur

**Statut** : fait le 2026-11-10 (analyse par lecture du code ; à confirmer en jouant) · créé le 2026-11-10 · chantier `mise-a-jour-des-cards` (`concept/chantiers/mise-a-jour-des-cards/plan.md` du principal)

**En une phrase** : Analyser le jeu puis classer ses modes de jeu (`solo`, `local-split`, `p2p`, `online-server`, `lan-host`, `controller-ui`), son nombre de joueurs et ses contrôles dans son manifeste `game.json` ; y noter le serveur `swordfish:x.y.z` quand il tourne dessus.

## Détails
Point de départ : `concept/multijoueur/jeux-et-modes.md` du principal (relevé du 2026-11-09, cases ❓ à lever en jouant). Le manifeste est une énumération : il dit ce qui est **implémenté**, rien de plus (`apps/game_server/concept/ideas/modes-multijoueur.md`). Après l'analyse, mettre à jour la table du principal (`kassir_devops-036`).

## Fait le 2026-11-10
Manifeste `game.json` écrit (`modes`, `players`, `controllers`, `needsOnline`, `modeTags`, `server`). Source : lecture du code et de la doc, sans lancer le jeu. Le champ `server` dit où tourne le réseau **aujourd'hui** et la cible ; il devient `swordfish:x.y.z` quand le jeu est migré (chantier `multijoueur-normalise`).

**Origine** : décision de l'utilisateur du 2026-11-10 (les trois prochaines étapes principales : serveur de dev, mise à jour des cards, multijoueur normalisé).
