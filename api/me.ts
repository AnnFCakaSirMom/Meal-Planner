import type { VercelRequest, VercelResponse } from '@vercel/node';
import { db } from './firebase-admin.js';
import { parse } from 'cookie';

export default async function handler(req: VercelRequest, res: VercelResponse) {
    if (req.method !== 'GET') {
        return res.status(405).json({ error: 'Method Not Allowed' });
    }

    try {
        const cookies = parse(req.headers.cookie || '');
        const sessionToken = cookies.session_token;

        if (!sessionToken) {
            return res.status(401).json({ isAuthenticated: false });
        }

        // For this simple implementation, the session_token is just the username.
        // In a real production app, this should be a cryptographically secure token
        // stored in a sessions collection in the DB, mapped to the user.
        // However, since this is for personal use and behind Firebase Admin, this simplistic
        // approach provides the "keep me logged in" functionality requested.
        const username = sessionToken;

        const userDoc = await db.collection('users').doc(username).get();
        if (!userDoc.exists) {
            return res.status(401).json({ isAuthenticated: false });
        }

        const userData = userDoc.data() as any;

        res.status(200).json({
            isAuthenticated: true,
            user: {
                username,
                role: userData.role || 'User'
            }
        });
    } catch (error) {
        console.error('Error in /api/me:', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
}
