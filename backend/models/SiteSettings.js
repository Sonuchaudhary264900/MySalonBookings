const mongoose = require("mongoose");

const siteSettingsSchema = new mongoose.Schema(
  {
    key: { type: String, default: "global", unique: true },
    heroImages: [
      {
        url:       { type: String, required: true },
        publicId:  { type: String, default: "" },
        label:     { type: String, default: "" },
        active:    { type: Boolean, default: true },
        order:     { type: Number, default: 0 },
        addedAt:   { type: Date, default: Date.now },
      },
    ],
    // Company-funded business-referral reward config
    referralRewardAmount: { type: Number, default: 50 },  // ₹ paid to referrer
    referralMinBookings:  { type: Number, default: 20 },  // referred business must complete this many
    referralMinDays:      { type: Number, default: 7 },   // ...and be active at least this long
  },
  { timestamps: true }
);

module.exports = mongoose.model("SiteSettings", siteSettingsSchema);
