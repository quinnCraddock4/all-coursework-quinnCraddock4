import { fromNodeHeaders } from 'better-auth/node';

import { auth } from '../auth/index.js';
import { findUserById, getDb } from '../database.js';

const isAuthenticated = () => async (req, res, next) => {
    try {
        console.log('=== isAuthenticated middleware called ===');
        console.log('Request method:', req.method);
        console.log('Request path:', req.path);
        console.log('Request originalUrl:', req.originalUrl);
        console.log('Request baseUrl:', req.baseUrl);
        console.log('req.headers.cookie:', req.headers.cookie);
        console.log('req.cookies:', req.cookies);

        // Build cookie header string from req.cookies if it's not already in headers
        let cookieHeader = req.headers.cookie || '';

        // If we have cookies from cookie-parser but not in header, construct the header
        if (req.cookies && Object.keys(req.cookies).length > 0 && !cookieHeader) {
            cookieHeader = Object.entries(req.cookies)
                .map(([key, value]) => `${key}=${value}`)
                .join('; ');
            console.log('Constructed cookie header from req.cookies:', cookieHeader);
        }

        console.log('Final cookie header being used:', cookieHeader);

        // Try to get session token from cookies
        const sessionToken = req.cookies['better-auth.session_token'] ||
            req.cookies['session_token'] ||
            (cookieHeader.match(/better-auth\.session_token=([^;]+)/)?.[1]) ||
            (cookieHeader.match(/session_token=([^;]+)/)?.[1]);

        console.log('Extracted session token:', sessionToken);

        let session = null;
        let userId = null;

        // If we have a token, try to look up the session directly in the database
        if (sessionToken) {
            const db = await getDb();
            const sessionDoc = await db.collection('session').findOne({
                token: sessionToken,
            });

            console.log('Session doc from DB:', sessionDoc ? 'FOUND' : 'NOT FOUND');

            if (sessionDoc && sessionDoc.userId) {
                userId = sessionDoc.userId.toString();
                console.log('Found userId from session:', userId);

                // Create a session-like object for better-auth compatibility
                session = {
                    user: { id: userId },
                    session: sessionDoc,
                };
            }
        }

        // If direct lookup didn't work, try better-auth's getSession
        if (!session) {
            console.log('Trying better-auth getSession...');
            const headers = fromNodeHeaders({
                ...req.headers,
                cookie: cookieHeader,
            });
            const authSession = await auth.api.getSession({ headers });
            if (authSession) {
                session = authSession;
                userId = session.user?.id;
                console.log('Better-auth found session, user ID:', userId);
            }
        }

        if (!session || !userId) {
            console.log('No session found - returning 401');
            return res.status(401).json({ message: 'Authentication required' });
        }

        console.log('Session found, user ID:', userId);

        const user = await findUserById(session.user.id);

        if (!user) {
            return res.status(401).json({ message: 'Authentication required' });
        }

        req.user = user;
        req.session = session.session ?? {};

        return next();
    } catch (err) {
        return next(err);
    }
};

export default isAuthenticated;

