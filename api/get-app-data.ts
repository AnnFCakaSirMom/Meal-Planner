import type { VercelRequest, VercelResponse } from '@vercel/node';
import { db } from './firebase-admin.js';
import { parse } from 'cookie';

export default async function handler(req: VercelRequest, res: VercelResponse) {
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

    // 2. Fetch data
    const [usersSnap, recipesSnap, mealPlansSnap, settingsSnap] = await Promise.all([
      db.collection('users').get(),
      db.collection('recipes').get(),
      db.collection('mealPlans').get(),
      db.collection('settings').doc('main').get()
    ]);

    const appData = {
      users: {} as any,
      recipes: {} as any,
      mealPlans: {} as any,
      adminUser: settingsSnap.exists ? settingsSnap.data()?.adminUser || null : null
    };

    // 3. Filter data based on role
    usersSnap.forEach(doc => {
      // NEVER send passwordHash to the client
      const data = doc.data();
      appData.users[doc.id] = { role: data.role || 'User' };
    });

    recipesSnap.forEach(doc => {
      appData.recipes[doc.id] = doc.data();
    });

    mealPlansSnap.forEach(doc => {
      // Users can only see their own meal plan.
      // Admins and Owners can see everyone's (needed for transfer functions etc).
      if (requesterRole === 'Owner' || requesterRole === 'Admin' || doc.id === requesterUsername) {
        appData.mealPlans[doc.id] = doc.data();
      }
    });

    res.status(200).json(appData);
  } catch (error) {
    console.error('Error fetching app data:', error);
    res.status(500).json({ error: 'Failed to fetch app data' });
  }
}