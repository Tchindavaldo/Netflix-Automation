# Configuration APNs (notifications push iOS)

Les pushs iOS partent **directement** vers Apple APNs depuis le backend (pas via Firebase). Tu réutilises la même clé `.p8` que celle uploadée dans Firebase.

## 1. Copier la clé `.p8` dans le backend

Mets le fichier `AuthKey_LTC4U49XZC.p8` dans un dossier accessible au backend, par exemple :

```
c:/dev/moobilPay/backend/secrets/AuthKey_LTC4U49XZC.p8
```

⚠️ **Ne jamais commit ce fichier sur git.** Ajoute `secrets/` ou `*.p8` dans le `.gitignore` backend.

## 2. Variables à ajouter dans `.env.dev` et `.env.prod`

```dotenv
# === APNs (notifications push iOS) ===
APNS_KEY_PATH=./secrets/AuthKey_LTC4U49XZC.p8
APNS_KEY_ID=LTC4U49XZC
APNS_TEAM_ID=23ARWS8L89
APNS_BUNDLE_ID=com.moobilpay.com
# false = sandbox (builds développement EAS), true = production (TestFlight / App Store)
APNS_PRODUCTION=false
```

### Quand passer `APNS_PRODUCTION=true` ?

- `false` → builds installés via QR code EAS (`eas build --profile development`) — c'est ton cas actuel
- `true` → uniquement quand l'app est distribuée via TestFlight ou App Store

Si tu te trompes, Apple répond `BadDeviceToken` et le push est rejeté silencieusement.

## 3. Comment ça marche côté code

- [src/services/notification/APNS/sendApnsPush.service.js](src/services/notification/APNS/sendApnsPush.service.js) : envoie les pushs directement à Apple HTTP/2
- [src/services/notification/FCM/sendPushNotification.service.js](src/services/notification/FCM/sendPushNotification.service.js) : orchestrateur qui route FCM (Android) + APNs (iOS) en parallèle
- [src/services/userService.js](src/services/userService.js) : stocke les tokens dans deux champs Firestore distincts :
  - `fcmTokens: string[]` → Android (envoi via Firebase Admin)
  - `apnsTokens: string[]` → iOS (envoi via node-apn direct)

Le frontend envoie `tokenType: 'ios' | 'android'` à chaque sync, et le backend route automatiquement vers le bon tableau.

## 4. Tester

Après installation de l'app sur iPhone et acceptation des permissions :

1. Vérifie que le token est bien stocké : Firestore → collection `users` → ton document → champ `apnsTokens` doit contenir une string hex de 64 caractères.
2. Lance un push test depuis ton backend (curl ou endpoint existant) avec ton `userId` → l'iPhone doit recevoir la notification.
3. Côté logs backend, tu dois voir :
   ```
   📤 [APNS] Envoi vers 1 token(s) iOS
   ✅ [APNS] Résultat : 1 succès, 0 échecs
   ```
