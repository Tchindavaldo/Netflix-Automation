# Refacto paiements — Migration vers la nouvelle API Digikuntz

Ce document explique les changements apportés au flow de paiement et comment
tester le nouveau webhook.

---

## Pourquoi ce refacto

L'API Digikuntz a évolué :

- Le format de réponse de `POST /dev/transaction` a changé. Avant :
  ```json
  { "transactionId": "...", "paymentLink": "..." }
  ```
  Maintenant :
  ```json
  {
    "id": "...",
    "status": "payin_pending",
    "data": { "paymentLink": "...", "transactionRef": "...", ... }
  }
  ```

- Les statuts sont préfixés `payin_*` (au lieu de simples `success`, `error`, etc.) :
  - `payin_pending` — paiement en attente
  - `payin_success` — paiement reçu
  - `payin_error` — échec
  - `payin_closed` — fermé/annulé

- Un système de **webhook** est désormais disponible : Digikuntz POST sur une URL
  de notre choix dès qu'un statut change. Plus besoin de poller en boucle.

---

## Avant / Après — comparatif

### Init du paiement

| | Avant | Après |
|---|---|---|
| Lecture `paymentLink` | `response.data.paymentLink` ❌ | `response.data.data.paymentLink` ✅ |
| Champ `callbackUrl` envoyé | Non | Oui (si `PAYMENT_WEBHOOK_URL` défini) |
| Résultat sur le format actuel | **HTTP 500** | HTTP 200, retourne paymentLink |

### Détection du statut final

| | Avant | Après |
|---|---|---|
| Mécanisme principal | Polling toutes les 2s pendant 30 min | **Webhook temps réel** (push de Digikuntz) |
| Mécanisme de secours | (aucun) | Polling conservé en filet de sécurité |
| Reconnaissance des statuts | `'success'`, `'error'` (n'existent plus) | Mapping `payin_*` → interne |
| Délai succès → notif user | 2-30s (selon timing polling) | < 1s (webhook direct) |
| Si app fermée | User ne sait rien | Push notif iOS/Android |
| Coût (requêtes API) | ~900 req par paiement | 0-1 req par paiement |

### Mise à jour des données

| Action | Avant | Après |
|---|---|---|
| Transaction (statut) | `success` / `failed` | `success` / `failed` / `cancelled` |
| Plan activation | Non géré dans le polling | Géré (`statut: paid` ou `failed`) |
| Socket emit | `payment_validated` (succès uniquement) | `payment_validated` + `payment_failed` |
| Push notification | Aucune | iOS (APNs) + Android (FCM) selon device |

### Idempotence

| | Avant | Après |
|---|---|---|
| 2 webhooks identiques | n/a | Le 2e est ignoré (statut déjà à jour) |
| Webhook + polling simultanés | n/a | Webhook annule le polling actif |

---

## Fichiers modifiés / créés

### Nouveaux

- [src/controllers/handlers/payment/webhookHandler.js](src/controllers/handlers/payment/webhookHandler.js)
  Endpoint qui reçoit les events Digikuntz, met à jour la BD, émet le socket,
  envoie le push, annule le polling.

- [src/controllers/handlers/payment/checkPaymentStatusHandler.js](src/controllers/handlers/payment/checkPaymentStatusHandler.js)
  Endpoint manuel `GET /api/payment/status/:transactionId` pour debug ou
  fallback (interroge Digikuntz à la demande).

- [src/services/payment/paymentEventRegistry.js](src/services/payment/paymentEventRegistry.js)
  Registry partagé entre le polling et le webhook (permet au webhook d'annuler
  le polling en cours pour éviter le double traitement).

### Modifiés

- [src/controllers/handlers/payment/initMobileMoneyPaymentHandler.js](src/controllers/handlers/payment/initMobileMoneyPaymentHandler.js)
  Lit le paymentLink au bon endroit. Ajoute `callbackUrl` au payload.

- [src/controllers/subscriptionController.js](src/controllers/subscriptionController.js)
  Utilise le registry partagé. Mappe les nouveaux statuts `payin_*`.

- [src/controllers/paymentController.js](src/controllers/paymentController.js)
  Expose les 2 nouveaux handlers.

- [src/routes/paymentRoutes.js](src/routes/paymentRoutes.js)
  Ajoute `POST /api/payment/webhook` et `GET /api/payment/status/:id`.

---

## Variables d'environnement requises

Existantes (déjà configurées) :

```
PAYMENT_USER_ID=...
PAYMENT_SECRET_KEY=...
PAYMENT_API_URL=https://app.digikuntz.com/dev/transaction
```

Nouvelle (à ajouter) :

```
PAYMENT_WEBHOOK_URL=https://netflix-automation.fly.dev/api/payment/webhook
```

Sur Fly :
```bash
flyctl secrets set PAYMENT_WEBHOOK_URL=https://netflix-automation.fly.dev/api/payment/webhook
```

---

## Tester le webhook

### 1. Test avec un vrai paiement (end-to-end)

Le plus simple et le plus réaliste.

1. Vérifier que les secrets Fly sont bien à jour :
   ```bash
   flyctl secrets list
   ```
   `PAYMENT_WEBHOOK_URL` doit y figurer.

2. Suivre les logs en temps réel :
   ```bash
   flyctl logs
   ```

3. Depuis l'app iPhone/Android, lancer un paiement (petit montant, ex. 25 XAF).

4. Dans les logs Fly tu dois voir, dans l'ordre :
   ```
   Initiating Mobile Money payment with payload: { ..., callbackUrl: 'https://netflix-automation.fly.dev/api/payment/webhook' }
   External API Response Status: 201
   📝 [TRANSACTION] Enregistrée comme PENDING pour Tx: ...
   ```

5. Une fois le paiement validé sur Flutterwave :
   ```
   🪝 [WEBHOOK] Reçu Tx=... status=payin_success → success
   📡 [WEBHOOK-SOCKET] payment_validated → <userId>
   📤 [APNS] Envoi vers 1 token(s) iOS
   ✅ [APNS] Résultat : 1 succès, 0 échecs
   ```

6. L'app reçoit l'événement socket → écran de succès s'affiche.
   L'iPhone vibre avec la notif "Paiement confirmé".

### 2. Simuler un webhook avec curl (sans payer)

Permet de tester la logique webhook sans dépenser de l'argent. Utile pour
vérifier le comportement face à différents statuts (success, error, cancelled).

Prérequis : tu dois avoir au moins une transaction enregistrée en BD avec un
`externalTransactionId` connu. Tu peux en récupérer un dans Firestore →
collection `transactions` ou via les logs après un init.

```bash
curl -X POST https://netflix-automation.fly.dev/api/payment/webhook \
  -H "Content-Type: application/json" \
  -d '{
    "id": "MET_LICI_LE_externalTransactionId_REEL",
    "status": "payin_success",
    "data": {
      "estimation": "25",
      "transactionRef": "IN999#260101120000",
      "raisonForTransfer": "netflix-paiment",
      "receiverCurrency": "XAF"
    }
  }'
```

Réponse attendue : `{"received":true}` (200 OK)

Dans les logs Fly tu dois voir tout le traitement comme dans le scénario 1.
Côté frontend (si app ouverte avec un user connecté) : l'event socket arrive.

Variantes pour tester les autres statuts — remplace juste `"payin_success"` par :
- `"payin_error"` → transaction marquée failed, push "Paiement non abouti"
- `"payin_closed"` → transaction marquée cancelled, push "Paiement annulé"

### 3. Test du fallback check-status (manuel)

Pour vérifier que tu peux interroger Digikuntz à la demande :

```bash
curl https://netflix-automation.fly.dev/api/payment/status/<transactionId>
```

Réponse :
```json
{
  "success": true,
  "transactionId": "...",
  "status": "success",
  "rawStatus": "payin_success",
  "data": { ... }
}
```

### 4. Test idempotence

Envoie 2 fois le même curl webhook avec `payin_success`. Le 2e doit logguer :
```
ℹ️ [WEBHOOK] Statut déjà à jour (success), skip.
```
Et l'app ne reçoit pas un 2e événement socket / push. Confirme qu'on ne traite
pas en double si Digikuntz retry.

---

## Configuration côté Digikuntz

Deux façons d'envoyer le webhook :

1. **Au cas par cas** — déjà géré par notre code : chaque appel à
   `init-mobile-money` envoie le `callbackUrl` dans le payload Digikuntz.
   Aucune action côté portail.

2. **Global compte** — optionnellement, va sur ton profil Digikuntz et
   renseigne l'URL webhook par défaut :
   ```
   https://netflix-automation.fly.dev/api/payment/webhook
   ```
   Comme ça même si on oublie le `callbackUrl` dans un appel, Digikuntz utilise
   l'URL par défaut.

---

## Sécurité

⚠️ La route webhook n'a pas de vérification de signature (la doc Digikuntz n'en
mentionne pas). Implications :

- Un attaquant peut POST sur `/api/payment/webhook` avec un faux payload.
- Le seul impact : marquer comme `success` une transaction qu'il connaît déjà
  (l'`externalTransactionId` doit exister en BD), et déclencher l'envoi d'une
  notif push à l'utilisateur correspondant.
- **Risque limité** : pas de gain monétaire, juste du spam à un user spécifique.

Si Digikuntz ajoute une signature HMAC dans une prochaine version, on ajoutera
la vérification ici. En attendant, le risque est acceptable.

---

## Que faire si le webhook ne marche pas

Le polling reste actif en parallèle (filet de sécurité). Même si le webhook tombe
ou que Digikuntz ne l'appelle pas, la transaction sera confirmée par le polling
dans les 30 minutes max.

Pour debug :
1. `flyctl logs` pendant un paiement → vérifier que `🪝 [WEBHOOK] Reçu` apparaît
2. Si non : Digikuntz n'appelle pas → vérifier `PAYMENT_WEBHOOK_URL` côté secrets
   et payload envoyé (logs `Initiating Mobile Money payment with payload: ...`)
3. Tester manuellement avec curl (scénario 2 ci-dessus) — si ça marche en curl,
   le bug est côté Digikuntz/réseau, pas notre code.
