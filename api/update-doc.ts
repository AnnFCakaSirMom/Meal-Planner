import type { VercelRequest, VercelResponse } from '@vercel/node';
import { db } from './firebase-admin.js';
import { parse } from 'cookie';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  try {
    // 1. Authenticate user
    const cookies = parse(req.headers.cookie || '');
    const sessionToken = cookies.session_token;

    if (!sessionToken) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const requesterUsername = sessionToken;
    const requesterDoc = await db.collection('users').doc(requesterUsername).get();

    if (!requesterDoc.exists) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const requesterData = requesterDoc.data() as any;
    const requesterRole = requesterData.role || 'User';

    const { collectionName, docId, data, isDelete } = req.body;

    if (!collectionName || !docId) {
      return res.status(400).json({ error: 'Missing collectionName or docId' });
    }

    const docRef = db.collection(collectionName).doc(docId);

    // 2. Authorization Rules
    if (requesterRole === 'User') {
      if (collectionName === 'settings') {
        return res.status(403).json({ error: 'Forbidden: Users cannot modify settings' });
      }
      if (collectionName === 'users') {
        if (docId !== requesterUsername) {
          return res.status(403).json({ error: 'Forbidden: Users can only modify their own profile' });
        }
        if (data?.role && data.role !== 'User') {
          return res.status(403).json({ error: 'Forbidden: Users cannot elevate their own role' });
        }
      }
      if (collectionName === 'mealPlans' && docId !== requesterUsername) {
        return res.status(403).json({ error: 'Forbidden: Users can only modify their own meal plans' });
      }
      if (collectionName === 'recipes') {
        // Check if recipe belongs to user
        const recipeDoc = await docRef.get();
        if (recipeDoc.exists) {
          const recipeData = recipeDoc.data() as any;
          if (recipeData.createdBy !== requesterUsername) {
            return res.status(403).json({ error: 'Forbidden: Users can only modify their own recipes' });
          }
        } else if (isDelete) {
          return res.status(404).json({ error: 'Recipe not found' });
        } else if (data?.createdBy !== requesterUsername) {
          // Creating new recipe, ensure they are not spoofing createdBy
          return res.status(403).json({ error: 'Forbidden: Cannot create recipe for another user' });
        }
      }
    }

    if (requesterRole === 'Admin') {
      if (collectionName === 'users') {
        if (docId !== requesterUsername && isDelete) {
          return res.status(403).json({ error: 'Forbidden: Admins cannot delete other users' });
        }
        if (data?.role && data.role === 'Owner') {
          return res.status(403).json({ error: 'Forbidden: Admins cannot grant Owner role' });
        }
        // Block modifying the Owner
        const targetUserDoc = await docRef.get();
        if (targetUserDoc.exists) {
          const targetData = targetUserDoc.data() as any;
          if (targetData.role === 'Owner' && docId !== requesterUsername) {
            return res.status(403).json({ error: 'Forbidden: Admins cannot modify the Owner' });
          }
        }
      }
      if (collectionName === 'settings') {
        return res.status(403).json({ error: 'Forbidden: Admins cannot modify global settings' });
      }
    }

    // Owner implicitly bypasses the above restrictions and can do anything

    if (isDelete) {
      await docRef.delete();
    } else {
      await docRef.set(data, { merge: true });
    }

    res.status(200).json({ success: true });
  } catch (error) {
    console.error('Error updating document:', error);
    res.status(500).json({ error: 'Failed to update document' });
  }
}