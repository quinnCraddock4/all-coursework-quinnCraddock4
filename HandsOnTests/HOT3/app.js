import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import debug from 'debug';
import path from 'path';
import { fileURLToPath } from 'url';

import { initializeDatabase } from './database.js';
import { ensureAdminUser, refreshAuth } from './auth/index.js';
import authRouter from './routes/api/auth.js';
import productsRouter from './routes/api/product.js';
import userRouter from './routes/api/user.js';
import usersRouter from './routes/api/users.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const log = debug('hot3:app');

export const createApp = async () => {
    await initializeDatabase();
    await refreshAuth();
    await ensureAdminUser();

    const app = express();

    app.use(cors({ credentials: true, origin: true }));
    app.use(cookieParser());
    app.use(express.json());

    app.use(express.static(path.join(__dirname, 'public')));

    app.use('/api/auth', authRouter);
    app.use('/api/products', productsRouter);
    app.use('/api/product', productsRouter);
    app.use('/api/users', usersRouter);
    app.use('/api/user', userRouter);

    app.use((req, res) => {
        res.status(404).json({ message: 'Not Found' });
    });

    app.use((err, req, res, next) => {
        log(err);
        res.status(500).json({ message: 'Internal Server Error' });
    });

    return app;
};

export default createApp;

