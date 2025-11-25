import { MongoClient, ObjectId } from 'mongodb';
import dotenv from 'dotenv';

dotenv.config();

const mongoUri = process.env.DB_URL;
const databaseName = process.env.DB_NAME;

if (!mongoUri) {
    throw new Error('DB_URL environment variable is required');
}

if (!databaseName) {
    throw new Error('DB_NAME environment variable is required');
}

let cachedClient;
let cachedDb;
let indexesEnsured = false;

const ensureIndexes = async (db) => {
    if (indexesEnsured) {
        return;
    }

    // Helper to safely get indexes (returns empty array if collection doesn't exist)
    const getIndexesSafely = async (collection) => {
        try {
            return await collection.indexes();
        } catch (err) {
            // Collection doesn't exist yet
            return [];
        }
    };

    // Products name index - handle this first since it might be blocking cleanup
    const productsCollection = db.collection('products');
    const existingProductsIndexes = await getIndexesSafely(productsCollection);
    const nameIndex = existingProductsIndexes.find(
        (idx) => idx.key?.name === 1
    );
    
    // Drop existing name index if it exists (must do this BEFORE cleaning up duplicates)
    if (nameIndex) {
        try {
            await productsCollection.dropIndex(nameIndex.name);
        } catch (err) {
            // Index might not exist or already dropped, continue anyway
        }
    }

    // Now clean up any products with null or empty names (after dropping index)
    try {
        await productsCollection.deleteMany({
            $or: [
                { name: null },
                { name: '' },
                { name: { $exists: false } },
            ],
        });
    } catch (err) {
        // Collection might not exist yet, which is fine
    }

    // Try to create indexes, handling errors gracefully
    const indexPromises = [];
    
    // Create the products name index (after cleaning up null products)
    indexPromises.push(
        productsCollection.createIndex(
            { name: 1 },
            { unique: true, collation: { locale: 'en', strength: 2 } }
        ).catch((err) => {
            // If still fails, log but don't crash - index might already exist from another process
            if (err.code !== 85) { // 85 = IndexOptionsConflict (index already exists)
                console.warn('Warning: Could not create products name index:', err.message);
            }
        })
    );

    // User email index
    const userCollection = db.collection('user');
    const userIndexes = await getIndexesSafely(userCollection);
    const hasUserEmailIndex = userIndexes.some(
        (idx) => idx.name === 'email_1' || (idx.key?.email === 1 && idx.unique)
    );
    if (!hasUserEmailIndex) {
        indexPromises.push(
            userCollection.createIndex(
                { email: 1 },
                { unique: true, collation: { locale: 'en', strength: 2 } }
            )
        );
    }

    // Session token index
    const sessionCollection = db.collection('session');
    const sessionIndexes = await getIndexesSafely(sessionCollection);
    const hasSessionTokenIndex = sessionIndexes.some(
        (idx) => idx.name === 'token_1' || (idx.key?.token === 1 && idx.unique)
    );
    if (!hasSessionTokenIndex) {
        indexPromises.push(
            sessionCollection.createIndex({ token: 1 }, { unique: true })
        );
    }

    await Promise.all(indexPromises);

    indexesEnsured = true;
};

export const connect = async () => {
    if (cachedDb) {
        return { client: cachedClient, db: cachedDb };
    }

    const client = new MongoClient(mongoUri);
    await client.connect();

    cachedClient = client;
    cachedDb = client.db(databaseName);

    await ensureIndexes(cachedDb);

    return { client: cachedClient, db: cachedDb };
};

export const getDb = async () => {
    const { db } = await connect();
    return db;
};

const sanitizeUser = (user) => {
    if (!user) {
        return null;
    }

    const id = user._id ? user._id.toString() : user.id ?? null;
    const rolesSource = user.roles;
    const roles = Array.isArray(rolesSource)
        ? rolesSource
        : typeof rolesSource === 'string'
            ? [rolesSource]
            : Array.isArray(rolesSource?.values)
                ? rolesSource.values
                : [];

    return {
        _id: id,
        id,
        fullName: user.fullName ?? user.name ?? '',
        email: user.email,
        roles: roles.length ? roles : ['customer'],
        createdOn: user.createdOn ?? user.createdAt ?? null,
        lastUpdatedOn: user.lastUpdatedOn ?? user.updatedAt ?? null,
    };
};

const buildProductSort = (sortBy) => {
    switch (sortBy) {
        case 'category':
            return { category: 1, name: 1 };
        case 'lowestPrice':
            return { price: 1, name: 1 };
        case 'newest':
            return { createdOn: -1, name: 1 };
        case 'name':
        default:
            return { name: 1 };
    }
};

const applyPriceFilters = (filter, minPrice, maxPrice) => {
    // Convert to numbers and filter out invalid values
    const min = minPrice !== undefined && minPrice !== null && minPrice !== '' 
        ? Number(minPrice) 
        : undefined;
    const max = maxPrice !== undefined && maxPrice !== null && maxPrice !== '' 
        ? Number(maxPrice) 
        : undefined;

    // Only apply filters if we have valid numbers
    if (min !== undefined && !isNaN(min)) {
        if (!filter.price) {
            filter.price = {};
        }
        filter.price.$gte = min;
    }

    if (max !== undefined && !isNaN(max)) {
        if (!filter.price) {
            filter.price = {};
        }
        filter.price.$lte = max;
    }

    // Clean up empty price filter
    if (filter.price && Object.keys(filter.price).length === 0) {
        delete filter.price;
    }
};

export const initializeDatabase = async () => {
    await getDb();
};

export const closeDatabase = async () => {
    if (cachedClient) {
        await cachedClient.close();
        cachedClient = undefined;
        cachedDb = undefined;
        indexesEnsured = false;
    }
};

export const findAllProducts = async () => {
    const db = await getDb();
    return db.collection('products').find({}).toArray();
};

export const searchProducts = async ({
    keywords,
    category,
    minPrice,
    maxPrice,
    sortBy = 'name',
    pageSize = 5,
    pageNumber = 1,
}) => {
    const db = await getDb();
    const filter = {};

    if (keywords) {
        const escapedKeywords = keywords.trim();
        filter.$or = [
            { name: { $regex: escapedKeywords, $options: 'i' } },
            { description: { $regex: escapedKeywords, $options: 'i' } },
            { category: { $regex: escapedKeywords, $options: 'i' } },
        ];
    }

    if (category) {
        filter.category = { $regex: `^${category.trim()}$`, $options: 'i' };
    }

    applyPriceFilters(filter, minPrice, maxPrice);

    const sort = buildProductSort(sortBy);
    const limit = Math.max(1, Number(pageSize) || 5);
    const page = Math.max(1, Number(pageNumber) || 1);
    const skip = (page - 1) * limit;

    const cursor = db.collection('products').find(filter).sort(sort).skip(skip).limit(limit);
    const [items, total] = await Promise.all([
        cursor.toArray(),
        db.collection('products').countDocuments(filter),
    ]);

    return {
        items,
        total,
        pageSize: limit,
        pageNumber: page,
        totalPages: Math.ceil(total / limit) || 1,
    };
};

export const findProductById = async (productId) => {
    try {
        const db = await getDb();
        const _id = new ObjectId(productId);
        return await db.collection('products').findOne({ _id });
    } catch (err) {
        return null;
    }
};

export const findProductByName = async (productName) => {
    const db = await getDb();
    const decodedName = decodeURIComponent(productName).trim();

    const product = await db.collection('products').findOne({
        name: decodedName,
    });

    if (product) {
        return product;
    }

    return db.collection('products').findOne({
        name: { $regex: `^${decodedName}$`, $options: 'i' },
    });
};

export const insertProduct = async (product) => {
    const db = await getDb();
    const now = new Date();
    const doc = {
        ...product,
        createdOn: now,
        lastUpdatedOn: now,
    };

    const result = await db.collection('products').insertOne(doc);
    return { ...doc, _id: result.insertedId };
};

export const updateProduct = async (productId, fieldsToUpdate) => {
    const db = await getDb();
    const _id = new ObjectId(productId);

    const update = {
        $set: {
            ...fieldsToUpdate,
            lastUpdatedOn: new Date(),
        },
    };

    const result = await db.collection('products').findOneAndUpdate(
        { _id },
        update,
        { returnDocument: 'after', includeResultMetadata: true }
    );

    return result.value;
};

export const deleteProduct = async (productId) => {
    try {
        const db = await getDb();
        const _id = new ObjectId(productId);
        const result = await db.collection('products').deleteOne({ _id });
        return result.deletedCount === 1;
    } catch (err) {
        return false;
    }
};

export const findUserByEmail = async (email) => {
    const db = await getDb();
    const normalizedEmail = email.trim().toLowerCase();
    const user = await db.collection('user').findOne({ email: normalizedEmail });
    return sanitizeUser(user);
};

export const findUserById = async (userId) => {
    try {
        const db = await getDb();
        const _id = new ObjectId(userId);
        const user = await db.collection('user').findOne({ _id });
        return sanitizeUser(user);
    } catch (err) {
        return null;
    }
};

export const findAllUsers = async () => {
    const db = await getDb();
    const users = await db.collection('user').find({}).toArray();
    return users.map(sanitizeUser);
};

export const updateUserById = async (userId, updates) => {
    const db = await getDb();
    const _id = new ObjectId(userId);
    const sanitizedUpdates = { ...updates, updatedAt: new Date() };
    if (sanitizedUpdates.email) {
        sanitizedUpdates.email = sanitizedUpdates.email.trim().toLowerCase();
    }
    if (sanitizedUpdates.fullName) {
        sanitizedUpdates.name = sanitizedUpdates.fullName;
    }

    const result = await db.collection('user').findOneAndUpdate(
        { _id },
        { $set: sanitizedUpdates },
        { returnDocument: 'after', includeResultMetadata: true }
    );

    return sanitizeUser(result.value);
};

export { ObjectId };
