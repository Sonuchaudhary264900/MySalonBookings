// scripts/seed.js
/*
  Database Seeding Script
  Populate database with test data for development/testing
  
  Run with: node scripts/seed.js
*/

const mongoose = require('mongoose');
const dotenv = require('dotenv');
const bcrypt = require('bcryptjs');

dotenv.config();

// Import models
const Owner = require('../models/Owner');
const Customer = require('../models/Customer');
const Business = require('../models/Business');
const Service = require('../models/Service');
const Barber = require('../models/Barber');
const Admin = require('../models/Admin');

const TEST_DATA = {
  owners: [
    {
      phone: '+919876543210',
      email: 'owner1@salon.com',
      password: 'Password@123',
      name: 'Raj Kumar',
      status: 'approved',
      approvalStatus: 'approved',
    },
    {
      phone: '+919876543211',
      email: 'owner2@salon.com',
      password: 'Password@123',
      name: 'Priya Singh',
      status: 'approved',
      approvalStatus: 'approved',
    },
  ],

  customers: [
    {
      phone: '+919876543220',
      email: 'customer1@gmail.com',
      password: 'Password@123',
      name: 'Amit',
      gender: 'male',
      totalBookings: 5,
      loyaltyPoints: 500,
    },
    {
      phone: '+919876543221',
      email: 'customer2@gmail.com',
      password: 'Password@123',
      name: 'Neha',
      gender: 'female',
      totalBookings: 3,
      loyaltyPoints: 300,
    },
    {
      phone: '+919876543222',
      email: 'customer3@gmail.com',
      password: 'Password@123',
      name: 'Arjun',
      gender: 'male',
      totalBookings: 0,
      loyaltyPoints: 0,
    },
  ],

  salons: [
    {
      name: 'Premium Hair Studio',
      phone: '+919876543210',
      email: 'studio@salon.com',
      address: '123 Main Street',
      city: 'Bangalore',
      state: 'Karnataka',
      pincode: '560001',
      location: {
        type: 'Point',
        coordinates: [77.5946, 12.9716], // Bangalore
      },
      description: 'Premium salon with experienced barbers',
      photos: [
        'https://images.unsplash.com/photo-1622296313842-8b70c3fcf26c?w=400',
      ],
      isApproved: true,
      approvalStatus: 'approved',
    },
    {
      name: 'Elegant Looks Salon',
      phone: '+919876543211',
      email: 'looks@salon.com',
      address: '456 Park Avenue',
      city: 'Mumbai',
      state: 'Maharashtra',
      pincode: '400001',
      location: {
        type: 'Point',
        coordinates: [72.8479, 19.0176], // Mumbai
      },
      description: 'Elegant salon for men and women',
      photos: [
        'https://images.unsplash.com/photo-1633081924794-4a41a3ff0e1f?w=400',
      ],
      isApproved: true,
      approvalStatus: 'approved',
    },
  ],

  services: [
    {
      name: 'Haircut',
      category: 'haircut',
      basePrice: 300,
      duration: 30,
      applicableFor: ['male', 'female'],
    },
    {
      name: 'Beard Trim',
      category: 'beard_trim',
      basePrice: 150,
      duration: 20,
      applicableFor: ['male'],
    },
    {
      name: 'Hair Coloring',
      category: 'coloring',
      basePrice: 800,
      duration: 60,
      applicableFor: ['male', 'female'],
    },
    {
      name: 'Hair Treatment',
      category: 'treatment',
      basePrice: 500,
      duration: 45,
      applicableFor: ['male', 'female'],
    },
  ],

  barbers: [
    {
      name: 'Rajesh',
      phone: '+919876543250',
      email: 'rajesh@salon.com',
      gender: 'male',
      experience: 10,
      specializations: ['haircut', 'beard_trim'],
      workingDays: ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'],
      shiftStart: '09:00',
      shiftEnd: '18:00',
    },
    {
      name: 'Priyanka',
      phone: '+919876543251',
      email: 'priyanka@salon.com',
      gender: 'female',
      experience: 8,
      specializations: ['haircut', 'coloring', 'treatment'],
      workingDays: ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'],
      shiftStart: '10:00',
      shiftEnd: '19:00',
    },
  ],

  admin: {
    name: 'Admin User',
    email: 'admin@barbershop.com',
    phone: '+919876543260',
    password: 'Admin@123',
    role: 'super_admin',
    permissions: ['approve_salons', 'view_reports', 'manage_users'],
  },
};

async function seedDatabase() {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to MongoDB');

    // Clear existing data
    console.log('🗑️  Clearing existing data...');
    await Promise.all([
      Owner.deleteMany({}),
      Customer.deleteMany({}),
      Business.deleteMany({}),
      Service.deleteMany({}),
      Barber.deleteMany({}),
      Admin.deleteMany({}),
    ]);
    console.log('✅ Data cleared');

    // Seed Owners
    console.log('👨‍💼 Seeding owners...');
    const owners = await Owner.create(
      TEST_DATA.owners.map((owner) => ({
        ...owner,
        phoneVerified: true,
        emailVerified: true,
      }))
    );
    console.log(`✅ Created ${owners.length} owners`);

    // Seed Customers
    console.log('👥 Seeding customers...');
    const customers = await Customer.create(
      TEST_DATA.customers.map((customer) => ({
        ...customer,
        phoneVerified: true,
        emailVerified: true,
      }))
    );
    console.log(`✅ Created ${customers.length} customers`);

    // Seed Salons
    console.log('🏪 Seeding salons...');
    const salons = await Business.create(
      TEST_DATA.salons.map((salon, index) => ({
        ...salon,
        ownerId: owners[index]._id,
      }))
    );
    console.log(`✅ Created ${salons.length} salons`);

    // Seed Services
    console.log('✂️  Seeding services...');
    const services = await Service.create(
      TEST_DATA.services.map((service) => ({
        ...service,
        salonId: salons[0]._id, // All services for first salon
      }))
    );
    console.log(`✅ Created ${services.length} services`);

    // Seed Barbers
    console.log('💈 Seeding barbers...');
    const barbers = await Barber.create(
      TEST_DATA.barbers.map((barber) => ({
        ...barber,
        salonId: salons[0]._id,
        servicesOffered: services.map((s) => s._id),
      }))
    );
    console.log(`✅ Created ${barbers.length} barbers`);

    // Update salons with services and barbers
    await Business.findByIdAndUpdate(salons[0]._id, {
      services: services.map((s) => s._id),
      barbers: barbers.map((b) => b._id),
      totalBarbers: barbers.length,
    });

    // Seed Admin
    console.log('🔐 Seeding admin...');
    const admin = await Admin.create(TEST_DATA.admin);
    console.log(`✅ Created 1 admin user`);

    // Update owners with salon IDs
    await Owner.findByIdAndUpdate(owners[0]._id, {
      businessId: salons[0]._id,
      status: 'approved',
    });

    console.log('\n═══════════════════════════════════════════════');
    console.log('✅ DATABASE SEEDING COMPLETE!');
    console.log('═══════════════════════════════════════════════\n');

    console.log('📋 TEST CREDENTIALS:\n');
    console.log('OWNER:');
    console.log(`  Phone: ${TEST_DATA.owners[0].phone}`);
    console.log(`  Password: ${TEST_DATA.owners[0].password}\n`);

    console.log('CUSTOMER:');
    console.log(`  Phone: ${TEST_DATA.customers[0].phone}`);
    console.log(`  Password: ${TEST_DATA.customers[0].password}\n`);

    console.log('ADMIN:');
    console.log(`  Email: ${TEST_DATA.admin.email}`);
    console.log(`  Password: ${TEST_DATA.admin.password}\n`);

    process.exit(0);
  } catch (error) {
    console.error('❌ Error seeding database:', error);
    process.exit(1);
  }
}

seedDatabase();
