import express from 'express';
import dotenv from 'dotenv';
import cors from 'cors';
import debugLib from 'debug';
import path from 'path';
import { fileURLToPath } from 'url';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const log = debugLib('hot3:server');

app.use(cors());
app.use(express.json());

app.use(express.static(path.join(__dirname, 'public')));

import productsRouter from './routes/api/product.js';
app.use('/api/products', productsRouter);


app.use((req, res) => {
    res.status(404).json({ message: 'Not Found' });
});

app.use((err, req, res, next) => {
    log(err);
    res.status(500).json({ message: 'Internal Server Error' });
});

const port = 2023;
app.listen(port, () => {
    log(`Server listening on http://localhost:${port}`);
});


