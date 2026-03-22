/*
  Firebase Admin - Token Verification
  Uses Firebase REST API to verify ID tokens from Firebase Phone Auth.
  No service account required — uses the Web API key for server-side token lookup.
*/

const axios = require('axios');

const FIREBASE_API_KEY = process.env.FIREBASE_API_KEY || 'AIzaSyD3SnDWmh13tClf5kJYk0KPybtz1xHCdt0';

/**
 * Verifies a Firebase Phone Auth ID token.
 * Returns { uid, phone } on success, throws on failure.
 */
const verifyFirebaseToken = async (idToken) => {
  try {
    const response = await axios.post(
      `https://identitytoolkit.googleapis.com/v1/accounts:lookup?key=${FIREBASE_API_KEY}`,
      { idToken }
    );

    const users = response.data.users;
    if (!users || users.length === 0) {
      throw new Error('Invalid Firebase token');
    }

    const user = users[0];

    if (!user.phoneNumber) {
      throw new Error('No verified phone number found in Firebase token');
    }

    return {
      uid: user.localId,
      phone: user.phoneNumber, // e.g. "+919876543210"
    };
  } catch (error) {
    // Firebase REST API error (e.g. TOKEN_EXPIRED, INVALID_ID_TOKEN)
    const firebaseMsg = error.response?.data?.error?.message;
    if (firebaseMsg) {
      throw new Error(`Firebase verification failed: ${firebaseMsg}`);
    }
    throw error;
  }
};

/**
 * Tests Firebase connectivity by hitting the accounts:lookup endpoint
 * with a dummy token. A INVALID_ID_TOKEN response means Firebase is reachable.
 */
const testFirebaseConnection = async () => {
  const response = await axios.post(
    `https://identitytoolkit.googleapis.com/v1/accounts:lookup?key=${FIREBASE_API_KEY}`,
    { idToken: 'test' }
  ).catch(err => err.response);

  const errorCode = response?.data?.error?.message;

  // INVALID_ID_TOKEN means Firebase API is reachable and the key is valid
  if (errorCode === 'INVALID_ID_TOKEN') return true;

  // API_KEY_INVALID means the key is wrong
  if (errorCode === 'API_KEY_INVALID') throw new Error('Firebase API key is invalid');

  throw new Error(`Firebase unreachable: ${errorCode || 'unknown error'}`);
};

module.exports = { verifyFirebaseToken, testFirebaseConnection };
