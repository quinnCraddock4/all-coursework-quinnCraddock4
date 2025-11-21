import dotenv from 'dotenv';
import { insertProduct, getDb, closeDatabase } from '../database.js';
import { ensureAdminUser, refreshAuth, auth } from '../auth/index.js';

dotenv.config();

const sampleProducts = [
    // Electronics
    {
        name: 'Smartphone Pro Max',
        description: 'Latest flagship smartphone with advanced camera and 5G connectivity',
        category: 'Electronics',
        price: 999.99,
    },
    {
        name: 'Wireless Bluetooth Headphones',
        description: 'Premium noise-cancelling headphones with 30-hour battery life',
        category: 'Electronics',
        price: 249.99,
    },
    {
        name: '4K Smart TV 55 inch',
        description: 'Ultra HD television with built-in streaming apps and voice control',
        category: 'Electronics',
        price: 699.99,
    },
    {
        name: 'Gaming Laptop',
        description: 'High-performance laptop with RTX graphics card for gaming and content creation',
        category: 'Electronics',
        price: 1499.99,
    },
    {
        name: 'Smart Watch',
        description: 'Fitness tracker with heart rate monitor and GPS',
        category: 'Electronics',
        price: 199.99,
    },
    
    // Kitchen
    {
        name: 'Stainless Steel Blender',
        description: 'Professional-grade blender with 1500W motor and multiple speed settings',
        category: 'kitchen',
        price: 129.99,
    },
    {
        name: 'Coffee Maker Deluxe',
        description: 'Programmable coffee maker with thermal carafe and timer',
        category: 'kitchen',
        price: 89.99,
    },
    {
        name: 'Air Fryer XL',
        description: 'Large capacity air fryer for healthy cooking with digital controls',
        category: 'kitchen',
        price: 149.99,
    },
    {
        name: 'Stand Mixer',
        description: 'Heavy-duty stand mixer with multiple attachments for baking',
        category: 'kitchen',
        price: 299.99,
    },
    {
        name: 'Non-Stick Cookware Set',
        description: '10-piece cookware set with ceramic non-stick coating',
        category: 'kitchen',
        price: 179.99,
    },
    
    // Furniture
    {
        name: 'Modern Sofa',
        description: 'Comfortable 3-seater sofa with memory foam cushions',
        category: 'furniture',
        price: 599.99,
    },
    {
        name: 'Office Desk',
        description: 'Large wooden desk with drawers and cable management',
        category: 'furniture',
        price: 349.99,
    },
    {
        name: 'Dining Table Set',
        description: '6-person dining set with table and matching chairs',
        category: 'furniture',
        price: 799.99,
    },
    {
        name: 'Bed Frame Queen',
        description: 'Upholstered bed frame with storage drawers underneath',
        category: 'furniture',
        price: 449.99,
    },
    {
        name: 'Bookshelf',
        description: '5-tier bookshelf with adjustable shelves',
        category: 'furniture',
        price: 129.99,
    },
    
    // Clothing
    {
        name: 'Cotton T-Shirt',
        description: 'Comfortable 100% cotton t-shirt in various colors',
        category: 'clothing',
        price: 19.99,
    },
    {
        name: 'Denim Jeans',
        description: 'Classic fit jeans with stretch for comfort',
        category: 'clothing',
        price: 49.99,
    },
    {
        name: 'Winter Jacket',
        description: 'Waterproof winter jacket with insulated lining',
        category: 'clothing',
        price: 129.99,
    },
    {
        name: 'Running Shoes',
        description: 'Lightweight running shoes with cushioned sole',
        category: 'clothing',
        price: 89.99,
    },
    {
        name: 'Baseball Cap',
        description: 'Adjustable cap with embroidered logo',
        category: 'clothing',
        price: 24.99,
    },
    
    // Sports & Outdoors
    {
        name: 'Yoga Mat',
        description: 'Non-slip yoga mat with carrying strap',
        category: 'sports',
        price: 29.99,
    },
    {
        name: 'Basketball',
        description: 'Official size basketball for indoor and outdoor use',
        category: 'sports',
        price: 39.99,
    },
    {
        name: 'Tennis Racket',
        description: 'Professional tennis racket with graphite frame',
        category: 'sports',
        price: 149.99,
    },
    {
        name: 'Camping Tent',
        description: '4-person tent with waterproof coating',
        category: 'sports',
        price: 199.99,
    },
    {
        name: 'Hiking Backpack',
        description: '30L backpack with hydration system and multiple compartments',
        category: 'sports',
        price: 79.99,
    },
];

const testUsers = [
    {
        fullName: 'Admin User',
        email: 'eagudmestad@ranken.edu',
        password: '123456789',
        roles: ['admin'],
    },
    {
        fullName: 'John Customer',
        email: 'john.customer@example.com',
        password: 'password123',
        roles: ['customer'],
    },
    {
        fullName: 'Jane Customer',
        email: 'jane.customer@example.com',
        password: 'password123',
        roles: ['customer'],
    },
    {
        fullName: 'Bob Customer',
        email: 'bob.customer@example.com',
        password: 'password123',
        roles: ['customer'],
    },
];

const setupDatabase = async () => {
    try {
        console.log('🚀 Setting up database for manual testing...\n');
        
        // Initialize database connection
        console.log('📦 Connecting to database...');
        const db = await getDb();
        await refreshAuth();
        
        // Ensure admin user exists
        console.log('👤 Setting up admin user...');
        await ensureAdminUser();
        console.log('   ✓ Admin user ready: eagudmestad@ranken.edu / 123456789\n');
        
        // Create test users
        console.log('👥 Creating test users...');
        let usersCreated = 0;
        let usersSkipped = 0;
        let usersUpdated = 0;
        
        const userCollection = db.collection('user');
        
        for (const userData of testUsers) {
            try {
                // Check if user already exists
                const existingUser = await userCollection.findOne({ email: userData.email });
                
                if (existingUser) {
                    // Update roles and fullName if needed
                    const roles = Array.isArray(existingUser.roles) 
                        ? existingUser.roles 
                        : typeof existingUser.roles === 'string' 
                        ? [existingUser.roles] 
                        : [];
                    
                    const needsUpdate = 
                        !roles.includes(userData.roles[0]) || 
                        existingUser.fullName !== userData.fullName ||
                        existingUser.name !== userData.fullName;
                    
                    if (needsUpdate) {
                        await userCollection.updateOne(
                            { _id: existingUser._id },
                            { 
                                $set: { 
                                    roles: userData.roles, 
                                    fullName: userData.fullName,
                                    name: userData.fullName,
                                    updatedAt: new Date(),
                                } 
                            }
                        );
                        usersUpdated++;
                        console.log(`   ↻ Updated: ${userData.email} (${userData.roles.join(', ')})`);
                    } else {
                        usersSkipped++;
                        console.log(`   ⊘ Skipped (exists): ${userData.email}`);
                    }
                } else {
                    // Create new user
                    await auth.api.signUpEmail({
                        body: {
                            email: userData.email,
                            password: userData.password,
                            name: userData.fullName,
                            fullName: userData.fullName,
                        },
                    });
                    
                    // Set roles
                    const newUser = await userCollection.findOne({ email: userData.email });
                    if (newUser) {
                        await userCollection.updateOne(
                            { _id: newUser._id },
                            { $set: { roles: userData.roles } }
                        );
                    }
                    
                    usersCreated++;
                    console.log(`   ✓ Created: ${userData.email} (${userData.roles.join(', ')})`);
                }
            } catch (err) {
                if (err?.message?.includes('already exists') || err?.code === 'EMAIL_ALREADY_IN_USE') {
                    usersSkipped++;
                    console.log(`   ⊘ Skipped (exists): ${userData.email}`);
                } else {
                    console.error(`   ✗ Error creating ${userData.email}:`, err.message);
                }
            }
        }
        
        console.log(`\n   Summary: ${usersCreated} created, ${usersUpdated} updated, ${usersSkipped} skipped\n`);
        
        // Seed products
        console.log('📦 Seeding products...');
        let productsCreated = 0;
        let productsSkipped = 0;
        
        for (const product of sampleProducts) {
            try {
                await insertProduct(product);
                productsCreated++;
                console.log(`   ✓ Added: ${product.name} ($${product.price})`);
            } catch (err) {
                if (err.code === 11000) {
                    productsSkipped++;
                    console.log(`   ⊘ Skipped (exists): ${product.name}`);
                } else {
                    console.error(`   ✗ Error adding ${product.name}:`, err.message);
                }
            }
        }
        
        console.log(`\n   Summary: ${productsCreated} created, ${productsSkipped} skipped\n`);
        
        // Display summary
        const userCount = await db.collection('user').countDocuments();
        const productCount = await db.collection('products').countDocuments();
        const categories = await db.collection('products').distinct('category');
        
        console.log('📊 Database Summary:');
        console.log(`   Users: ${userCount}`);
        console.log(`   Products: ${productCount}`);
        console.log(`   Categories: ${categories.sort().join(', ')}\n`);
        
        console.log('✅ Database setup complete!\n');
        console.log('🔑 Test Credentials:');
        console.log('   Admin:');
        console.log('     Email: eagudmestad@ranken.edu');
        console.log('     Password: 123456789');
        console.log('   Customers:');
        console.log('     Email: john.customer@example.com');
        console.log('     Password: password123');
        console.log('     (Same for jane.customer@example.com and bob.customer@example.com)\n');
        
    } catch (err) {
        console.error('❌ Error setting up database:', err);
        process.exit(1);
    } finally {
        await closeDatabase();
    }
};

setupDatabase();

