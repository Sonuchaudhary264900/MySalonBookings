/*
  config/cloudinary.js
  Cloudinary Configuration
  Handles image upload for:
  - Salon photos
  - Profile photos
  - Service images
*/

const cloudinary = require("cloudinary").v2;


// ======================================================
// CONFIGURE CLOUDINARY
// ======================================================
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME || "",
  api_key: process.env.CLOUDINARY_API_KEY || "",
  api_secret: process.env.CLOUDINARY_API_SECRET || "",
});


// ======================================================
// TEST CLOUDINARY CONNECTION
// ======================================================
const testCloudinaryConnection = async () => {
  try {

    // Check if credentials exist
    if (
      !process.env.CLOUDINARY_CLOUD_NAME ||
      !process.env.CLOUDINARY_API_KEY ||
      !process.env.CLOUDINARY_API_SECRET
    ) {
      console.warn("⚠️ Cloudinary credentials missing in .env");
      console.warn("Skipping Cloudinary connection test\n");
      return false;
    }

    const result = await cloudinary.api.ping();

    if (result.status === "ok") {
      console.log("✅ Cloudinary Connected Successfully");
      return true;
    }

    console.warn("⚠️ Cloudinary responded but connection not confirmed");
    return false;

  } catch (error) {

    console.error("❌ Cloudinary Connection Failed:", error.message);
    console.error("Check CLOUDINARY credentials in .env\n");

    return false;
  }
};


// ======================================================
// UPLOAD SINGLE IMAGE
// ======================================================
const uploadImage = async (filePath, folder = "smart-salon") => {
  try {

    const result = await cloudinary.uploader.upload(filePath, {
      folder,
      resource_type: "image",
    });

    return {
      url: result.secure_url,
      public_id: result.public_id,
    };

  } catch (error) {

    console.error("Cloudinary Upload Error:", error.message);
    throw error;

  }
};


// ======================================================
// DELETE IMAGE
// ======================================================
const deleteImage = async (publicId) => {
  try {

    await cloudinary.uploader.destroy(publicId);

    return true;

  } catch (error) {

    console.error("Cloudinary Delete Error:", error.message);
    return false;

  }
};


// ======================================================
// EXPORTS
// ======================================================
module.exports = {
  cloudinary,
  testCloudinaryConnection,
  uploadImage,
  deleteImage,
};