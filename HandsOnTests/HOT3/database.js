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

    await Promise.all([
        db.collection('products').createIndex(
            { name: 1 },
            { unique: true, collation: { locale: 'en', strength: 2 } }
        ),
        db.collection('user').createIndex(
            { email: 1 },
            { unique: true, collation: { locale: 'en', strength: 2 } }
        ),
        db.collection('session').createIndex({ token: 1 }, { unique: true }),
    ]);

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
    if (minPrice !== undefined) {
        filter.price = { ...filter.price, $gte: minPrice };
    }

    if (maxPrice !== undefined) {
        filter.price = { ...filter.price, $lte: maxPrice };
    }

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
