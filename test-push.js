require("dotenv").config({ path: ".env.dev" });
const { db } = require('./src/config/firebase');
const sendPushNotification = require('./src/services/notification/FCM/sendPushNotification.service');

async function testPush() {
    const uid = "NgOcjUW5nZgdEpVMeVyQyYRQgIS2";
    console.log(`🔍 Recherche du token pour l'UID: ${uid}`);

    try {
        const userDoc = await db.collection('users').doc(uid).get();
        if (!userDoc.exists) {
            console.error("❌ Utilisateur non trouvé dans la base.");
            return;
        }

        const userData = userDoc.data();
        const token = userData.fcmToken || (userData.fcmTokens && userData.fcmTokens[0]);

        if (!token) {
            console.error("❌ Aucun token FCM trouvé pour cet utilisateur.");
            return;
        }

        console.log(`🚀 Envoi d'une notification de test vers le token: ${token.substring(0, 20)}...`);

        const result = await sendPushNotification({
            token: token,
            title: "Test MoobilPay 🚀",
            body: "Ceci est une notification de test pour vérifier la configuration Expo !",
            data: {
                type: "test",
                click_action: "FLUTTER_NOTIFICATION_CLICK" // Pour compatibilité si besoin
            }
        });

        if (result.success) {
            console.log("✅ Notification envoyée avec succès !");
        } else {
            console.error("❌ Échec de l'envoi:", result.message);
        }

    } catch (error) {
        console.error("❌ Erreur lors du test:", error);
    }
}

testPush();
