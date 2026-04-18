/**
 * dropDatabase.js
 *
 * Drops every collection in the database — all data is permanently deleted.
 * Indexes are recreated automatically by Mongoose on the next server start.
 *
 * Usage:
 *   node scripts/dropDatabase.js
 *
 * You must confirm by typing "DROP" when prompted.
 */

require('dotenv').config();
const mongoose = require('mongoose');
const readline = require('readline');

const COLLECTIONS = [
  'admins',
  'barbers',
  'bookings',
  'businesses',    // NOTE: Business model uses collection name 'salons'
  'salons',
  'businessmedias',
  'coupons',
  'customers',
  'messages',
  'notificationcampaigns',
  'notificationsettings',
  'otps',
  'owners',
  'packages',
  'promotions',
  'promotionpricings',
  'queues',
  'reelcomments',
  'reelinteractions',
  'reellikes',
  'reelviews',
  'reviews',
  'services',
  'sitesettings',
  'subscriptions',
  'subscriptionlogs',
  'transactions',
  'userpackages',
];

async function confirm(question) {
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  return new Promise(resolve => {
    rl.question(question, answer => {
      rl.close();
      resolve(answer.trim());
    });
  });
}

async function run() {
  if (!process.env.MONGODB_URI) {
    console.error('❌  MONGODB_URI is not set. Add it to your .env file.');
    process.exit(1);
  }

  console.log('\n⚠️  WARNING: This will permanently delete ALL data in the database.');
  console.log(`📂  Target: ${process.env.MONGODB_URI.replace(/:([^:@]+)@/, ':****@')}\n`);

  const answer = await confirm('Type "DROP" to confirm, anything else to cancel: ');
  if (answer !== 'DROP') {
    console.log('✅  Cancelled — nothing was deleted.');
    process.exit(0);
  }

  console.log('\n🔌  Connecting to MongoDB...');
  await mongoose.connect(process.env.MONGODB_URI);
  const db = mongoose.connection.db;
  console.log(`✅  Connected: ${db.databaseName}\n`);

  // Get the actual collections that exist in the database right now
  const existing = (await db.listCollections().toArray()).map(c => c.name);

  let dropped = 0;
  let skipped = 0;

  for (const name of COLLECTIONS) {
    if (existing.includes(name)) {
      await db.dropCollection(name);
      console.log(`  🗑  Dropped: ${name}`);
      dropped++;
    } else {
      console.log(`  –  Skipped (not found): ${name}`);
      skipped++;
    }
  }

  console.log(`\n✅  Done — ${dropped} collection(s) dropped, ${skipped} skipped.`);
  console.log('ℹ️  Indexes will be recreated automatically on the next server start.\n');

  await mongoose.disconnect();
  process.exit(0);
}

run().catch(err => {
  console.error('❌  Unexpected error:', err.message);
  process.exit(1);
});
