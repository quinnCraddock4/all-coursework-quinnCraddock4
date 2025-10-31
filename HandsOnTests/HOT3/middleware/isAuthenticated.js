import { fromNodeHeaders } from 'better-auth/node';

import { auth } from '../auth/index.js';
import { findUserById } from '../database.js';

const extractToken = (req) => {
    const header = req.get('authorization');
    if (!header) {
        return null;
    }

    const [scheme, token] = header.split(' ');
    if (scheme?.toLowerCase() !== 'bearer' || !token) {
        return null;
    }

    return token.trim();
};

const isAuthenticated = () => async (req, res, next) => {
    try {
        const token = extractToken(req);

        if (!token) {
            return res.status(401).json({ message: 'Authentication required' });
        }

        const headers = fromNodeHeaders({
            ...req.headers,
            authorization: `Bearer ${token}`,
        });

        const session = await auth.api.getSession({ headers });

        if (!session) {
            return res.status(401).json({ message: 'Authentication required' });
        }

        const user = await findUserById(session.user.id);

        if (!user) {
            return res.status(401).json({ message: 'Authentication required' });
        }

        req.user = user;
        const sessionInfo = session.session ?? {};
        req.session = { token: sessionInfo.token ?? token, ...sessionInfo };

        return next();
    } catch (err) {
        return next(err);
    }
};

export default isAuthenticated;

