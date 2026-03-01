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

        const userDoc = await db.collection('users').doc(username).get();

        if (!userDoc.exists) {
            return res.status(401).json({ error: 'User not found' });
        }

        const userData = userDoc.data() as any;
        let role = userData.role;

        // Fallback for legacy admin
        if (!role) {
            const settingsDoc = await db.collection('settings').doc('main').get();
            if (settingsDoc.exists && settingsDoc.data()?.adminUser === username) {
                role = 'Owner';
                await userDoc.ref.set({ role: 'Owner' }, { merge: true });
            } else {
                role = 'User';
            }
        }

        // Note: For simplicity and ease of migration, the frontend still calculates the SHA-256 hash
        // and sends it to the server. For a full production app, you would send the plain text password
        // over HTTPS and hash it with bcrypt on the server.
        // For this personal app, this prevents plaintext passwords from going over the network 
        // to our personal backend unless HTTPS is enforced.
        if (userData.passwordHash !== passwordHash) {
            return res.status(401).json({ error: 'Invalid password' });
        }

        // Create the session cookie.
        // maxAge is not set, so it acts as a persistent session unless cleared.
        const cookie = serialize('session_token', username, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'strict',
            path: '/'
            // No maxAge means infinite (or until logout / browser clears cookies manually)
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
        console.error('Login error:', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
}
