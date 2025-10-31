import express from 'express';
import Joi from 'joi';
import { fromNodeHeaders } from 'better-auth/node';

import validate from '../../middleware/validate.js';
import isAuthenticated from '../../middleware/isAuthenticated.js';
import { auth } from '../../auth/index.js';
import { findUserByEmail, findUserById } from '../../database.js';

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

            const token = signInResult.token;
            let user = await findUserById(signInResult.user.id);

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
                token,
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
            const token = req.session?.token;

            if (token) {
                const headers = fromNodeHeaders({
                    ...req.headers,
                    authorization: `Bearer ${token}`,
                });

                await auth.api.signOut({
                    headers,
                });
            }

            return res.status(200).json({ message: 'Signed out' });
        } catch (err) {
            return next(err);
        }
    }
);

export default router;

