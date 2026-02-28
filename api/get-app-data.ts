import type { VercelRequest, VercelResponse } from '@vercel/node';
import { db } from './firebase-admin.js';

export default async function handler(_req: VercelRequest, res: VercelResponse) {
  try {
    // Vi kollar om vår nya användar-samling finns
    const usersSnap = await db.collection('users').get();
    
    // --- AUTOMATISK MIGRERING (Körs bara en enda gång om nya databasen är tom) ---
    if (usersSnap.empty) {
        const oldDoc = await db.collection('appData').doc('main').get();
        if (oldDoc.exists) {
            const oldData = oldDoc.data() as any;
            if (oldData) {
                console.log("Migrating old database to new collections...");
                const batch = db.batch();
                
                if (oldData.users) {
                    Object.entries(oldData.users).forEach(([username, data]) => {
                        batch.set(db.collection('users').doc(username), data as any);
                    });
                }
                if (oldData.recipes) {
                    Object.entries(oldData.recipes).forEach(([recipeId, data]) => {
                        batch.set(db.collection('recipes').doc(recipeId), data as any);
                    });
                }
                if (oldData.mealPlans) {
                    Object.entries(oldData.mealPlans).forEach(([userId, data]) => {
                        batch.set(db.collection('mealPlans').doc(userId), data as any);
                    });
                }
                batch.set(db.collection('settings').doc('main'), { adminUser: oldData.adminUser || null });
                
                await batch.commit();
                return res.status(200).json(oldData); // Returnera gamla datan till appen denna gång
            }
        }
    }
    // --- SLUT PÅ MIGRERING ---

    // Normal hämtning från nya säkra strukturen: Vi hämtar allt blixtsnabbt parallellt.
    const [recipesSnap, mealPlansSnap, settingsSnap] = await Promise.all([
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

    // Pussla ihop bitarna till formatet som React-appen förväntar sig
    usersSnap.forEach(doc => { appData.users[doc.id] = doc.data(); });
    recipesSnap.forEach(doc => { appData.recipes[doc.id] = doc.data(); });
    mealPlansSnap.forEach(doc => { appData.mealPlans[doc.id] = doc.data(); });

    res.status(200).json(appData);
  } catch (error) {
    console.error('Error fetching app data:', error);
    res.status(500).json({ error: 'Failed to fetch app data' });
  }
}