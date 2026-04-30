/**
 * Adds specializations to barbers that have none, based on their booking history.
 * Barbers with no specializations are invisible in StyleAI Stylist Match.
 *
 * Run: node backend/scripts/seedBarberSpecializations.js
 *
 * Strategy:
 *   1. Find barbers with empty specializations
 *   2. Look at their completed booking history → infer specializations from service names
 *   3. If no booking history → assign a default set based on the salon's service catalog
 *   4. Update the barber document
 */

const dns = require('dns');
dns.setServers(['8.8.8.8', '8.8.4.4']);

require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const mongoose = require('mongoose');
const Barber   = require('../models/Barber');
const Booking  = require('../models/Booking');

// Mapping: if a booking service name contains any of these keywords → add the specialization
const SERVICE_MAP = [
  { keywords: ['fade', 'taper', 'skin fade', 'zero fade', 'high fade', 'mid fade', 'low fade'], spec: 'Fade' },
  { keywords: ['haircut', 'hair cut', 'cut', 'trim', 'crop', 'fringe', 'bang'], spec: 'Haircut' },
  { keywords: ['beard', 'shave', 'clean shave', 'shape up', 'lineup'], spec: 'Beard Trim' },
  { keywords: ['color', 'colour', 'highlight', 'bleach', 'dye', 'balayage', 'ombre'], spec: 'Hair Color' },
  { keywords: ['treatment', 'keratin', 'smoothing', 'rebonding', 'straighten', 'perm', 'wave', 'curl'], spec: 'Hair Treatment' },
  { keywords: ['massage', 'head massage', 'scalp'], spec: 'Head Massage' },
  { keywords: ['facial', 'face', 'cleanup', 'peel'], spec: 'Facial' },
];

// Default specializations assigned when no booking history exists
const DEFAULT_SPECS = ['Haircut', 'Fade'];

function inferSpecs(serviceNames) {
  const found = new Set();
  for (const name of serviceNames) {
    const lower = name.toLowerCase();
    for (const { keywords, spec } of SERVICE_MAP) {
      if (keywords.some(k => lower.includes(k))) found.add(spec);
    }
  }
  return [...found];
}

async function run() {
  await mongoose.connect(process.env.MONGODB_URI || process.env.MONGO_URI);
  console.log('Connected to MongoDB');

  const barbers = await Barber.find({
    $or: [
      { specializations: { $exists: false } },
      { specializations: { $size: 0 } },
    ],
  }).lean();

  console.log(`Found ${barbers.length} barber(s) with no specializations`);
  if (!barbers.length) { console.log('All barbers already have specializations.'); process.exit(0); }

  let updated = 0;
  for (const barber of barbers) {
    // Look at completed bookings for this barber
    const bookings = await Booking.find({
      barberId: barber._id,
      status: 'completed',
    }).select('services').lean();

    const serviceNames = bookings.flatMap(b => (b.services || []).map(s => s.serviceName || s.name || '').filter(Boolean));
    let specs = inferSpecs(serviceNames);

    if (!specs.length) specs = DEFAULT_SPECS;

    await Barber.updateOne({ _id: barber._id }, { $set: { specializations: specs } });
    console.log(`  ✓ ${barber.name || barber._id} → [${specs.join(', ')}]`);
    updated++;
  }

  console.log(`\nUpdated ${updated} barber(s).`);
  process.exit(0);
}

run().catch(err => { console.error(err); process.exit(1); });
