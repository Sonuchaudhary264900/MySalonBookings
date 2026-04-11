/**
 * Backfill locality for all salons that have coordinates but no locality stored.
 * Run once: node routes/scripts/backfill-locality.js
 */

require('dotenv').config({ path: require('path').join(__dirname, '../../.env') });
const dns = require('dns');
dns.setServers(['8.8.8.8', '8.8.4.4']);
const mongoose = require('mongoose');
const https = require('https');
const Business = require('../../models/Business');

function reverseGeocodeLocality(lat, lng) {
  return new Promise((resolve) => {
    const url = `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=16&addressdetails=1`;
    https.get(url, { headers: { 'User-Agent': 'MySalonBookings/1.0', 'Accept-Language': 'en' } }, (res) => {
      let data = '';
      res.on('data', chunk => { data += chunk; });
      res.on('end', () => {
        try {
          const a = JSON.parse(data).address || {};
          const place = a.suburb || a.neighbourhood || a.village || a.town || a.city_district || a.quarter || a.county || null;
          resolve(place);
        } catch { resolve(null); }
      });
    }).on('error', () => resolve(null));
  });
}

function sleep(ms) {
  return new Promise(r => setTimeout(r, ms));
}

async function main() {
  await mongoose.connect(process.env.MONGODB_URI || process.env.MONGO_URI);
  console.log('Connected to MongoDB');

  const salons = await Business.find({
    'location.coordinates': { $exists: true, $ne: [] },
    $or: [{ locality: null }, { locality: { $exists: false } }, { locality: '' }],
  }).select('_id name location locality');

  console.log(`Found ${salons.length} salons without locality`);

  let updated = 0;
  for (const salon of salons) {
    const [lng, lat] = salon.location.coordinates;
    const locality = await reverseGeocodeLocality(lat, lng);
    if (locality) {
      await Business.updateOne({ _id: salon._id }, { locality });
      console.log(`  ✓ ${salon.name} → ${locality}`);
      updated++;
    } else {
      console.log(`  – ${salon.name} → no locality found`);
    }
    // Nominatim rate limit: 1 request/second
    await sleep(1100);
  }

  console.log(`\nDone. Updated ${updated}/${salons.length} salons.`);
  await mongoose.disconnect();
}

main().catch(err => { console.error(err); process.exit(1); });
