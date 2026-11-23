require("dotenv").config({ path: ".env.dev" });
const { db } = require('./src/config/firebase');
const sendPushNotification = require('./src/services/notification/FCM/sendPushNotification.service');
const userService = require('./src/services/userService');

// Usage: node test-push.js <UID_optional>
const uidArg = process.argv[2];

async function testPush() {
    const uid = uidArg || "NgOcjUW5nZgdEpVMeVyQyYRQgIS2";
    console.log(`🔍 Recherche des tokens pour l'UID: ${uid}`);

    try {
        const userDoc = await db.collection('users').doc(uid).get();
        if (!userDoc.exists) {
            console.error("❌ Utilisateur non trouvé dans la base.");
            return;
        }

        const { fcm: fcmTokens, apns: apnsTokens } = userService.collectUserTokens(userDoc.data());

        console.log(`📱 Tokens trouvés : ${fcmTokens.length} FCM (Android) + ${apnsTokens.length} APNs (iOS)`);

        if (fcmTokens.length === 0 && apnsTokens.length === 0) {
            console.error("❌ Aucun token push trouvé pour cet utilisateur.");
            return;
        }

        const result = await sendPushNotification({
            tokens: fcmTokens,
            apnsTokens,
            title: "Test MoobilPay 🚀",
            body: `Test du ${new Date().toLocaleTimeString()}`,
            data: { type: "test" },
        });

        console.log("\n=== RÉSULTAT ===");
        console.log(JSON.stringify(result, null, 2));
    } catch (error) {
        console.error("❌ Erreur lors du test:", error);
    }
}

testPush().then(() => process.exit(0));
