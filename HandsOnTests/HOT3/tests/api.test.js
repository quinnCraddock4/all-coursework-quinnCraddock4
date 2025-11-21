import { beforeAll, afterAll, beforeEach, describe, expect, it } from 'vitest';
import request from 'supertest';
import dotenv from 'dotenv';
import { MongoClient } from 'mongodb';

dotenv.config();

let createApp;
let closeDatabase;
let app;
let adminToken;
let adminUser;

const adminCredentials = {
    email: 'eagudmestad@ranken.edu',
    password: '123456789',
};

const authHeader = (token) => ({
    Authorization: `Bearer ${token}`,
});

const dropDatabase = async () => {
    const client = new MongoClient(process.env.DB_URL);
    await client.connect();
    await client.db(process.env.DB_NAME).dropDatabase();
    await client.close();
};

const signInAdmin = async () => {
    const response = await request(app)
        .post('/api/auth/sign-in/email')
        .send(adminCredentials)
        .expect(200);

    adminToken = response.body.token;
    adminUser = response.body.user;
};

const registerAndLoginUser = async ({ fullName, email, password }) => {
    await request(app)
        .post('/api/auth/sign-up/email')
        .send({ fullName, email, password })
        .expect(200);

    const response = await request(app)
        .post('/api/auth/sign-in/email')
        .send({ email, password })
        .expect(200);

    return {
        token: response.body.token,
        user: response.body.user,
    };
};

beforeAll(async () => {
    // Use actual database from .env file
    if (!process.env.DB_URL || !process.env.DB_NAME) {
        throw new Error('DB_URL and DB_NAME must be set in .env file');
    }

    const appModule = await import('../app.js');
    createApp = appModule.createApp ?? appModule.default;

    const dbModule = await import('../database.js');
    closeDatabase = dbModule.closeDatabase;
});

afterAll(async () => {
    await closeDatabase();
});

beforeEach(async () => {
    await closeDatabase();
    await dropDatabase();
    app = await createApp();
    await signInAdmin();
});

describe('Authentication', () => {
    it('registers a new user', async () => {
        const payload = { fullName: 'Test User', email: 'test@example.com', password: 'password123' };

        const response = await request(app)
            .post('/api/auth/sign-up/email')
            .send(payload)
            .expect(200);

        expect(response.body.message).toBe('User registered');
        expect(response.body.user.email).toBe(payload.email.toLowerCase());
    });

    it('prevents duplicate registrations', async () => {
        const payload = { fullName: 'Test User', email: 'dup@example.com', password: 'password123' };

        await request(app).post('/api/auth/sign-up/email').send(payload).expect(200);

        const duplicate = await request(app)
            .post('/api/auth/sign-up/email')
            .send(payload)
            .expect(400);

        expect(duplicate.body.message).toBe('Email already in use');
    });

    it('signs in an existing user', async () => {
        const { token, user } = await registerAndLoginUser({
            fullName: 'Login User',
            email: 'login@example.com',
            password: 'password123',
        });

        expect(token).toBeTruthy();
        expect(user.email).toBe('login@example.com');
    });

    it('rejects invalid credentials', async () => {
        await registerAndLoginUser({
            fullName: 'Invalid User',
            email: 'invalid@example.com',
            password: 'password123',
        });

        const response = await request(app)
            .post('/api/auth/sign-in/email')
            .send({ email: 'invalid@example.com', password: 'wrongpass' })
            .expect(400);

        expect(response.body.message).toBe('Invalid email or password');
    });

    it('signs out the current session', async () => {
        const { token } = await registerAndLoginUser({
            fullName: 'Logout User',
            email: 'logout@example.com',
            password: 'password123',
        });

        await request(app)
            .post('/api/auth/sign-out')
            .set(authHeader(token))
            .expect(200);

        await request(app)
            .get('/api/user/me')
            .set(authHeader(token))
            .expect(401);
    });

    it('requires authentication to sign out', async () => {
        await request(app).post('/api/auth/sign-out').expect(401);
    });
});

describe('User management', () => {
    it('lists all users for admins', async () => {
        const response = await request(app)
            .get('/api/users')
            .set(authHeader(adminToken))
            .expect(200);

        expect(Array.isArray(response.body)).toBe(true);
        expect(response.body.some((user) => user.email === adminCredentials.email)).toBe(true);
    });

    it('prevents non-admins from listing users', async () => {
        const { token } = await registerAndLoginUser({
            fullName: 'Standard User',
            email: 'standard@example.com',
            password: 'password123',
        });

        const response = await request(app)
            .get('/api/users')
            .set(authHeader(token))
            .expect(403);

        expect(response.body.message).toBe('Access denied');
    });

    it('fetches a single user by id for admins', async () => {
        const response = await request(app)
            .get(`/api/users/${adminUser._id}`)
            .set(authHeader(adminToken))
            .expect(200);

        expect(response.body.email).toBe(adminCredentials.email);
    });

    it('rejects invalid user identifiers', async () => {
        await request(app)
            .get('/api/users/not-a-valid-id')
            .set(authHeader(adminToken))
            .expect(400);
    });

    it('returns the authenticated user profile', async () => {
        const response = await request(app)
            .get('/api/user/me')
            .set(authHeader(adminToken))
            .expect(200);

        expect(response.body.email).toBe(adminCredentials.email);
    });

    it('updates the authenticated user profile', async () => {
        const { token } = await registerAndLoginUser({
            fullName: 'Profile User',
            email: 'profile@example.com',
            password: 'password123',
        });

        const response = await request(app)
            .patch('/api/user/me')
            .set(authHeader(token))
            .send({ fullName: 'Profile User Updated', password: 'password456' })
            .expect(200);

        expect(response.body.fullName).toBe('Profile User Updated');

        const loginResponse = await request(app)
            .post('/api/auth/sign-in/email')
            .send({ email: 'profile@example.com', password: 'password456' })
            .expect(200);

        expect(loginResponse.body.user.fullName).toBe('Profile User Updated');
    });

    it('requires at least one field to update profile', async () => {
        const { token } = await registerAndLoginUser({
            fullName: 'Empty Update',
            email: 'empty@example.com',
            password: 'password123',
        });

        await request(app)
            .patch('/api/user/me')
            .set(authHeader(token))
            .send({})
            .expect(400);
    });
});

describe('Products', () => {
    const createProduct = async (overrides = {}, token = adminToken) => {
        const base = {
            name: 'Test Product',
            description: 'A product for testing',
            category: 'testing',
            price: 10,
        };

        const payload = { ...base, ...overrides };

        const response = await request(app)
            .post('/api/products')
            .set(authHeader(token))
            .send(payload)
            .expect(200);

        return { ...payload, productId: response.body.productId };
    };

    it('requires authentication to create products', async () => {
        await request(app).post('/api/products').send({}).expect(401);
    });

    it('requires admin role to create products', async () => {
        const { token } = await registerAndLoginUser({
            fullName: 'Customer',
            email: 'customer@example.com',
            password: 'password123',
        });

        await request(app)
            .post('/api/products')
            .set(authHeader(token))
            .send({
                name: 'Customer Product',
                description: 'Should fail',
                category: 'test',
                price: 5,
            })
            .expect(403);
    });

    it('creates, reads, updates, and deletes products as admin', async () => {
        const { productId } = await createProduct();

        const getById = await request(app)
            .get(`/api/products/${productId}`)
            .set(authHeader(adminToken))
            .expect(200);

        expect(getById.body.name).toBe('Test Product');

        await request(app)
            .patch(`/api/products/${productId}`)
            .set(authHeader(adminToken))
            .send({ price: 20 })
            .expect(200);

        const updated = await request(app)
            .get(`/api/products/${productId}`)
            .set(authHeader(adminToken))
            .expect(200);

        expect(updated.body.price).toBe(20);

        await request(app)
            .delete(`/api/products/${productId}`)
            .set(authHeader(adminToken))
            .expect(200);

        await request(app)
            .get(`/api/products/${productId}`)
            .set(authHeader(adminToken))
            .expect(404);
    });

    it('enforces unique product names', async () => {
        await createProduct({ name: 'Unique Product' });

        const duplicate = await request(app)
            .post('/api/products')
            .set(authHeader(adminToken))
            .send({
                name: 'Unique Product',
                description: 'Duplicate',
                category: 'test',
                price: 5,
            })
            .expect(400);

        expect(duplicate.body.message).toBe('Product name must be unique');
    });

    it('requires valid product identifiers', async () => {
        await request(app)
            .get('/api/products/not-an-id')
            .set(authHeader(adminToken))
            .expect(400);
    });

    it('requires authentication for product detail routes', async () => {
        const { productId, name } = await createProduct();

        await request(app).get(`/api/products/${productId}`).expect(401);
        await request(app).get(`/api/products/name/${name}`).expect(401);
    });

    it('searches products with filters, sorting, and pagination', async () => {
        const products = [
            { name: 'Alpha Phone', description: 'Smart device', category: 'electronics', price: 799 },
            { name: 'Beta Tablet', description: 'Tablet device', category: 'electronics', price: 499 },
            { name: 'Gamma Blender', description: 'Kitchen appliance', category: 'kitchen', price: 99 },
            { name: 'Delta Toaster', description: 'Kitchen appliance', category: 'kitchen', price: 49 },
            { name: 'Epsilon Chair', description: 'Furniture item', category: 'furniture', price: 120 },
        ];

        for (const product of products) {
            await createProduct(product);
        }

        const keywordResponse = await request(app)
            .get('/api/products')
            .query({ keywords: 'device' })
            .expect(200);

        expect(keywordResponse.body.items).toHaveLength(2);

        const categoryResponse = await request(app)
            .get('/api/products')
            .query({ category: 'kitchen' })
            .expect(200);

        expect(categoryResponse.body.items.every((item) => item.category.toLowerCase() === 'kitchen')).toBe(true);

        const priceResponse = await request(app)
            .get('/api/products')
            .query({ minPrice: 100, maxPrice: 500 })
            .expect(200);

        expect(priceResponse.body.items.every((item) => item.price >= 100 && item.price <= 500)).toBe(true);

        const lowestPriceResponse = await request(app)
            .get('/api/products')
            .query({ sortBy: 'lowestPrice' })
            .expect(200);

        const prices = lowestPriceResponse.body.items.map((item) => item.price);
        const sortedPrices = [...prices].sort((a, b) => a - b);
        expect(prices).toEqual(sortedPrices);

        const newestResponse = await request(app)
            .get('/api/products')
            .query({ sortBy: 'newest', pageSize: 2, pageNumber: 2 })
            .expect(200);

        expect(newestResponse.body.pageSize).toBe(2);
        expect(newestResponse.body.pageNumber).toBe(2);
        expect(newestResponse.body.items).toHaveLength(2);
    });
});

