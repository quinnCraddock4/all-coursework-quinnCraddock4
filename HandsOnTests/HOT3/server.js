import dotenv from 'dotenv';
import debugLib from 'debug';

import createApp from './app.js';

dotenv.config();

const log = debugLib('hot3:server');
const port = process.env.PORT ?? 2023;

const start = async () => {
    try {
        const app = await createApp();
        app.listen(port, () => {
            log(`Server listening on http://localhost:${port}`);
        });
    } catch (err) {
        log('Failed to start server', err);
        process.exit(1);
    }
};

start();


