const crypto   = require('crypto');
const axios    = require('axios');
const FormData = require('form-data');
const { getJSON, setJSON, del } = require('../../config/redis');
const { logger }                = require('../../config/logger');
const HairstyleCatalog          = require('../../models/HairstyleCatalog');
const HairstyleInteraction      = require('../../models/HairstyleInteraction');
const UserFaceProfile           = require('../../models/UserFaceProfile');
const Barber                    = require('../../models/Barber');
const Business                  = require('../../models/Business');

const MODEL_VERSION = process.env.HAIRSTYLE_MODEL_VERSION || 'v1-rules';

// ── Circuit Breaker ─────────────────────────────────────────────
let cbFailures = 0, cbOpenUntil = 0;
const circuitOpen = () => cbFailures >= 3 && Date.now() < cbOpenUntil;
const cbFail = () => { cbFailures++; cbOpenUntil = Date.now() + 60_000; };
const cbOk   = () => { cbFailures = 0; };

// ── Python call with single retry + jitter ──────────────────────
async function callPython(buffer, mimetype, retries = 1) {
  const form = new FormData();
  form.append('file', buffer, { filename: 'face.jpg', contentType: mimetype });
  try {
    const r = await axios.post(`${process.env.PYTHON_AI_URL || 'http://127.0.0.1:8001'}/analyze`, form, {
      headers: {
        ...form.getHeaders(),
        'X-Internal-Token': process.env.HAIRSTYLE_INTERNAL_SECRET || '',
      },
      timeout: 8_000,
    });
    cbOk();
    return r.data;
  } catch (err) {
    if (retries > 0 && ['ECONNRESET','ETIMEDOUT','ECONNREFUSED'].includes(err.code)) {
      await new Promise(r => setTimeout(r, 1000 + Math.random() * 500));
      return callPython(buffer, mimetype, retries - 1);
    }
    cbFail();
    throw err;
  }
}

// ── Stylist Match ───────────────────────────────────────────────
async function findStylists(suggestedService, lat, lng, limit = 3) {
  const words  = (suggestedService || '').split(/\s+/).filter(w => w.length > 2);
  const regex  = new RegExp(words.length ? words.join('|') : suggestedService, 'i');
  const ck     = `hairstyle:stylist:${suggestedService}:${String(lat).slice(0,6)}:${String(lng).slice(0,6)}`;
  const cached = await getJSON(ck);
  if (cached) return cached;

  let nearbySalonIds = [];
  if (lat && lng) {
    try {
      const nearby = await Business.find({
        location:   { $near: { $geometry: { type: 'Point', coordinates: [parseFloat(lng), parseFloat(lat)] }, $maxDistance: 10_000 } },
        isApproved: true,
        isActive:   true,
      }).select('_id').limit(20).lean();
      nearbySalonIds = nearby.map(s => s._id);
    } catch (_) { /* geo index missing — proceed without location filter */ }
  }

  const q = { isActive: true, specializations: { $elemMatch: { $regex: regex } } };
  if (nearbySalonIds.length) q.salonId = { $in: nearbySalonIds };

  const barbers = await Barber.find(q)
    .select('name profilePhoto salonId averageRating')
    .populate('salonId', 'name city')
    .limit(limit * 2)
    .lean();

  const result = barbers
    .sort((a, b) => (b.averageRating || 0) - (a.averageRating || 0))
    .slice(0, limit)
    .map(b => ({
      barberId:  b._id,
      name:      b.name,
      photo:     b.profilePhoto || null,
      rating:    b.averageRating || 0,
      salonId:   b.salonId?._id,
      salonName: b.salonId?.name  || '',
      salonCity: b.salonId?.city  || '',
    }));

  await setJSON(ck, result, 300);
  return result;
}

// ── Collaborative scores (cached) ──────────────────────────────
async function getCollaborativeScores(faceShape, gender) {
  const ck     = `hairstyle:collab:${faceShape}:${gender || 'unisex'}`;
  const cached = await getJSON(ck);
  if (cached) return cached;

  try {
    const profiles = await UserFaceProfile.find({ faceShape }).select('_id').lean();
    const ids      = profiles.map(p => p._id);
    if (!ids.length) return {};

    const agg = await HairstyleInteraction.aggregate([
      { $match: { customerId: { $in: ids }, event_type: { $in: ['save','converted_booking'] } } },
      { $group: { _id: '$hairstyleId', score: { $sum: { $cond: [{ $eq: ['$event_type','converted_booking'] }, 3, 1] } } } },
    ]);

    const scores = {};
    agg.forEach(r => { scores[r._id.toString()] = r.score; });
    await setJSON(ck, scores, 3600);
    return scores;
  } catch { return {}; }
}

// ── Reasons builder ─────────────────────────────────────────────
// cityTrend removed in V1 — city trend keys don't exist until 500 MAU/city
function buildReasons(hairstyle, faceShape, userProfile, collabScores) {
  const reasons = [];
  if (hairstyle.faceShapes.includes(faceShape))
    reasons.push(`Matches your ${faceShape} face shape`);
  if (userProfile?.savedStyleIds?.map(id => id.toString()).includes(hairstyle._id.toString()))
    reasons.push('You saved this before');
  if ((collabScores?.[hairstyle._id.toString()] || 0) > 5)
    reasons.push('Popular with users like you');
  if (hairstyle.trending)
    reasons.push('Trending right now');
  return reasons;
}

// ── StyleScore™ sigmoid normalization ──────────────────────────
function applyStyleScores(results, rawScores) {
  const mean = rawScores.reduce((a, b) => a + b, 0) / (rawScores.length || 1);
  const std  = Math.sqrt(rawScores.map(s => (s - mean) ** 2).reduce((a, b) => a + b, 0) / (rawScores.length || 1));
  results.forEach((r, i) => {
    const normalized = std > 0 ? (rawScores[i] - mean) / std : 0;
    r.styleScore = Math.round(50 + 50 * Math.tanh(normalized));
  });
}

// ── Trending fallback ───────────────────────────────────────────
async function getTrendingFallback(gender) {
  const ck     = `hairstyle:trending:${gender || 'unisex'}`;
  const cached = await getJSON(ck);
  if (cached) return cached;

  const q = gender && gender !== 'unisex'
    ? { isActive: true, $or: [{ gender }, { gender: 'unisex' }] }
    : { isActive: true };
  const items = await HairstyleCatalog.find(q).sort({ trendingScore: -1 }).limit(10).lean();
  await setJSON(ck, items, 900);
  return items;
}

// ══════════════════════════════════════════════════════════════
// HANDLERS
// ══════════════════════════════════════════════════════════════

// POST /customer/hairstyle/recommend
exports.recommend = async (req, res) => {
  if (process.env.HAIRSTYLE_FEATURE_ENABLED === 'false')
    return res.status(503).json({ success: false, message: 'StyleAI is temporarily disabled.' });

  const gender = req.body.gender || 'unisex';
  const lat    = req.body.lat;
  const lng    = req.body.lng;
  const start  = Date.now();

  // Circuit open → return trending
  if (circuitOpen()) {
    const trending = await getTrendingFallback(gender);
    return res.json({ success: true, fallback: true, hairstyles: trending, stylists: [], faceShape: null });
  }

  if (!req.file) return res.status(400).json({ success: false, message: 'Image required.' });

  const buffer   = req.file.buffer;
  const mimetype = req.file.mimetype;

  // Magic bytes check (JPEG/PNG only)
  const magic = buffer.slice(0, 4).toString('hex');
  const validMagic = magic.startsWith('ffd8') || magic.startsWith('89504e47');
  if (!validMagic) return res.status(400).json({ success: false, message: 'Invalid image format. Use JPEG or PNG.' });

  const hash     = crypto.createHash('sha256').update(buffer).digest('hex').slice(0, 40);
  const cacheKey = `hairstyle:face:${hash}:${MODEL_VERSION}`;
  let   result   = null;
  let   cacheHit = false;

  // Redis cache check
  result = await getJSON(cacheKey);
  if (result) {
    cacheHit = true;
  } else {
    try {
      result = await callPython(buffer, mimetype);
      await setJSON(cacheKey, result, 24 * 3600);
    } catch (err) {
      // Python error with structured response
      if (err.response?.status === 422) {
        return res.status(422).json({ success: false, ...err.response.data });
      }
      // Unrecoverable — return trending
      const trending = await getTrendingFallback(gender);
      return res.json({ success: true, fallback: true, hairstyles: trending, stylists: [], faceShape: null });
    }
  }

  const { faceShape, confidence, hairDensity, skinTone } = result;

  // Upsert UserFaceProfile
  const customerId = req.customer._id;
  try {
    await UserFaceProfile.findOneAndUpdate(
      { customerId },
      { $set: { faceShape, confidence, hairDensity, skinTone, gender, lastScannedAt: new Date() } },
      { upsert: true, new: true }
    );
  } catch (_) {}

  // Fetch catalog
  const genderFilter = gender === 'unisex' ? {} : { $or: [{ gender }, { gender: 'unisex' }] };
  let catalog = await HairstyleCatalog.find({
    faceShapes: faceShape,
    isActive:   true,
    ...genderFilter,
  }).lean();

  if (!catalog.length) {
    catalog = await HairstyleCatalog.find({ isActive: true, ...genderFilter }).lean();
  }

  // Get user profile for personalization
  const userProfile   = await UserFaceProfile.findOne({ customerId }).lean();
  const collabScores  = await getCollaborativeScores(faceShape, gender);
  const totalInteractions = Object.values(collabScores).reduce((a, b) => a + b, 0);
  const collabWeight  = Math.min(1.0, totalInteractions / 100);

  // Compute raw scores
  const rawScores = catalog.map(item => {
    const promotionScore = (item.promotedSalonIds?.length > 0) ? 1000 : 0;
    const collab         = collabScores[item._id.toString()] || 0;
    const personal       = (userProfile?.savedStyleIds?.map(id => id.toString()).includes(item._id.toString()) ? 5 : 0)
                         + (userProfile?.bookedStyleIds?.map(id => id.toString()).includes(item._id.toString()) ? 3 : 0);
    const curatorScore   = 10 - (item.order || 10);

    // CV filters: boost matching density/tone
    let cvBoost = 0;
    if (hairDensity && item.recommendedHairDensity?.length && item.recommendedHairDensity.includes(hairDensity)) cvBoost += 2;
    if (skinTone   && item.compatibleSkinTones?.length    && item.compatibleSkinTones.includes(skinTone))       cvBoost += 2;

    return promotionScore
      + (collabWeight * collab * 3)
      + ((1 - collabWeight) * curatorScore)
      + (personal * 5)
      + (item.trendingScore * 0.1)
      + cvBoost;
  });

  // Sort descending
  const sorted = catalog
    .map((item, i) => ({ item, score: rawScores[i] }))
    .sort((a, b) => b.score - a.score)
    .slice(0, 10);

  const top6Items  = sorted.slice(0, 6).map(s => s.item);
  const top6Scores = sorted.slice(0, 6).map(s => s.score);

  // ε-greedy exploration: 10% chance to swap one card with an under-ranked style
  if (Math.random() < 0.10 && sorted.length > 6) {
    const exploreIdx = Math.floor(Math.random() * 6);
    const pick       = sorted[6 + Math.floor(Math.random() * (sorted.length - 6))];
    top6Items[exploreIdx]  = { ...pick.item, explore: true };
    top6Scores[exploreIdx] = pick.score;
  }

  // Build StyleScore™ and reasons
  applyStyleScores(top6Items, top6Scores);
  top6Items.forEach(item => {
    item.reasons = buildReasons(item, faceShape, userProfile, collabScores);
  });

  // Stylist Match
  const stylists = top6Items.length
    ? await findStylists(top6Items[0].suggestedService, lat, lng)
    : [];

  const durationMs = Date.now() - start;
  logger.info('hairstyle.analyzed', {
    userId: customerId, faceShape, confidence, hairDensity, skinTone,
    durationMs, cacheHit, modelVersion: MODEL_VERSION,
  });

  // Async impression events — fire-and-forget
  setImmediate(async () => {
    try {
      const events = top6Items.map(item => ({
        customerId,
        hairstyleId:   item._id,
        event_type:    'impression',
        faceShape,
        confidence,
        detectionMode: 'server',
        platform:      req.headers['x-platform'] || 'web',
      }));
      await HairstyleInteraction.insertMany(events, { ordered: false });

      // Increment trendingScore for top 3
      const top3Ids = top6Items.slice(0, 3).map(i => i._id);
      await HairstyleCatalog.updateMany({ _id: { $in: top3Ids } }, { $inc: { trendingScore: 1 } });
    } catch (_) {}
  });

  return res.json({
    success:    true,
    faceShape,
    confidence,
    hairDensity,
    skinTone,
    hairstyles: top6Items,
    stylists,
    fallback:   false,
  });
};

// GET /customer/hairstyle/by-shape
exports.byShape = async (req, res) => {
  const shape  = req.query.shape;
  const gender = req.query.gender || 'unisex';
  if (!shape) return res.status(400).json({ success: false, message: 'shape param required' });

  const ck     = `hairstyle:shape:${shape}:${gender}`;
  const cached = await getJSON(ck);
  if (cached) return res.json({ success: true, hairstyles: cached, faceShape: shape });

  const genderFilter = gender === 'unisex' ? {} : { $or: [{ gender }, { gender: 'unisex' }] };
  const items = await HairstyleCatalog.find({ faceShapes: shape, isActive: true, ...genderFilter })
    .sort({ order: 1, trendingScore: -1 })
    .lean();

  await setJSON(ck, items, 3600);
  return res.json({ success: true, hairstyles: items, faceShape: shape });
};

// GET /customer/hairstyle/trending
exports.getTrending = async (req, res) => {
  const gender = req.query.gender || 'unisex';
  const limit  = Math.min(parseInt(req.query.limit) || 10, 20);
  const items  = await getTrendingFallback(gender);
  return res.json({ success: true, hairstyles: items.slice(0, limit) });
};

// POST /customer/hairstyle/interact
exports.trackInteraction = async (req, res) => {
  const { hairstyleId, event_type, faceShape, confidence, detectionMode, platform } = req.body;
  const customerId = req.customer._id;

  if (!hairstyleId || !event_type)
    return res.status(400).json({ success: false, message: 'hairstyleId and event_type required' });

  await HairstyleInteraction.create({
    customerId, hairstyleId, event_type, faceShape: faceShape || null,
    confidence: confidence || null, detectionMode: detectionMode || null,
    platform: platform || 'web',
  });

  // On book_cta: store pending attribution for booking completion hook
  if (event_type === 'book_cta') {
    try {
      const style = await HairstyleCatalog.findById(hairstyleId).select('suggestedService').lean();
      if (style?.suggestedService) {
        const attr = require('../../utils/hairstyleAttribution');
        await attr.storePendingAttribution(customerId, hairstyleId, style.suggestedService);
      }
    } catch (_) {}
  }

  // On save: update UserFaceProfile + boost trendingScore
  if (event_type === 'save') {
    await UserFaceProfile.updateOne({ customerId }, { $addToSet: { savedStyleIds: hairstyleId } }, { upsert: true });
    await HairstyleCatalog.updateOne({ _id: hairstyleId }, { $inc: { trendingScore: 2 } });
  } else if (event_type === 'unsave') {
    await UserFaceProfile.updateOne({ customerId }, { $pull: { savedStyleIds: hairstyleId } });
  }

  // On manual_override: store corrected face shape for ML training
  if (event_type === 'manual_override' && faceShape) {
    await UserFaceProfile.updateOne(
      { customerId },
      { $set: { manualShape: faceShape, faceShape } },
      { upsert: true }
    );
    // Invalidate by-shape cache for this shape
    await del(`hairstyle:shape:${faceShape}:unisex`);
  }

  return res.json({ ok: true });
};

// GET /customer/hairstyle/saved
exports.getSaved = async (req, res) => {
  const profile = await UserFaceProfile.findOne({ customerId: req.customer._id })
    .populate('savedStyleIds')
    .lean();
  return res.json({ success: true, hairstyles: profile?.savedStyleIds || [] });
};

// POST /customer/hairstyle/stylist-match
exports.getStylistMatch = async (req, res) => {
  const { suggestedService, lat, lng } = req.body;
  if (!suggestedService) return res.status(400).json({ success: false, message: 'suggestedService required' });
  const stylists = await findStylists(suggestedService, lat, lng);
  return res.json({ success: true, stylists });
};

// GET /owner/hairstyle/stats
exports.getOwnerStats = async (req, res) => {
  const owner = req.owner;
  if (!owner?.businessId) return res.status(400).json({ success: false, message: 'No business found' });

  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 3600 * 1000);

  // Find catalog entries matching this salon's barbers' specializations
  const barbers = await Barber.find({ salonId: owner.businessId, isActive: true }).select('specializations').lean();
  const allSpecs = [...new Set(barbers.flatMap(b => b.specializations || []))];

  const catalogIds = allSpecs.length
    ? (await HairstyleCatalog.find({ suggestedService: { $in: allSpecs }, isActive: true }).select('_id').lean()).map(c => c._id)
    : [];

  if (!catalogIds.length) {
    return res.json({ success: true, impressionsThisWeek: 0, clicksThisWeek: 0, bookCtasThisWeek: 0, hasPromotedStyles: false });
  }

  const [agg, promoted] = await Promise.all([
    HairstyleInteraction.aggregate([
      { $match: { hairstyleId: { $in: catalogIds }, createdAt: { $gte: sevenDaysAgo } } },
      { $group: {
        _id:           '$event_type',
        count:         { $sum: 1 },
      }},
    ]),
    HairstyleCatalog.findOne({ _id: { $in: catalogIds }, promotedSalonIds: owner.businessId }).lean(),
  ]);

  const byType = {};
  agg.forEach(r => { byType[r._id] = r.count; });

  return res.json({
    success:             true,
    impressionsThisWeek: byType.impression          || 0,
    clicksThisWeek:      byType.click               || 0,
    bookCtasThisWeek:    byType.book_cta             || 0,
    conversionsThisWeek: byType.converted_booking    || 0,
    hasPromotedStyles:   !!promoted,
  });
};
