import admin from 'firebase-admin';

// Denna kod kollar om vi redan har en anslutning, för att inte skapa nya i onödan.
if (!admin.apps.length) {
  try {
    // Här hämtar vi nyckeln som du sparade i Vercel.
    const serviceAccountKey = JSON.parse(
      process.env.FIREBASE_SERVICE_ACCOUNT_KEY || '{}'
    );

    admin.initializeApp({
      credential: admin.credential.cert(serviceAccountKey),
    });
  } catch (error) {
    console.error('Firebase admin initialization error', error);
  }
}

// Vi exporterar en anslutning till Firestore-databasen som vi kan använda i andra filer.
export const db = admin.firestore();