/**
 * Seed 30 hairstyle catalog entries (6 per face shape).
 * Run: node backend/scripts/seedHairstyles.js
 *
 * BEFORE RUNNING: replace imageUrl values with real Cloudinary URLs.
 * suggestedService values must match actual strings in Barber.specializations[].
 * Check: db.barbers.distinct('specializations') to see real values in your DB.
 */

require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const mongoose = require('mongoose');
const HairstyleCatalog = require('../models/HairstyleCatalog');

// Stable, deterministic placeholder images via picsum.photos (seed-based, always same image per seed)
// Replace with real Cloudinary hairstyle URLs when available.
const img = (seed) => `https://picsum.photos/seed/${seed}/400/500`;

const entries = [
  // ── OVAL ──────────────────────────────────────────────────────
  {
    name: 'Classic Taper Fade',
    faceShapes: ['oval'], gender: 'male',
    imageUrl: img('oval-taper-fade'),
    description: 'Short on sides, volume on top.',
    whyItWorks: 'Oval faces suit almost any cut. The fade adds clean structure without widening.',
    suggestedService: 'Fade', hairType: 'any', trending: true, order: 1,
  },
  {
    name: 'Textured Fringe',
    faceShapes: ['oval'], gender: 'male',
    imageUrl: img('oval-textured-fringe'),
    description: 'Messy fringe with textured finish.',
    whyItWorks: 'Adds horizontal interest without altering the face balance.',
    suggestedService: 'Haircut', hairType: 'any', trending: false, order: 2,
  },
  {
    name: 'Side Part',
    faceShapes: ['oval'], gender: 'male',
    imageUrl: img('oval-side-part'),
    description: 'Classic side-parted style, polished and sharp.',
    whyItWorks: 'Enhances natural symmetry of oval faces.',
    suggestedService: 'Haircut', hairType: 'straight', trending: false, order: 3,
  },
  {
    name: 'Layered Bob',
    faceShapes: ['oval'], gender: 'female',
    imageUrl: img('oval-layered-bob'),
    description: 'Chin-length layered bob with movement.',
    whyItWorks: 'Frames the face beautifully without adding width.',
    suggestedService: 'Hair Treatment', hairType: 'any', trending: true, order: 4,
  },
  {
    name: 'Loose Waves',
    faceShapes: ['oval'], gender: 'female',
    imageUrl: img('oval-loose-waves'),
    description: 'Medium-length loose beach waves.',
    whyItWorks: 'Oval faces carry flowing styles effortlessly.',
    suggestedService: 'Hair Treatment', hairType: 'wavy', trending: true, order: 5,
  },
  {
    name: 'Buzz Cut',
    faceShapes: ['oval'], gender: 'male',
    imageUrl: img('oval-buzz-cut'),
    description: 'Short all-over buzz with clean lines.',
    whyItWorks: 'Oval faces have the bone structure to pull off a buzz cut cleanly.',
    suggestedService: 'Fade', hairType: 'any', trending: false, order: 6,
  },

  // ── ROUND ─────────────────────────────────────────────────────
  {
    name: 'High Fade Quiff',
    faceShapes: ['round'], gender: 'male',
    imageUrl: img('round-high-fade-quiff'),
    description: 'High fade with a voluminous quiff on top.',
    whyItWorks: 'Height on top elongates the face and counters roundness.',
    suggestedService: 'Fade', hairType: 'any', trending: true, order: 7,
  },
  {
    name: 'Pompadour',
    faceShapes: ['round'], gender: 'male',
    imageUrl: img('round-pompadour'),
    description: 'Swept-back volume on top, tight sides.',
    whyItWorks: 'Vertical volume slims and lengthens a round face.',
    suggestedService: 'Haircut', hairType: 'straight', trending: false, order: 8,
  },
  {
    name: 'Long Layers with Volume',
    faceShapes: ['round'], gender: 'female',
    imageUrl: img('round-long-layers'),
    description: 'Long layers that fall past the chin with lift at roots.',
    whyItWorks: 'Length and layers create an illusion of a longer, slimmer face.',
    suggestedService: 'Hair Treatment', hairType: 'any', trending: true, order: 9,
  },
  {
    name: 'Side-Swept Bangs',
    faceShapes: ['round'], gender: 'female',
    imageUrl: img('round-side-swept-bangs'),
    description: 'Long side-swept fringe across the forehead.',
    whyItWorks: 'Diagonal lines break the symmetry of a round face, adding angles.',
    suggestedService: 'Hair Treatment', hairType: 'any', trending: false, order: 10,
  },
  {
    name: 'Faux Hawk',
    faceShapes: ['round'], gender: 'male',
    imageUrl: img('round-faux-hawk'),
    description: 'Center strip of longer hair with shaved sides.',
    whyItWorks: 'Strong vertical centerline elongates a round face dramatically.',
    suggestedService: 'Fade', hairType: 'any', trending: false, order: 11,
  },
  {
    name: 'Shag Haircut',
    faceShapes: ['round'], gender: 'female',
    imageUrl: img('round-shag-haircut'),
    description: 'Layered shag with curtain bangs.',
    whyItWorks: 'Layered texture adds angles; curtain bangs narrow the forehead.',
    suggestedService: 'Hair Treatment', hairType: 'wavy', trending: true, order: 12,
  },

  // ── SQUARE ────────────────────────────────────────────────────
  {
    name: 'Soft Waves',
    faceShapes: ['square'], gender: 'female',
    imageUrl: img('square-soft-waves'),
    description: 'Soft shoulder-length waves with a center part.',
    whyItWorks: 'Waves soften angular jaw lines; center part balances a strong forehead.',
    suggestedService: 'Hair Treatment', hairType: 'wavy', trending: true, order: 13,
  },
  {
    name: 'Undercut with Texture',
    faceShapes: ['square'], gender: 'male',
    imageUrl: img('square-undercut-texture'),
    description: 'Shaved undercut with textured, pushed-back top.',
    whyItWorks: 'Draws attention upward and away from the jaw.',
    suggestedService: 'Fade', hairType: 'any', trending: true, order: 14,
  },
  {
    name: 'Curly Shag',
    faceShapes: ['square'], gender: 'unisex',
    imageUrl: img('square-curly-shag'),
    description: 'Natural curls in a shag cut with layers.',
    whyItWorks: 'Rounded curls counter sharp angular features.',
    suggestedService: 'Hair Treatment', hairType: 'curly', trending: false, order: 15,
  },
  {
    name: 'Crew Cut',
    faceShapes: ['square'], gender: 'male',
    imageUrl: img('square-crew-cut'),
    description: 'Military-style short cut, slightly longer on top.',
    whyItWorks: 'Complements a strong jaw and masculine bone structure.',
    suggestedService: 'Haircut', hairType: 'any', trending: false, order: 16,
  },
  {
    name: 'Lob (Long Bob)',
    faceShapes: ['square'], gender: 'female',
    imageUrl: img('square-lob'),
    description: 'Shoulder-grazing bob with soft ends.',
    whyItWorks: 'Length past the jaw softens its angularity.',
    suggestedService: 'Hair Treatment', hairType: 'any', trending: true, order: 17,
  },
  {
    name: 'Slicked Back Fade',
    faceShapes: ['square'], gender: 'male',
    imageUrl: img('square-slicked-back'),
    description: 'Hair slicked back with a tight fade on sides.',
    whyItWorks: "Clean lines complement a square face's natural definition.",
    suggestedService: 'Fade', hairType: 'straight', trending: false, order: 18,
  },

  // ── HEART ─────────────────────────────────────────────────────
  {
    name: 'Chin-Length Bob',
    faceShapes: ['heart'], gender: 'female',
    imageUrl: img('heart-chin-bob'),
    description: 'Bob that ends at the chin with slight outward curve.',
    whyItWorks: 'Adds width at the chin to balance a wider forehead.',
    suggestedService: 'Hair Treatment', hairType: 'any', trending: true, order: 19,
  },
  {
    name: 'Blunt Fringe',
    faceShapes: ['heart'], gender: 'female',
    imageUrl: img('heart-blunt-fringe'),
    description: 'Full, straight fringe across the forehead.',
    whyItWorks: 'Minimizes the appearance of a wide forehead.',
    suggestedService: 'Hair Treatment', hairType: 'any', trending: false, order: 20,
  },
  {
    name: 'Side Part Fade',
    faceShapes: ['heart'], gender: 'male',
    imageUrl: img('heart-side-part-fade'),
    description: 'Tight fade with hair swept to one side.',
    whyItWorks: "Asymmetry balances a heart face's wider top half.",
    suggestedService: 'Fade', hairType: 'any', trending: false, order: 21,
  },
  {
    name: 'Curtain Bangs + Layers',
    faceShapes: ['heart'], gender: 'female',
    imageUrl: img('heart-curtain-bangs'),
    description: 'Center-parted curtain bangs with long flowing layers.',
    whyItWorks: 'Curtain bangs break up the forehead; layers add chin-area volume.',
    suggestedService: 'Hair Treatment', hairType: 'any', trending: true, order: 22,
  },
  {
    name: 'French Crop',
    faceShapes: ['heart'], gender: 'male',
    imageUrl: img('heart-french-crop'),
    description: 'Short crop with a textured fringe, faded sides.',
    whyItWorks: 'Fringe reduces forehead prominence on heart faces.',
    suggestedService: 'Haircut', hairType: 'any', trending: true, order: 23,
  },
  {
    name: 'Wavy Shoulder Length',
    faceShapes: ['heart'], gender: 'female',
    imageUrl: img('heart-wavy-shoulder'),
    description: 'Shoulder-length waves with volume at the ends.',
    whyItWorks: 'Volume below the jaw balances a narrow chin.',
    suggestedService: 'Hair Treatment', hairType: 'wavy', trending: false, order: 24,
  },

  // ── OBLONG ────────────────────────────────────────────────────
  {
    name: 'Medium Textured Cut',
    faceShapes: ['oblong'], gender: 'male',
    imageUrl: img('oblong-medium-textured'),
    description: 'Medium-length hair with textured styling, no height.',
    whyItWorks: 'Width is added at the sides; avoid adding height on oblong faces.',
    suggestedService: 'Haircut', hairType: 'any', trending: true, order: 25,
  },
  {
    name: 'Straight Blunt Bob',
    faceShapes: ['oblong'], gender: 'female',
    imageUrl: img('oblong-blunt-bob'),
    description: 'Blunt-cut bob ending at the jaw with zero layers.',
    whyItWorks: 'Horizontal line at jaw level visually shortens an oblong face.',
    suggestedService: 'Hair Treatment', hairType: 'straight', trending: false, order: 26,
  },
  {
    name: 'Disconnected Undercut',
    faceShapes: ['oblong'], gender: 'male',
    imageUrl: img('oblong-disconnected-undercut'),
    description: 'Long top disconnected from short sides.',
    whyItWorks: 'Side volume from disconnection adds width without adding height.',
    suggestedService: 'Fade', hairType: 'any', trending: false, order: 27,
  },
  {
    name: 'Bangs with Volume',
    faceShapes: ['oblong'], gender: 'female',
    imageUrl: img('oblong-bangs-volume'),
    description: 'Full fringe with volume around the sides.',
    whyItWorks: 'Bangs shorten the visual face length; side volume adds width.',
    suggestedService: 'Hair Treatment', hairType: 'any', trending: true, order: 28,
  },
  {
    name: 'Caesar Cut',
    faceShapes: ['oblong'], gender: 'male',
    imageUrl: img('oblong-caesar-cut'),
    description: 'Short horizontal fringe with tight back and sides.',
    whyItWorks: 'Horizontal fringe line shortens the face and adds visual width.',
    suggestedService: 'Haircut', hairType: 'any', trending: false, order: 29,
  },
  {
    name: 'Collarbone Waves',
    faceShapes: ['oblong'], gender: 'female',
    imageUrl: img('oblong-collarbone-waves'),
    description: 'Wavy hair ending at the collarbone with volume on sides.',
    whyItWorks: 'Width at the sides and the natural weight of collarbone length balance an elongated face.',
    suggestedService: 'Hair Treatment', hairType: 'wavy', trending: true, order: 30,
  },
];

async function seed() {
  await mongoose.connect(process.env.MONGODB_URI || process.env.MONGO_URI);
  console.log('Connected to MongoDB');

  const existing = await HairstyleCatalog.countDocuments();
  if (existing > 0) {
    console.log(`${existing} entries already exist. Skipping seed. Delete collection to re-seed.`);
    process.exit(0);
  }

  await HairstyleCatalog.insertMany(entries);
  console.log(`Seeded ${entries.length} hairstyle catalog entries.`);
  process.exit(0);
}

seed().catch(err => { console.error(err); process.exit(1); });
