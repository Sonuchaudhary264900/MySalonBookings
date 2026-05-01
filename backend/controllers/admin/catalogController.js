const CatalogEntry = require('../../models/CatalogEntry');
const Business     = require('../../models/Business');

// ─── helpers ──────────────────────────────────────────────────────────────────
const toKey = (s) => (s || '').toLowerCase().replace(/[^a-z0-9]+/g, '_');

function buildTree(entries) {
  const catMap = {};
  for (const e of entries) {
    if (!catMap[e.category]) {
      catMap[e.category] = {
        label: e.category,
        categoryImage: e.categoryImage || '',
        sections: {},
        subServices: [],
      };
    }
    const cat = catMap[e.category];
    if (e.categoryImage && !cat.categoryImage) cat.categoryImage = e.categoryImage;
    const sec = e.subCategory || 'All Services';
    if (!cat.sections[sec]) cat.sections[sec] = [];
    cat.sections[sec].push({
      _id: e._id,
      name: e.name,
      defaultImage: e.defaultImage || '',
      priceHints: e.priceHints || [],
      durationHints: e.durationHints || [],
      defaultDuration: e.defaultDuration || 30,
      order: e.order || 0,
    });
    if (!cat.subServices.includes(e.name)) cat.subServices.push(e.name);
  }

  return Object.values(catMap).map(c => ({
    key: toKey(c.label),
    label: c.label,
    categoryImage: c.categoryImage,
    sections: Object.entries(c.sections)
      .map(([label, services]) => ({
        label,
        services: services.sort((a, b) => a.order - b.order),
      })),
    subServices: c.subServices,
  }));
}

// ─── GET /admin/catalog/business-types ───────────────────────────────────────
exports.getBusinessTypes = async (req, res) => {
  try {
    const types = await CatalogEntry.distinct('businessType', { isActive: true });
    res.json({ success: true, data: types });
  } catch (e) {
    res.status(500).json({ success: false, message: e.message });
  }
};

// ─── GET /admin/catalog/tree?businessType=barbershop ─────────────────────────
exports.getTree = async (req, res) => {
  try {
    const { businessType } = req.query;
    const filter = { isActive: true };
    if (businessType) filter.businessType = businessType;
    const entries = await CatalogEntry.find(filter).sort({ order: 1, name: 1 }).lean();
    res.json({ success: true, data: buildTree(entries) });
  } catch (e) {
    res.status(500).json({ success: false, message: e.message });
  }
};

// ─── GET /admin/catalog/entries ──────────────────────────────────────────────
exports.getEntries = async (req, res) => {
  try {
    const { businessType, category, subCategory } = req.query;
    const filter = {};
    if (businessType) filter.businessType = businessType;
    if (category)     filter.category     = category;
    if (subCategory !== undefined) filter.subCategory = subCategory;
    const entries = await CatalogEntry.find(filter).sort({ order: 1, name: 1 }).lean();
    res.json({ success: true, data: entries });
  } catch (e) {
    res.status(500).json({ success: false, message: e.message });
  }
};

// ─── POST /admin/catalog/entries ─────────────────────────────────────────────
exports.createEntry = async (req, res) => {
  try {
    const body = req.body;
    const entries = Array.isArray(body) ? body : [body];
    const results = [];
    for (const item of entries) {
      try {
        const entry = await CatalogEntry.create({
          ...item,
          createdBy: req.admin?._id,
        });
        results.push(entry);
      } catch (e) {
        if (e.code === 11000) {
          // duplicate — skip
        } else {
          throw e;
        }
      }
    }
    res.status(201).json({ success: true, data: results, count: results.length });
  } catch (e) {
    res.status(500).json({ success: false, message: e.message });
  }
};

// ─── PUT /admin/catalog/entries/:id ──────────────────────────────────────────
exports.updateEntry = async (req, res) => {
  try {
    const { id } = req.params;
    const allowed = ['name', 'category', 'categoryImage', 'subCategory', 'defaultImage',
                     'priceHints', 'durationHints', 'defaultDuration', 'isActive', 'order'];
    const update = {};
    for (const k of allowed) {
      if (req.body[k] !== undefined) update[k] = req.body[k];
    }
    const entry = await CatalogEntry.findByIdAndUpdate(id, update, { new: true });
    if (!entry) return res.status(404).json({ success: false, message: 'Entry not found' });
    res.json({ success: true, data: entry });
  } catch (e) {
    if (e.code === 11000) return res.status(409).json({ success: false, message: 'A service with that name already exists in this location' });
    res.status(500).json({ success: false, message: e.message });
  }
};

// ─── DELETE /admin/catalog/entries/:id ───────────────────────────────────────
exports.deleteEntry = async (req, res) => {
  try {
    const entry = await CatalogEntry.findByIdAndDelete(req.params.id);
    if (!entry) return res.status(404).json({ success: false, message: 'Entry not found' });
    res.json({ success: true, message: 'Deleted' });
  } catch (e) {
    res.status(500).json({ success: false, message: e.message });
  }
};

// ─── DELETE /admin/catalog/batch ─────────────────────────────────────────────
// body: { businessType, category?, subCategory? }
exports.deleteBatch = async (req, res) => {
  try {
    const { businessType, category, subCategory } = req.body;
    if (!businessType) return res.status(400).json({ success: false, message: 'businessType required' });
    const filter = { businessType };
    if (category !== undefined)    filter.category    = category;
    if (subCategory !== undefined) filter.subCategory = subCategory;
    const result = await CatalogEntry.deleteMany(filter);
    res.json({ success: true, deleted: result.deletedCount });
  } catch (e) {
    res.status(500).json({ success: false, message: e.message });
  }
};

// ─── PUT /admin/catalog/rename ────────────────────────────────────────────────
// Rename a category or subCategory across all matching entries
// body: { businessType, field: 'category'|'subCategory'|'categoryImage', oldValue, newValue, category? }
exports.renameLevel = async (req, res) => {
  try {
    const { businessType, field, oldValue, newValue, category } = req.body;
    if (!businessType || !field || oldValue === undefined || newValue === undefined) {
      return res.status(400).json({ success: false, message: 'businessType, field, oldValue, newValue required' });
    }
    const filter = { businessType, [field]: oldValue };
    if (category) filter.category = category;
    const result = await CatalogEntry.updateMany(filter, { [field]: newValue });
    res.json({ success: true, updated: result.modifiedCount });
  } catch (e) {
    res.status(500).json({ success: false, message: e.message });
  }
};

// ─── POST /admin/catalog/upload-image ────────────────────────────────────────
exports.uploadImage = async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ success: false, message: 'No file uploaded' });
    const { cloudinary: cl } = require('../../config/cloudinary');
    const url = await new Promise((resolve, reject) => {
      const stream = cl.uploader.upload_stream(
        { folder: 'smart-salon/catalog', resource_type: 'image' },
        (err, result) => { if (err) reject(err); else resolve(result.secure_url); }
      );
      stream.end(req.file.buffer);
    });
    res.json({ success: true, data: { url } });
  } catch (e) {
    res.status(500).json({ success: false, message: e.message });
  }
};

// ─── POST /admin/catalog/seed ─────────────────────────────────────────────────
// Body: { entries: [...] } OR { useDefaults: true } to seed from built-in data
// ─── POST /admin/catalog/overwrite-images ─────────────────────────────────────
// Pushes admin catalog images (categoryImage + defaultImage) into every matching
// owner's Business.categoryImages map. Only images — prices/durations untouched.
exports.overwriteImages = async (req, res) => {
  try {
    const { businessType } = req.body;
    if (!businessType) return res.status(400).json({ success: false, message: 'businessType required' });

    // Collect all images from admin catalog for this business type
    const entries = await CatalogEntry.find({ businessType, isActive: true },
      'category name categoryImage defaultImage').lean();

    // Build the categoryImages patch map
    // Keys: category label (for category images) + service name (for service images as 'cat::name' convention)
    const imageMap = {};
    for (const e of entries) {
      if (e.categoryImage && !imageMap[e.category]) {
        imageMap[e.category] = e.categoryImage;
      }
      // Service-level images use the service name as key directly
      // (owner frontend stores them as plain name keys in serviceImages, not categoryImages)
    }

    if (!Object.keys(imageMap).length) {
      return res.json({ success: true, updated: 0, message: 'No category images found in catalog for this business type' });
    }

    // Find all businesses of this type and merge image map (never removes existing owner custom images)
    const businesses = await Business.find({ businessType }, '_id categoryImages').lean();
    let updated = 0;
    for (const biz of businesses) {
      const existing = biz.categoryImages instanceof Map
        ? Object.fromEntries(biz.categoryImages)
        : (biz.categoryImages || {});

      // Merge: admin images fill in missing keys; existing owner custom images are preserved
      const merged = { ...imageMap, ...existing };

      await Business.updateOne({ _id: biz._id }, { $set: { categoryImages: merged } });
      updated++;
    }

    res.json({ success: true, updated, categoriesOverwritten: Object.keys(imageMap).length });
  } catch (e) {
    res.status(500).json({ success: false, message: e.message });
  }
};

// ─── POST /admin/catalog/force-overwrite-images ────────────────────────────────
// Same as overwriteImages but admin images WIN over owner custom images.
exports.forceOverwriteImages = async (req, res) => {
  try {
    const { businessType } = req.body;
    if (!businessType) return res.status(400).json({ success: false, message: 'businessType required' });

    const entries = await CatalogEntry.find({ businessType, isActive: true },
      'category name categoryImage defaultImage').lean();

    const imageMap = {};
    for (const e of entries) {
      if (e.categoryImage && !imageMap[e.category]) imageMap[e.category] = e.categoryImage;
    }

    if (!Object.keys(imageMap).length) {
      return res.json({ success: true, updated: 0, message: 'No category images found' });
    }

    const businesses = await Business.find({ businessType }, '_id categoryImages').lean();
    let updated = 0;
    for (const biz of businesses) {
      const existing = biz.categoryImages instanceof Map
        ? Object.fromEntries(biz.categoryImages)
        : (biz.categoryImages || {});
      // Admin images override owner's; non-category keys (custom ones) preserved
      const merged = { ...existing, ...imageMap };
      await Business.updateOne({ _id: biz._id }, { $set: { categoryImages: merged } });
      updated++;
    }

    res.json({ success: true, updated, categoriesOverwritten: Object.keys(imageMap).length });
  } catch (e) {
    res.status(500).json({ success: false, message: e.message });
  }
};

exports.seed = async (req, res) => {
  try {
    let entries = req.body?.entries;
    if (!entries && req.body?.useDefaults) {
      entries = require('../../data/defaultCatalog');
    }
    if (!Array.isArray(entries) || !entries.length) {
      return res.status(400).json({ success: false, message: 'entries[] required or use useDefaults:true' });
    }
    let inserted = 0, skipped = 0;
    for (const item of entries) {
      try {
        await CatalogEntry.create({ ...item, createdBy: req.admin?._id });
        inserted++;
      } catch (e) {
        if (e.code === 11000) { skipped++; } else { throw e; }
      }
    }
    res.json({ success: true, data: { inserted, skipped } });
  } catch (e) {
    res.status(500).json({ success: false, message: e.message });
  }
};
