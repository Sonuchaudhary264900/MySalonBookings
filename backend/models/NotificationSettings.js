const mongoose = require('mongoose');

const notificationSettingsSchema = new mongoose.Schema(
  {
    salonId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Salon',
      required: true,
      unique: true,
    },
    // Owner can disable the entire broadcast feature
    broadcastEnabled: { type: Boolean, default: true },

    // Prices owner can customize (in INR per campaign)
    // "My Customers" is always free; only radius tiers are charged
    pricing: {
      radius5km:  { type: Number, default: 19 },
      radius10km: { type: Number, default: 39 },
      radius25km: { type: Number, default: 79 },
    },

    // 1 free radius campaign per calendar month
    freeRadiusMonthly: {
      month: { type: String, default: '' }, // 'YYYY-MM'
      used:  { type: Number, default: 0  },
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model('NotificationSettings', notificationSettingsSchema);
