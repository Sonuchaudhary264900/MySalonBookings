/*
 Google Maps Configuration
 Checks if Google Maps API is working
*/

const axios = require("axios");

const testGoogleMapsConnection = async () => {

  try {

    const response = await axios.get(
      "https://maps.googleapis.com/maps/api/geocode/json",
      {
        params: {
          address: "New York",
          key: process.env.GOOGLE_MAPS_API_KEY
        }
      }
    );

    if (response.data.status === "OK") {
      console.log("✅ Google Maps Connected Successfully");
      return true;
    }

    console.log("❌ Google Maps Connection Failed:", response.data.status);
    return false;

  } catch (error) {

    console.log("❌ Google Maps Connection Error:", error.message);
    return false;

  }

};

module.exports = {
  testGoogleMapsConnection
};