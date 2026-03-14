const axios = require("axios");

const getCoordinatesFromAddress = async (address) => {
  try {

    const response = await axios.get(
      "https://maps.googleapis.com/maps/api/geocode/json",
      {
        params: {
          address: address,
          key: process.env.GOOGLE_MAPS_API_KEY
        }
      }
    );

    // Check Google API status
    if (response.data.status !== "OK") {
      throw new Error(`Google Maps error: ${response.data.status}`);
    }

    const location = response.data.results[0].geometry.location;
    const placeId = response.data.results[0].place_id;

    return {
      latitude: location.lat,
      longitude: location.lng,
      placeId: placeId,
      formattedAddress: response.data.results[0].formatted_address
    };

  } catch (error) {

    console.error("Google Maps API Error:", error.message);
    throw error;

  }
};

module.exports = { getCoordinatesFromAddress };