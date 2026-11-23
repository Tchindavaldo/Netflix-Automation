# Consignes projet - Netflix-Automation (back-end Qezaly)

Fichier versionné : ses règles valent sur tout PC et dans toute session Claude Code.

## R1 - Projet

- Qezaly : payer des abonnements (Netflix, Spotify...) par Mobile Money, via un agent IA.
- Ce dépôt = **back-end** : endpoints, données, paiements, notifications.
- But : le réduire aux endpoints. La partie IA (pilotage du navigateur) vit dans `ai_browser`.
- Dépôts liés : `ai_browser` (agent IA), `moobilPay-frontend-reactNative-expo` (app mobile),
  `mobilwallet-backend` (paiement Mobile Money).

## R2 - Style de réponse (OBLIGATOIRE)

- **Court et droit au but.** Listes à puces, pas de paragraphes.
- Répondre à ce qui est demandé, rien de plus. Pas de post-scriptum.
- Jamais de `.md` récapitulatif sans demande.
- Ne pas lancer de tests pour « vérifier » sans demande : l'utilisateur teste.

## R3 - Repères (lire en début de session)

- `server.js` : démarrage (port `PORT`, 5000 par défaut) ; `socket.js` : Socket.io.
- `src/app.js` : assemblage Express et montage des routes (`/api/...`), Swagger sur `/api-docs`.
- `src/routes/` -> `src/controllers/` -> `src/services/` (un domaine par fichier ou dossier).
- `src/services/email/` : Zoho Mail (IMAP), capte les codes et OTP pour l'agent IA.
- `src/config/bird.js` : Bird (WhatsApp, SMS, OTP). Voir `docs/BIRD_WHATSAPP_SETUP.md`.
- Données : Firebase / Firestore (`src/config/firebase.js`).
- Déploiement : Fly (`fly.toml`), workflows `.github/workflows/fly-on.yml` et `fly-off.yml`.
- Pas d'agent Explore pour « découvrir » le projet : lire `README.md` et ce fichier.

## R4 - Architecture (OBLIGATOIRE)

- Un fichier = une responsabilité. Viser ~400 lignes, **500 = plafond**.
- Nouvelle route : dans le fichier de son domaine (`routes/`, `controllers/`, `services/`).
- Noms explicites, pas de `utils`/`helpers` fourre-tout.
- Pas de fichier orphelin ou obsolète. Mettre à jour `README.md` si la structure change.

## R5 - Branches Git (OBLIGATOIRE)

- Jamais de travail direct sur `main`.
- `feature/<sujet>` : fonctionnalité ou changement moyen/important.
- `debug/<sujet>` : un bug, créé depuis la branche concernée.
- Fusion seulement après validation de l'utilisateur.

## R6 - Ne rien changer sans accord (OBLIGATOIRE)

- Corriger dans le fonctionnement existant, sans le remplacer par une autre solution.
- Plusieurs options possibles (déployer ou non, quelle branche...) : **demander d'abord**.
- Expliquer en une phrase (quoi + pourquoi) avant une action qui demande l'accord :
  écriture en base, déploiement, appel d'un service externe.

## R7 - Argent (OBLIGATOIRE)

- Aucun chiffre d'argent de mémoire : relire `config/netflix-pricing.json` et le code.
- Un chiffre non vérifié est annoncé comme tel.

## R8 - Secrets

- Aucun secret en dur dans le code ; tout passe par les variables d'environnement.
- `.env.dev` et `.env.prod` sont dans `.gitignore` : ne jamais y ajouter de clé commitée.

## R9 - Emojis

- Aucun emoji décoratif : ni dans le code, ni dans les logs, ni dans les commits.
