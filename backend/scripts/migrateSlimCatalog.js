/**
 * migrateSlimCatalog.js
 *
 * 1. Clears all CatalogEntry documents and re-seeds from the new slim defaultCatalog.js
 * 2. Soft-deletes salon Service records whose names are NOT in the new slim catalog
 *
 * Usage:
 *   node scripts/migrateSlimCatalog.js
 */

require('dotenv').config();
const mongoose = require('mongoose');

const CatalogEntry = require('../models/CatalogEntry');
const Service      = require('../models/Service');
const catalog      = require('../data/defaultCatalog');

async function run() {
  await mongoose.connect(process.env.MONGODB_URI);
  console.log('Connected to MongoDB');

  // ── Step 1: Re-seed CatalogEntry ────────────────────────────────────────────
  console.log('\n[1/2] Clearing old CatalogEntry documents...');
  const deleted = await CatalogEntry.deleteMany({});
  console.log(`  Deleted ${deleted.deletedCount} old catalog entries`);

  console.log('  Inserting new slim catalog...');
  let inserted = 0;
  for (const item of catalog) {
    try {
      await CatalogEntry.create(item);
      inserted++;
    } catch (e) {
      if (e.code === 11000) {
        console.warn(`  Skipped duplicate: ${item.businessType} / ${item.category} / ${item.name}`);
      } else {
        throw e;
      }
    }
  }
  console.log(`  Inserted ${inserted} catalog entries`);

  // ── Step 2: Soft-delete salon Services not in new catalog ───────────────────
  console.log('\n[2/2] Soft-deleting salon services not in new catalog...');

  // Build a Set of all valid service names (case-insensitive for safety)
  const validNames = new Set(catalog.map(e => e.name.trim().toLowerCase()));

  // Find all active services whose name is not in the slim catalog
  const staleServices = await Service.find({
    isActive: true,
    deletedAt: null,
    $expr: {
      $not: {
        $in: [{ $toLower: { $trim: { input: '$name' } } }, [...validNames]],
      },
    },
  }).select('_id name salonId');

  console.log(`  Found ${staleServices.length} stale services to soft-delete`);

  if (staleServices.length > 0) {
    const ids = staleServices.map(s => s._id);
    await Service.updateMany(
      { _id: { $in: ids } },
      { $set: { isActive: false, deletedAt: new Date() } }
    );
    console.log(`  Soft-deleted ${ids.length} services`);

    // Print a summary grouped by name
    const summary = {};
    for (const s of staleServices) {
      summary[s.name] = (summary[s.name] || 0) + 1;
    }
    console.log('\n  Removed service names (count across all salons):');
    Object.entries(summary)
      .sort((a, b) => b[1] - a[1])
      .forEach(([name, count]) => console.log(`    - "${name}" (${count} salons)`));
  }

  console.log('\nMigration complete.');
  await mongoose.disconnect();
}

run().catch(err => {
  console.error('Migration failed:', err);
  process.exit(1);
});
