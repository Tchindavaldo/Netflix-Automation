# Configuration Bird — WhatsApp + OTP

Guide pas-à-pas pour MoobilPay.

> ⚠️ **Ne suis pas `docs.bird.com`.** Ce site documente l'**ancienne** plateforme
> Bird (`api.bird.com/workspaces/...`, authentification `AccessKey`). Les comptes
> créés aujourd'hui sont sur la **nouvelle** plateforme
> (`{region}.platform.bird.com/v1/...`, authentification `Bearer`).
> Tout ce document décrit la nouvelle. En cas de doute, la source de vérité est
> le bouton **Copy → cURL** des pages d'onboarding de ton dashboard.

---

## Ce qu'il faut configurer : une seule variable

```env
BIRD_API_KEY=bk_us1_xxxxxxxxxxxxxxxxxxxxxxxxxxx
DEFAULT_COUNTRY_CODE=237
```

C'est tout. Pas de workspace ID, pas de channel ID, pas de template.
La région (`us1`, `eu1`…) est déduite automatiquement du préfixe de la clé.

---

## Étape 1 — Créer le compte

1. Va sur **https://bird.com** → *Get started* / *Sign up*.

   > Le domaine `app.bird.com` **ne fonctionne pas**. Le dashboard est sur
   > `bird.com/dashboard/...`.

2. Utilise une **adresse e-mail professionnelle** (ex. `@moobilpay.com`).

---

## Étape 2 — Créer la clé d'API

1. Barre latérale gauche, **tout en bas** → **API keys**.
2. Crée une clé, donne-lui un nom (ex. `moobilpay-backend`).
3. **Scopes** — déroule chaque ligne avec la flèche `⇕` et active :

   | Scope | Pourquoi |
   |---|---|
   | **Verify** | ⚠️ **indispensable** — c'est lui qui gère les OTP |
   | **WhatsApp** | envoi de messages WhatsApp |
   | **SMS** | optionnel, utile car Bird bascule en SMS si WhatsApp échoue |

   > Une clé avec seulement le scope WhatsApp fera échouer les OTP en `401`/`403`.

4. Copie la clé (format `bk_us1_...`). **Elle n'est affichée qu'une seule fois.**
5. Colle-la dans `.env.dev` **ET** `.env.prod` :

```env
BIRD_API_KEY=bk_us1_ta_cle
```

---

## Étape 3 — Recharger le portefeuille ⚠️

**Bird n'a pas d'offre gratuite.** Tant que le solde est à zéro, **aucun message
ne part**, ni WhatsApp ni SMS. L'API répond pourtant `success: true` à l'envoi —
l'échec n'apparaît qu'en consultant la vérification (voir *Diagnostic* plus bas) :

```
"error": "insufficient_balance: insufficient wallet balance"
```

Cherche **Billing** / **Wallet** / **Payment** dans les réglages du workspace ou
via le menu du compte (avatar en haut à droite).

**Tarification :** facturation à l'usage, sans engagement.
Les SMS sont facturés **par segment** (1 segment = 160 caractères en GSM-7) ;
le prix dépend du pays et de l'opérateur. Un OTP fait ~76 caractères,
soit **1 seul segment**. WhatsApp a sa propre grille (frais Bird + frais Meta).

---

## Étape 4 — Activer les pays

1. Barre latérale → **Verify** → **Countries**.
2. Vérifie que le **Cameroun** est activé, et que **WhatsApp** y est coché
   (pas seulement SMS).

Bird choisit ensuite le canal automatiquement : **WhatsApp d'abord, puis SMS,
puis e-mail**. Le repli est automatique en cas d'échec de livraison.

---

## Étape 5 — Tester

```bash
cd BACKEND
npm run start:dev
```

> Le serveur écoute sur le port défini par `PORT` dans `.env.dev`.
> Vérifie-le : les exemples ci-dessous utilisent **3000**.

### Envoyer un code OTP

```bash
curl -X POST http://localhost:3000/api/whatsapp/otp/send \
  -H "Content-Type: application/json" \
  -d '{"phoneNumber":"696080087"}'
```

Le numéro peut être saisi en local (`696080087`), avec indicatif
(`+237696080087`) ou au format `00237...` : il est normalisé automatiquement.

Réponse :

```json
{"success":true,"message":"Code OTP envoyé",
 "data":{"verificationId":"vrf_01kz...","phoneNumber":"+237696080087","status":"pending"}}
```

> ⚠️ `success: true` signifie « Bird a accepté la demande », **pas** « le message
> est arrivé ». Pour savoir ce qui s'est réellement passé, utilise le
> diagnostic ci-dessous.

### Vérifier le code

```bash
curl -X POST http://localhost:3000/api/whatsapp/otp/verify \
  -H "Content-Type: application/json" \
  -d '{"phoneNumber":"696080087","code":"123456"}'
```

### Diagnostiquer (l'appel le plus utile)

```bash
curl http://localhost:3000/api/whatsapp/verification/vrf_01kz...
```

Il révèle la cause exacte d'un OTP qui n'arrive pas :

```json
{"attempts":[
  {"channel":"whatsapp","deliveryStatus":"undelivered",
   "error":"insufficient_balance: insufficient wallet balance"},
  {"channel":"sms","deliveryStatus":"undelivered",
   "error":"insufficient_balance: insufficient wallet balance"}
]}
```

---

## Les endpoints du backend

### Authentification par WhatsApp (parcours complet)

| Méthode | Route | Rôle |
|---|---|---|
| POST | `/api/whatsapp/auth/request` | Envoyer un code de connexion |
| POST | `/api/whatsapp/auth/verify` | Valider, connecter ou inscrire, émettre un token |
| GET | `/api/whatsapp/costs/summary` | Récapitulatif des dépenses Bird |

**`auth/request`** applique un **délai de 60 s** entre deux demandes pour un même
numéro. Un renvoi trop rapproché renvoie `429` avec l'en-tête `Retry-After` et le
nombre de secondes restantes dans `data.retryAfter` — le contrôle a lieu **avant**
l'appel à Bird, donc un renvoi bloqué n'est pas facturé.

**`auth/verify`** sert à la fois de connexion et d'inscription : le compte est
créé si le numéro est inconnu, retrouvé sinon (`isNewUser` l'indique). Un code
refusé renvoie `401` avec `reason` et `attemptsRemaining`.

La réponse porte un **custom token Firebase** à usage unique. Le compte créé est
un compte Firebase Auth standard (uid `wa_<numéro>`, provider `phone`), donc
`authUser` et tout le backend existant fonctionnent sans modification.

#### ⚠️ Côté frontend : le token doit être échangé

**Le `customToken` n'est pas un token d'accès.** Il ne fonctionne pas dans un
en-tête `Authorization` et n'est valable qu'une heure. Il doit être échangé
contre une session Firebase, sans quoi l'authentification ne sert à rien.

```js
import { getAuth, signInWithCustomToken } from 'firebase/auth';

// 1. Demander le code
await fetch('/api/whatsapp/auth/request', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ phoneNumber: '696080087' }),
});

// 2. Valider le code saisi par l'utilisateur
const res = await fetch('/api/whatsapp/auth/verify', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ phoneNumber: '696080087', code: '123456' }),
});
const { data } = await res.json();

// 3. Échanger le customToken contre une vraie session Firebase
await signInWithCustomToken(getAuth(), data.customToken);

// 4. Appeler le backend avec le token d'accès Firebase (pas le customToken)
const idToken = await getAuth().currentUser.getIdToken();
await fetch('/api/user', { headers: { Authorization: `Bearer ${idToken}` } });
```

**Persistance de la session.** Après l'étape 3, Firebase stocke un refresh token
(localStorage sur le web, keychain sur mobile) qui **n'expire pas**. L'utilisateur
reste connecté bien au-delà de six mois sans nouvelle saisie de code. Le token
d'accès, lui, dure une heure et est renouvelé automatiquement : appeler
`getIdToken()` avant chaque requête suffit, il ne faut pas le mettre en cache.

Gestion des erreurs à prévoir :

| Statut | Cas | Réaction attendue |
|---|---|---|
| `429` | Renvoi trop rapproché | Afficher un compte à rebours de `data.retryAfter` secondes |
| `401` | Code refusé | Afficher `message`, et `data.attemptsRemaining` s'il est présent |
| `200` + `isNewUser: true` | Inscription | Proposer de compléter le profil (nom, e-mail) |

### SMS

| Méthode | Route | Rôle |
|---|---|---|
| POST | `/api/sms/send` | Envoyer un SMS (template uniquement) |
| GET | `/api/sms/templates` | Catalogue des templates disponibles |
| GET | `/api/sms/:id` | Statut de livraison et coût définitif |

### OTP bas niveau et diagnostic

| Méthode | Route | Rôle |
|---|---|---|
| POST | `/api/whatsapp/message` | Envoyer un message WhatsApp *(bloqué, voir Limites)* |
| POST | `/api/whatsapp/otp/send` | Envoyer un code OTP |
| POST | `/api/whatsapp/otp/verify` | Vérifier un code OTP |
| GET | `/api/whatsapp/message/:id/cost` | Coût d'un message |
| GET | `/api/whatsapp/verification/:id` | Diagnostic d'une vérification |

Documentation interactive : `http://localhost:3000/api-docs` (Swagger).

### Corps de requête

**Envoi OTP** — `phoneNumber` ou `email` :
```json
{ "phoneNumber": "696080087", "userId": "optionnel" }
```

**Vérification OTP** :
```json
{ "phoneNumber": "696080087", "code": "123456" }
```

**Message WhatsApp** — texte libre ou template :
```json
{ "to": "696080087", "text": "Bonjour" }
```
```json
{ "to": "696080087",
  "template": { "slug": "mon_template", "variables": { "ref": "A1B2" } } }
```
Envoi groupé : remplacer `to` par `"recipients": ["696...", "677..."]`.

---

## Suivi des coûts (collection `birdCosts`)

Bird n'expose **aucune vue agrégée par API** : le coût ne se lit qu'en
interrogeant chaque message ou vérification un par un. Sans trace locale, la
dépense est donc invisible. La collection `birdCosts` est alimentée
automatiquement — un document par vérification OTP (id `vrf_...`) ou par SMS
(id `sms_...`, champ `type: 'sms'`).

**Le coût n'est pas connu à l'envoi.** Bird renvoie `cost: null` à l'acceptation
et ne tarifie qu'ensuite. La trace est donc créée sans montant, puis complétée :
à la vérification du code pour un OTP, ou lors de la consultation du
récapitulatif pour tout ce qui reste en attente.

`GET /api/whatsapp/costs/summary` relit chez Bird toute trace dont le coût est
encore inconnu et la complète au passage — ce sont des **lectures, jamais des
envois**, donc l'appel ne coûte rien. C'est ce qui rattrape les demandes
abandonnées, qui sinon resteraient à `null` alors qu'elles ont bien été facturées.

```json
{ "count": 10, "verified": 4, "abandoned": 2, "pending": 4,
  "totalCost": 1.0144, "currencyCode": "USD",
  "byChannel": { "sms": { "count": 5, "cost": 0.9604 },
                 "whatsapp": { "count": 6, "cost": 0.054 } } }
```

- `verified` — code saisi et validé
- `abandoned` — expiré sans validation, **facturé quand même**
- `pending` — encore valide, l'utilisateur peut saisir son code

⚠️ **Un renvoi réutilise le même `verificationId` mais est facturé.** Bird
n'ouvre pas de nouvelle vérification tant que la précédente est valide : deux
envois donnent une vérification à `0,018 USD` avec deux tentatives. Le champ
`sendCount` compte les renvois pour que la trace ne soit pas écrasée.

---

## Limites connues

**WhatsApp est en préversion chez Bird.** Le dashboard l'affiche :
> *Sending WhatsApp with a custom sender, custom template or free form message
> isn't generally available yet.*

Concrètement :
- ❌ expéditeur personnalisé (ton propre numéro) — pas encore
- ❌ templates personnalisés — pas encore
- ❌ messages en texte libre — pas encore
- ✅ **OTP via Verify — fonctionne**

**Pour les OTP, rien à configurer** : Bird utilise son expéditeur partagé
(marque **Authifly**) et un template d'authentification intégré. Aucun compte
Meta Business, aucune vérification d'entreprise, aucun numéro dédié, aucun
template à faire approuver.

En contrepartie, le message porte la marque **Authifly**, pas MoobilPay. Bird
annonce le support des expéditeurs dédiés « prochainement ».

**Langue :** les OTP partent en **anglais** (`template_language: "en"`).
Un réglage existe peut-être dans **Verify → Configure**.

### SMS : templates uniquement, pas de texte libre

`/v1/sms/senders` est **vide** : le workspace ne possède aucun expéditeur SMS.
Tout envoi en texte libre est donc rejeté (*No eligible sender is available*).
Seul l'envoi **par template** fonctionne — Bird choisit alors son expéditeur
partagé (marque `Notifly`).

**Conséquence : impossible d'envoyer un lien ou un texte arbitraire par SMS.**
Les variables des templates sont typées et contraintes — testé :

| Valeur | Résultat |
|---|---|
| `ref: "moobilpay.com"` | ❌ refusé (le `.` est interdit) |
| `ref: "bit.ly/x9k2"` | ❌ refusé (le `/` est interdit) |
| `code: "moobilpay"` | ❌ refusé (4–8 chiffres uniquement) |
| `ref: "MP-AB12"` | ✅ accepté |

`ref` n'accepte que A–Z, 0–9 et le tiret sur 16 caractères. Aucun raccourcisseur
d'URL ne rentre dans ces règles. Pour transmettre un lien ou des identifiants,
passer par l'e-mail.

Débloquer le texte libre demande un **sender ID alphanumérique** enregistré
auprès des opérateurs camerounais (délai + justificatifs). `sendSmsText` est déjà
implémenté et n'attend qu'un `from`.

**Templates utiles pour MoobilPay** (11 au total, tous en anglais) :

| Template | Variables |
|---|---|
| `bird_payment_confirmation` | amount, currency, date |
| `bird_order_confirmation` | ref, amount, currency |
| `bird_renewal_reminder` | date, amount, currency |
| `bird_signin_alert` | date_time |
| `bird_otp_verification` | code |

⚠️ **Un SMS refusé est facturé.** Un test `bird_signin_alert` est revenu `failed`
avec `content_rejected` (code opérateur MTN 110) — filtrage de contenu côté
opérateur — et a tout de même coûté 0,2401 USD. Toujours relire le statut via
`GET /api/sms/:id` : `accepted` ne garantit rien.

### E-mail Bird

Disponible sur le compte mais **la clé API n'a pas le scope** (`403
InsufficientScope` sur `/v1/email/*`). C'est la voie à privilégier pour tout ce
que le SMS ne peut pas véhiculer : liens, identifiants, HTML, texte libre.

---

## Que faire si ça ne marche pas

| Symptôme | Cause | Solution |
|---|---|---|
| `insufficient_balance` dans le diagnostic | Solde à zéro | Recharger (étape 3) |
| `401` / `403` sur `/otp/send` | Clé sans le scope **Verify** | Recréer la clé (étape 2) |
| `Configuration Bird incomplète : BIRD_API_KEY manquant` | Variable vide | Vérifier `.env.dev` **et** `.env.prod` |
| OTP part en SMS et pas en WhatsApp | WhatsApp non coché pour le pays | Verify → Countries (étape 4) |
| `Numéro de téléphone invalide` | Format non reconnu | `696080087`, `+237696080087` ou `00237696080087` |
| Code refusé alors qu'il est bon | Expiré (10 min) | Redemander un code |
| OTP part en SMS coûteux au lieu de WhatsApp | Téléphone hors ligne → `carrier_rejected` | Normal : WhatsApp passe une fois le téléphone reconnecté |
| Message texte libre refusé | Préversion WhatsApp | Utiliser un template, ou attendre l'ouverture |
| `success: true` mais rien reçu | L'acceptation ≠ la livraison | `GET /api/whatsapp/verification/:id` |
| `429` sur `auth/request` | Renvoi sous 60 s | Attendre `data.retryAfter` secondes (non facturé) |
| `401` sur les routes protégées après connexion | Le `customToken` est envoyé tel quel | L'échanger via `signInWithCustomToken`, puis utiliser `getIdToken()` |
| SMS `failed` / `content_rejected` | Contenu filtré par l'opérateur | Facturé quand même ; essayer un autre template |
| SMS texte libre refusé | Aucun expéditeur sur le workspace | Utiliser un template, ou enregistrer un sender ID |
| Total des coûts trop bas | Demandes non résolues | Appeler `GET /api/whatsapp/costs/summary` (les complète) |

---

## Fichiers du code

| Fichier | Rôle |
|---|---|
| `src/config/bird.js` | Configuration, détection de région |
| `src/services/notification/whatsapp/birdClient.js` | Client HTTP, auth Bearer |
| `src/services/notification/whatsapp/sendWhatsappMessage.service.js` | Envoi de messages |
| `src/services/notification/whatsapp/otp/sendOtp.service.js` | Envoi OTP |
| `src/services/notification/whatsapp/otp/verifyOtp.service.js` | Vérification OTP |
| `src/services/notification/whatsapp/getMessageCost.service.js` | Coûts et diagnostic |
| `src/services/notification/whatsapp/otp/whatsappAuth.service.js` | Parcours d'authentification complet |
| `src/services/notification/whatsapp/birdCost.service.js` | Journalisation des coûts (`birdCosts`) |
| `src/services/notification/sms/sendSms.service.js` | Envoi SMS par template |
| `src/utils/validator/validatePhoneNumber.js` | Normalisation E.164 |
| `src/routes/whatsappRoutes.js` | Routes WhatsApp + Swagger |
| `src/routes/smsRoutes.js` | Routes SMS + Swagger |

---

## ⚠️ Dette à traiter

`src/services/notification/whatsapp/post-sms.service.js` contient un **Account
SID et un auth token Twilio en clair**, ainsi qu'un numéro codé en dur. Le
fichier n'est importé nulle part et est remplacé par l'intégration Bird.

Ces identifiants sont présents dans l'historique git : **ils doivent être
révoqués côté Twilio**, que le fichier soit supprimé ou non.

---

## Référence API Bird (nouvelle plateforme)

Base : `https://{region}.platform.bird.com` — en-tête `Authorization: Bearer bk_...`

| Endpoint | Corps |
|---|---|
| `POST /v1/whatsapp/messages` | `{ "to": "+237...", "template": { "slug": "...", "components": [...] } }` |
| `POST /v1/verify/verifications` | `{ "to": { "phone_number": "+237..." } }` |
| `POST /v1/verify/verifications/check` | `{ "to": { "phone_number": "+237..." }, "code": "123456" }` |
| `GET /v1/verify/verifications/{id}` | — |
| `GET /v1/whatsapp/messages/{id}` | — *(déduit, non confirmé sur un message réel)* |

> Les quatre premiers formats sont **vérifiés** : ils proviennent des snippets
> cURL du dashboard et ont été testés contre l'API réelle.

### Réponse de `/v1/verify/verifications/check`

⚠️ **Bird répond `HTTP 200` même quand le code est refusé.** Le verdict est porté
par le booléen `success` à la racine ; l'état de la vérification est imbriqué
sous `verification`, **pas à la racine** :

```json
{ "success": false, "reason": "incorrect_code", "attempts_remaining": 4,
  "verification": { "id": "vrf_...", "status": "pending", "expires_at": "..." } }
```

Lire `data.status` à la racine renvoie `undefined` — et fait donc **rejeter tous
les codes, y compris les bons**. Motifs observés dans `reason` :
`incorrect_code`, `expired`, `max_attempts_reached`, `already_verified`.

Une vérification tolère **5 tentatives** (`attempts_remaining` décrémente), et un
code correct reste accepté après des essais ratés tant que la demande n'a pas
expiré (10 min).

### Format des coûts

`cost.amount` est une **chaîne**, accompagnée de `cost.currency_code` :

```json
"cost": { "amount": "0.009", "currency_code": "USD" }
```

Présent à la fois sur la vérification globale et sur chaque tentative.

---

## Résultats de test réels (12/08/2026, Cameroun)

| Canal | Statut | Coût |
|---|---|---|
| WhatsApp | `delivered` ✅ | **0,0090 USD** |
| SMS (repli) | `delivered` ✅ | 0,2401 USD — 1 segment GSM_7BIT, 76 car. |

**WhatsApp fonctionne au Cameroun** et coûte ~27× moins cher que le SMS. Le repli
SMS ne se déclenche que si WhatsApp échoue.

⚠️ **Téléphone hors ligne = `carrier_rejected` sur WhatsApp**, suivi d'un repli
SMS facturé. Ce n'est **pas** un problème de routage ni de pays : une fois le
téléphone reconnecté, WhatsApp passe directement. Ne pas confondre ce cas avec
une indisponibilité de WhatsApp dans le pays.
