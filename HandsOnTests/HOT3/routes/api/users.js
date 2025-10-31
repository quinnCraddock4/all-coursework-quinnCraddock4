import express from 'express';

import hasRole from '../../middleware/hasRole.js';
import isAuthenticated from '../../middleware/isAuthenticated.js';
import validId from '../../middleware/validId.js';
import { findAllUsers, findUserById } from '../../database.js';

const router = express.Router();

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

