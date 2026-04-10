// create-tenant.js - Run this once to create a test tenant
const mongoose = require('mongoose');
const crypto = require('crypto');
require('dotenv').config();

const createTenant = async () => {
    try {
        console.log('🔄 Connecting to MongoDB...');
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('✅ MongoDB Connected');

        // Check if tenant already exists
        const existingTenant = await mongoose.connection.collection('tenants').findOne({ url: 'localhost' });

        if (existingTenant) {
            console.log('⚠️ Tenant with url "localhost" already exists:');
            console.log(JSON.stringify(existingTenant, null, 2));
            process.exit(0);
        }

        // Create new tenant
        const tenantId = crypto.randomUUID();
        const tenant = {
            id: tenantId,
            name: 'Test Tenant',
            url: 'localhost',
            domain: 'localhost',
            isActive: true,
            settings: {
                allowRegistration: true,
                maxUsers: 100
            },
            createdAt: new Date(),
            updatedAt: new Date()
        };

        const result = await mongoose.connection.collection('tenants').insertOne(tenant);

        console.log('✅ Tenant created successfully!');
        console.log('📋 Tenant Details:');
        console.log(JSON.stringify(tenant, null, 2));
        console.log('\n📝 Use these for testing:');
        console.log('   - Tenant URL: "localhost"');
        console.log('   - Tenant ID: "' + tenantId + '"');

    } catch (error) {
        console.error('❌ Error creating tenant:', error.message);
    } finally {
        await mongoose.connection.close();
        process.exit(0);
    }
};

createTenant();