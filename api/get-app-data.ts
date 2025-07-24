import type { VercelRequest, VercelResponse } from '@vercel/node';
import { db } from './firebase-admin';

export default async function handler(
  req: VercelRequest,
  res: VercelResponse
) {
  try {
    // Vi skapar en referens till en specifik "behållare" i vår databas.
    // Vi kan kalla den 'appData' och sedan ha ett specifikt "dokument" för all vår data.
    // Det gör det enkelt att hantera backup och återställning i framtiden.
    const docRef = db.collection('appData').doc('main');
    const docSnap = await docRef.get();

    if (docSnap.exists) {
      // Om dokumentet finns, skicka tillbaka datan som JSON.
      res.status(200).json(docSnap.data());
    } else {
      // Om databasen är helt tom, skicka tillbaka en tom standard-struktur.
      const initialData = {
        users: {},
        recipes: {},
        mealPlans: {},
        adminUser: null,
      };
      res.status(200).json(initialData);
    }
  } catch (error) {
    console.error('Error fetching app data:', error);
    res.status(500).json({ error: 'Failed to fetch app data' });
  }
}