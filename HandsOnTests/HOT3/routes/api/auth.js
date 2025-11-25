import express from 'express';
import Joi from 'joi';
import { fromNodeHeaders } from 'better-auth/node';

import validate from '../../middleware/validate.js';
import isAuthenticated from '../../middleware/isAuthenticated.js';
import { auth } from '../../auth/index.js';
import { findUserByEmail, findUserById, getDb, ObjectId } from '../../database.js';

const router = express.Router();

const signUpSchema = Joi.object({
    fullName: Joi.string().trim().min(1).required(),
    email: Joi.string().trim().lowercase().email().required(),
    password: Joi.string().min(8).required(),
});

const signInSchema = Joi.object({
    email: Joi.string().trim().lowercase().email().required(),
    password: Joi.string().min(8).required(),
});

router.post(
    '/sign-up/email',
    validate(signUpSchema),
    async (req, res, next) => {
        try {
            const { fullName, email, password } = req.body;
            const normalizedEmail = email.trim().toLowerCase();
            const existingUser = await findUserByEmail(normalizedEmail);

            if (existingUser) {
                return res.status(400).json({ message: 'Email already in use' });
            }

            await auth.api.signUpEmail({
                body: {
                    email: normalizedEmail,
                    password,
                    name: fullName.trim(),
                    fullName: fullName.trim(),
                },
            });

            const user = await findUserByEmail(normalizedEmail);

            return res.status(200).json({ message: 'User registered', user });
        } catch (err) {
            if (err?.message === 'User already exists. Use another email.' || err?.message === 'User already exists.') {
                return res.status(400).json({ message: 'Email already in use' });
            }
            return next(err);
        }
    }
);

router.post(
    '/sign-in/email',
    validate(signInSchema),
    async (req, res, next) => {
        try {
            const { email, password } = req.body;
            const normalizedEmail = email.trim().toLowerCase();

            const signInResult = await auth.api.signInEmail({
                body: {
                    email: normalizedEmail,
                    password,
                },
                headers: fromNodeHeaders(req.headers),
            });

            // Query the session from database to get the token
            const db = await getDb();
            const userId = new ObjectId(signInResult.user.id);
            const sessionDoc = await db.collection('session').findOne({
                userId: userId,
            }, { sort: { expiresAt: -1 } }); // Get most recent session

            // Set the session cookie if we found a session
            // Better-auth uses different cookie names, try the most common ones
            if (sessionDoc && sessionDoc.token) {
                // Try the session token as the cookie value
                const cookieValue = sessionDoc.token;
                
                // Better-auth might use different cookie names - try common ones
                // The cookie name format is usually: better-auth.session_token or session_token
                res.cookie('better-auth.session_token', cookieValue, {
                    httpOnly: true,
                    secure: process.env.NODE_ENV === 'production',
                    sameSite: 'lax',
                    maxAge: sessionDoc.expiresAt ? 
                        Math.max(0, sessionDoc.expiresAt.getTime() - Date.now()) : 
                        60 * 60 * 24 * 7 * 1000, // 7 days default
                });
                
                // Also try setting it as session_token (without prefix) in case that's what better-auth expects
                res.cookie('session_token', cookieValue, {
                    httpOnly: true,
                    secure: process.env.NODE_ENV === 'production',
                    sameSite: 'lax',
                    maxAge: sessionDoc.expiresAt ? 
                        Math.max(0, sessionDoc.expiresAt.getTime() - Date.now()) : 
                        60 * 60 * 24 * 7 * 1000,
                });
            }

            let user = await findUserById(signInResult.user.id);

            if (!user && signInResult.user.email) {
                user = await findUserByEmail(signInResult.user.email);
            }

            if (!user) {
                user = {
                    _id: signInResult.user.id,
                    id: signInResult.user.id,
                    fullName: signInResult.user.name ?? '',
                    email: signInResult.user.email,
                    roles: [],
                    createdOn: signInResult.user.createdAt ?? null,
                    lastUpdatedOn: signInResult.user.updatedAt ?? null,
                };
            }

            return res.status(200).json({
                message: 'Signed in',
                user,
            });
        } catch (err) {
            if (
                err?.message === 'Invalid email or password' ||
                err?.message === 'Invalid email' ||
                err?.message === 'Invalid password'
            ) {
                return res.status(400).json({ message: 'Invalid email or password' });
            }
            return next(err);
        }
    }
);

router.post(
    '/sign-out',
    isAuthenticated(),
    async (req, res, next) => {
        try {
            // Get the session token from cookies
            const sessionToken = req.cookies['better-auth.session_token'] || 
                                req.cookies['session_token'] ||
                                (req.headers.cookie?.match(/better-auth\.session_token=([^;]+)/)?.[1]) ||
                                (req.headers.cookie?.match(/session_token=([^;]+)/)?.[1]);

            // If we have a session token, delete it from the database
            if (sessionToken) {
                const db = await getDb();
                await db.collection('session').deleteOne({
                    token: sessionToken,
                });
            }

            // Also try better-auth's signOut
            try {
                const headers = fromNodeHeaders(req.headers);
                await auth.api.signOut({
                    headers,
                });
            } catch (err) {
                // Ignore errors from better-auth signOut if we already deleted the session
                console.log('Better-auth signOut error (ignored):', err.message);
            }

            // Clear the cookies
            res.clearCookie('better-auth.session_token');
            res.clearCookie('session_token');

            return res.status(200).json({ message: 'Signed out' });
        } catch (err) {
            return next(err);
        }
    }
);

export default router;

