const HairstyleCatalog     = require('../../models/HairstyleCatalog');
const HairstyleInteraction = require('../../models/HairstyleInteraction');
const { delPattern }       = require('../../config/redis');

// PATCH /admin/v1/hairstyle-catalog/:id/promote
exports.togglePromotion = async (req, res) => {
  const { id } = req.params;
  const { salonId, promote } = req.body;

  if (!salonId) return res.status(400).json({ success: false, message: 'salonId required' });

  const catalog = await HairstyleCatalog.findById(id);
  if (!catalog) return res.status(404).json({ success: false, message: 'Catalog entry not found' });

  if (promote) {
    if (!catalog.promotedSalonIds.map(s => s.toString()).includes(salonId)) {
      catalog.promotedSalonIds.push(salonId);
    }
  } else {
    catalog.promotedSalonIds = catalog.promotedSalonIds.filter(s => s.toString() !== salonId);
  }

  await catalog.save();

  // Invalidate shape caches so promotion reflects immediately
  await delPattern('hairstyle:shape:*');

  return res.json({ success: true, catalog });
};

// GET /admin/v1/hairstyle/analytics
exports.getAnalytics = async (req, res) => {
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 3600 * 1000);

  const agg = await HairstyleInteraction.aggregate([
    { $match: { createdAt: { $gte: thirtyDaysAgo } } },
    { $group: { _id: '$event_type', count: { $sum: 1 } } },
  ]);

  const byType = {};
  agg.forEach(r => { byType[r._id] = r.count; });

  const impressions   = byType.impression          || 0;
  const clicks        = byType.click               || 0;
  const bookCtas      = byType.book_cta            || 0;
  const conversions   = byType.converted_booking   || 0;

  return res.json({
    success: true,
    period:  '30d',
    impressions,
    clicks,
    bookCtas,
    conversions,
    clickThroughRate: impressions ? ((clicks / impressions) * 100).toFixed(1) + '%' : '0%',
    conversionRate:   bookCtas    ? ((conversions / bookCtas) * 100).toFixed(1) + '%' : '0%',
  });
};

// GET /admin/v1/hairstyle-catalog
exports.listCatalog = async (req, res) => {
  const catalog = await HairstyleCatalog.find().sort({ order: 1 }).lean();
  return res.json({ success: true, catalog });
};

// POST /admin/v1/hairstyle-catalog
exports.createEntry = async (req, res) => {
  const entry = await HairstyleCatalog.create({ ...req.body, createdBy: req.admin?._id });
  await delPattern('hairstyle:shape:*');
  await delPattern('hairstyle:trending:*');
  return res.status(201).json({ success: true, entry });
};

// PATCH /admin/v1/hairstyle-catalog/:id
exports.updateEntry = async (req, res) => {
  const entry = await HairstyleCatalog.findByIdAndUpdate(req.params.id, req.body, { new: true });
  if (!entry) return res.status(404).json({ success: false, message: 'Not found' });
  await delPattern('hairstyle:shape:*');
  await delPattern('hairstyle:trending:*');
  return res.json({ success: true, entry });
};

// DELETE /admin/v1/hairstyle-catalog/:id
exports.deleteEntry = async (req, res) => {
  await HairstyleCatalog.findByIdAndUpdate(req.params.id, { isActive: false });
  await delPattern('hairstyle:shape:*');
  await delPattern('hairstyle:trending:*');
  return res.json({ success: true });
};
