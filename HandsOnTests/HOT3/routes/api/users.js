import express from 'express';
import Joi from 'joi';

import hasRole from '../../middleware/hasRole.js';
import isAuthenticated from '../../middleware/isAuthenticated.js';
import validId from '../../middleware/validId.js';
import validate from '../../middleware/validate.js';
import { findAllUsers, findUserById, findUserByEmail, updateUserById, getDb, ObjectId } from '../../database.js';
import { auth } from '../../auth/index.js';

const router = express.Router();

const updateSchema = Joi.object({
    fullName: Joi.string().trim().min(1),
    email: Joi.string().trim().lowercase().email(),
    password: Joi.string().min(8),
}).min(1);

router.get(
    '/',
    isAuthenticated(),
    hasRole('admin'),
    async (req, res, next) => {
        try {
            const users = await findAllUsers();
            return res.status(200).json(users);
        } catch (err) {
            return next(err);
        }
    }
);

// Handle /me route specifically to avoid matching /:userId
// This allows /api/users/me to work the same as /api/user/me
router.get(
    '/me',
    isAuthenticated(),
    (req, res) => {
        return res.status(200).json(req.user);
    }
);

router.patch(
    '/me',
    isAuthenticated(),
    validate(updateSchema),
    async (req, res, next) => {
        try {
            const { fullName, email, password } = req.body;
            const updates = {};

            if (fullName) {
                updates.fullName = fullName.trim();
            }

            if (email) {
                const normalizedEmail = email.trim().toLowerCase();
                const existing = await findUserByEmail(normalizedEmail);
                if (existing && existing._id !== req.user._id) {
                    return res.status(400).json({ message: 'Email already in use' });
                }
                updates.email = normalizedEmail;
            }

            if (password) {
                const context = await auth.$context;
                const hashedPassword = await context.password.hash(password);
                const db = await getDb();

                await db.collection('account').updateOne(
                    {
                        providerId: 'credential',
                        userId: new ObjectId(req.user._id),
                    },
                    {
                        $set: {
                            password: hashedPassword,
                            updatedAt: new Date(),
                        },
                    }
                );
            }

            let updated = req.user;

            if (Object.keys(updates).length > 0) {
                updated = await updateUserById(req.user._id, updates);
            }

            if (!updated) {
                return res.status(404).json({ message: 'User not found' });
            }

            req.user = updated;

            return res.status(200).json(updated);
        } catch (err) {
            if (
                err?.message === 'Password too short' ||
                err?.message === 'Password too long'
            ) {
                return res.status(400).json({ message: err.message });
            }
            return next(err);
        }
    }
);

router.get(
    '/:userId',
    isAuthenticated(),
    hasRole('admin'),
    validId('userId'),
    async (req, res, next) => {
        try {
            const { userId } = req.params;
            const user = await findUserById(userId);

            if (!user) {
                return res.status(404).json({ message: 'User not found' });
            }

            return res.status(200).json(user);
        } catch (err) {
            return next(err);
        }
    }
);

export default router;



