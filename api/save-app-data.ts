import type { VercelRequest, VercelResponse } from '@vercel/node';
import { db } from './firebase-admin.js';

export default async function handler(
  req: VercelRequest,
  res: VercelResponse
) {
  // Vi tillåter bara POST-anrop för att spara data, för säkerhets skull.
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  try {
    // Datan som skickas från appen finns i req.body.
    const appData = req.body;

    // Vi ser till att ingen skickar skräpdata.
    if (!appData || typeof appData !== 'object') {
       return res.status(400).json({ error: 'Invalid data format' });
    }

    const docRef = db.collection('appData').doc('main');
    // .set() skriver över hela dokumentet med den nya datan.
    await docRef.set(appData);

    res.status(200).json({ message: 'Data saved successfully!' });
  } catch (error) {
    console.error('Error saving app data:', error);
    res.status(500).json({ error: 'Failed to save app data' });
  }
}