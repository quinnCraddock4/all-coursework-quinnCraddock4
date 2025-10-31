import { betterAuth } from 'better-auth';
import { bearer } from 'better-auth/plugins';
import { mongodbAdapter } from 'better-auth/adapters/mongodb';

import { connect, getDb, ObjectId } from '../database.js';

const createAuthInstance = async () => {
    const { db, client } = await connect();

    return betterAuth({
        database: mongodbAdapter(db, { client }),
        emailAndPassword: {
            enabled: true,
            autoSignIn: false,
        },
        user: {
            additionalFields: {
                fullName: {
                    type: 'string',
                    required: true,
                },
                roles: {
                    type: 'json',
                    required: false,
                    defaultValue: ['customer'],
                    input: false,
                },
            },
        },
        plugins: [bearer()],
    });
};

export let auth = await createAuthInstance();

export const refreshAuth = async () => {
    auth = await createAuthInstance();
    return auth;
};

export const ensureAdminUser = async () => {
    const adminEmail = 'eagudmestad@ranken.edu'.toLowerCase();
    const usersCollection = (await getDb()).collection('user');

    const existingAdmin = await usersCollection.findOne({ email: adminEmail });
    if (existingAdmin) {
        const roles = Array.isArray(existingAdmin.roles)
            ? existingAdmin.roles
            : typeof existingAdmin.roles === 'string'
                ? [existingAdmin.roles]
                : [];

        if (!roles.includes('admin')) {
            await usersCollection.updateOne(
                { _id: existingAdmin._id },
                {
                    $set: {
                        roles: ['admin'],
                        fullName: existingAdmin.fullName ?? existingAdmin.name ?? 'Admin User',
                        name: existingAdmin.fullName ?? existingAdmin.name ?? 'Admin User',
                        updatedAt: new Date(),
                    },
                }
            );
        }
        return;
    }

    try {
        const result = await auth.api.signUpEmail({
            body: {
                email: adminEmail,
                password: '123456789',
                name: 'Admin User',
                fullName: 'Admin User',
            },
        });

        const userId = result.user?.id;
        if (userId) {
            await usersCollection.updateOne(
                { _id: new ObjectId(userId) },
                {
                    $set: {
                        roles: ['admin'],
                        fullName: 'Admin User',
                        name: 'Admin User',
                        updatedAt: new Date(),
                    },
                }
            );
        }
    } catch (err) {
        // If another process created the admin simultaneously, ignore duplicate errors.
        if (err?.code !== 'EMAIL_ALREADY_IN_USE') {
            throw err;
        }
    }
};


