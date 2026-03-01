import type { VercelRequest, VercelResponse } from '@vercel/node';
import { db } from './firebase-admin.js';
import { parse } from 'cookie';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    // 1. Check Authentication
    const cookies = parse(req.headers.cookie || '');
    const sessionToken = cookies.session_token;

    let isAuthenticated = false;
    let requesterUsername = '';
    let requesterRole = 'User';

    if (sessionToken) {
      requesterUsername = sessionToken;
      const requesterDoc = await db.collection('users').doc(requesterUsername).get();
      if (requesterDoc.exists) {
        isAuthenticated = true;
        const requesterData = requesterDoc.data() as any;
        requesterRole = requesterData.role || 'User';
      }
    }

    // 2. Fetch data
    // We ALWAYS fetch users and settings so the login dropdown works.
    // We only fetch recipes and mealPlans if authenticated.
    const promises: Promise<any>[] = [
      db.collection('users').get(),
      db.collection('settings').doc('main').get()
    ];

    if (isAuthenticated) {
      promises.push(db.collection('recipes').get());
      promises.push(db.collection('mealPlans').get());
    }

    const results = await Promise.all(promises);
    const usersSnap = results[0];
    const settingsSnap = results[1];
    const recipesSnap = isAuthenticated ? results[2] : null;
    const mealPlansSnap = isAuthenticated ? results[3] : null;

    const adminUser = settingsSnap.exists ? settingsSnap.data()?.adminUser || null : null;

    const appData = {
      users: {} as any,
      recipes: {} as any,
      mealPlans: {} as any,
      adminUser
    };

    // 3. Filter data
    usersSnap.forEach((doc: any) => {
      // NEVER send passwordHash to the client
      const data = doc.data();
      let role = data.role || 'User';
      // Fallback: If this is an old DB where adminUser was stored in settings but never migrated to 'Owner' role
      if (doc.id === adminUser && !data.role) {
        role = 'Owner';
      }
      appData.users[doc.id] = { role };
    });

    if (isAuthenticated && recipesSnap) {
      recipesSnap.forEach((doc: any) => {
        appData.recipes[doc.id] = doc.data();
      });
    }

    if (isAuthenticated && mealPlansSnap) {
      mealPlansSnap.forEach((doc: any) => {
        // Users can only see their own meal plan.
        // Admins and Owners can see everyone's.
        if (requesterRole === 'Owner' || requesterRole === 'Admin' || doc.id === requesterUsername) {
          appData.mealPlans[doc.id] = doc.data();
        }
      });
    }

    res.status(200).json(appData);
  } catch (error) {
    console.error('Error fetching app data:', error);
    res.status(500).json({ error: 'Failed to fetch app data' });
  }
}