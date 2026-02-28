import type { VercelRequest, VercelResponse } from '@vercel/node';
import { db } from './firebase-admin.js';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  try {
    const { collectionName, docId, data, isDelete } = req.body;

    if (!collectionName || !docId) {
      return res.status(400).json({ error: 'Missing collectionName or docId' });
    }

    const docRef = db.collection(collectionName).doc(docId);

    if (isDelete) {
      // Om isDelete är true, ta bort dokumentet (t.ex. ett raderat recept)
      await docRef.delete();
    } else {
      // merge: true gör att vi bara uppdaterar de fält vi skickar in,
      // utan att skriva över annan data av misstag!
      await docRef.set(data, { merge: true });
    }

    res.status(200).json({ success: true });
  } catch (error) {
    console.error('Error updating document:', error);
    res.status(500).json({ error: 'Failed to update document' });
  }
}