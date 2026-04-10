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
  },
  { timestamps: true }
);

module.exports = mongoose.model("SiteSettings", siteSettingsSchema);
