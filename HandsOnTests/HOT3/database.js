import { MongoClient, ObjectId } from 'mongodb';
import dotenv from 'dotenv';

dotenv.config();

const mongoUri = process.env.DB_URL;
const databaseName = process.env.DB_NAME;

const connect = async () => {
    const client = new MongoClient(mongoUri);
    await client.connect();
    const db = client.db(databaseName);
    return { client, db };
};

export const findAllProducts = async () => {
    const { client, db } = await connect();
    try {
        const products = await db.collection('products').find({}).toArray();
        return products;
    } finally {
        await client.close();
    }
};

export const findProductById = async (productId) => {
    const { client, db } = await connect();
    try {
        const _id = new ObjectId(productId);
        const product = await db.collection('products').findOne({ _id });
        return product;
    } catch (err) {
        return null;
    } finally {
        await client.close();
    }
};

export const findProductByName = async (productName) => {
    const { client, db } = await connect();
    try {
        const product = await db.collection('products').findOne({ name: productName });
        return product;
    } finally {
        await client.close();
    }
};

export const insertProduct = async (product) => {
    const { client, db } = await connect();
    try {
        const now = new Date();
        const doc = { ...product, createdOn: now, lastUpdatedOn: now };
        const result = await db.collection('products').insertOne(doc);
        return { ...doc, _id: result.insertedId };
    } finally {
        await client.close();
    }
};

export const updateProduct = async (productId, fieldsToUpdate) => {
    const { client, db } = await connect();
    try {
        const _id = new ObjectId(productId);
        const update = { $set: { ...fieldsToUpdate, lastUpdatedOn: new Date() } };
        const result = await db.collection('products').findOneAndUpdate(
            { _id },
            update,
            { returnDocument: 'after' }
        );
        return result.value;
    } catch (err) {
        return null;
    } finally {
        await client.close();
    }
};

export const deleteProduct = async (productId) => {
    const { client, db } = await connect();
    try {
        const _id = new ObjectId(productId);
        const result = await db.collection('products').deleteOne({ _id });
        return result.deletedCount === 1;
    } catch (err) {
        return false;
    } finally {
        await client.close();
    }
};


