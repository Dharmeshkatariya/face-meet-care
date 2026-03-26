const mongoose = require('mongoose');
require('dotenv').config();

const Tenant = require('./models/Tenant');
const FeatureSwitch = require('./models/FeatureSwitch');
const User = require('./models/User');

const seedData = async () => {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('Connected to MongoDB');

        // Clear existing data
        await Tenant.deleteMany({});
        await FeatureSwitch.deleteMany({});
        await User.deleteMany({});

        // Create tenant
        const tenant = await Tenant.create({
            url: 'test-pulsedev.helixbeat.com',
            name: 'JKM6',
            country: 'IN',
            brand_color: '#008BCC',
            login_method: 'password',
            language: 'en',
            service_name: 'tenant',
            plan_name: 'Internal',
            plan_code: 'INTERNAL',
            tier_name: 'Medium',
            tier_code: 'MEDIUM',
            timezone: 'Asia/Kolkata',
            service_mode: 'COLLABORATIVE'
        });

        console.log('✅ Tenant created:', tenant.url);

        // Create feature switches
        const features = [
            { id: 30, name: 'recaptcha', active: false },
            { id: 14, name: 'mfa', active: false },
            { id: 1, name: 'audit', active: false },
            { id: 32, name: 'process_notifications_via_kafka', active: true },
            { id: 31, name: 'encrypt_password', active: true },
            { id: 13, name: 'silk_perf', active: false },
            { id: 12, name: 'search_insurance_plans', active: false },
            { id: 11, name: 'send_sms_via_v2_api', active: true },
            { id: 10, name: 'full_account_passwordless_login', active: true },
            { id: 3, name: 'show_card_info', active: true }
        ];

        for (const feature of features) {
            await FeatureSwitch.create({
                ...feature,
                tenant_id: tenant.id
            });
        }

        console.log('✅ Feature switches created');

        // Create test user
        const user = await User.create({
            email: 'pankaj@yopmail.com',
            username: 'pankaj@yopmail.com',
            password: 'test123',
            first_name: 'Pankaj',
            last_name: 'Ahir',
            name: 'Pankaj Ahir',
            tenant_id: tenant.id,
            auth_user_id: '58777751-0d31-4cb2-9ba3-c3191bce82fd'
        });

        console.log('✅ Test user created:', user.email);

        console.log('\n🎉 Seed completed successfully!');
        console.log('\n📝 Test Login Credentials:');
        console.log('Email: pankaj@yopmail.com');
        console.log('Password: test123');
        console.log('\n🌐 API URL: http://localhost:3000/api/v1');

        process.exit(0);

    } catch (error) {
        console.error('❌ Seed error:', error);
        process.exit(1);
    }
};

seedData();