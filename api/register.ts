import type { VercelRequest, VercelResponse } from '@vercel/node';
import { db } from './firebase-admin.js';
import { serialize } from 'cookie';

export default async function handler(req: VercelRequest, res: VercelResponse) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method Not Allowed' });
    }

    try {
        const { username, passwordHash } = req.body;

        if (!username || !passwordHash) {
            return res.status(400).json({ error: 'Missing username or passwordHash' });
        }

        const userRef = db.collection('users').doc(username);
        const userDoc = await userRef.get();

        if (userDoc.exists) {
            return res.status(409).json({ error: 'User already exists' });
        }

        // Check if database is completely empty of users. If so, this is the Owner.
        const allUsersSnap = await db.collection('users').get();
        const isFirstUser = allUsersSnap.empty;
        const role = isFirstUser ? 'Owner' : 'User';

        const newUserData = {
            passwordHash,
            role
        };

        // Create the user document
        await userRef.set(newUserData);

        // Also update settings to mark adminUser if needed (fallback for old code compatibility)
        if (isFirstUser) {
            await db.collection('settings').doc('main').set({ adminUser: username }, { merge: true });
        }

        // Create initial session cookie directly after registration to auto-login
        const cookie = serialize('session_token', username, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'strict',
            path: '/'
        });

        res.setHeader('Set-Cookie', cookie);
        res.status(200).json({
            success: true,
            user: {
                username,
                role
            }
        });

    } catch (error) {
        console.error('Registration error:', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
}
