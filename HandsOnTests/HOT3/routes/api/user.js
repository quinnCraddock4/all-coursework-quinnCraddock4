import express from 'express';
import Joi from 'joi';

import isAuthenticated from '../../middleware/isAuthenticated.js';
import validate from '../../middleware/validate.js';
import { findUserByEmail, updateUserById, getDb, ObjectId } from '../../database.js';
import { auth } from '../../auth/index.js';

const router = express.Router();

const updateSchema = Joi.object({
    fullName: Joi.string().trim().min(1),
    email: Joi.string().trim().lowercase().email(),
    password: Joi.string().min(8),
}).min(1);

router.get('/me', isAuthenticated(), (req, res) => {
    return res.status(200).json(req.user);
});

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

export default router;

