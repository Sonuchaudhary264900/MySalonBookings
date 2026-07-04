import { NativeModules, Platform } from 'react-native';

const { PhoneNumberHint } = NativeModules;

// Thin JS wrapper around the native PhoneNumberHintModule (see
// android/.../PhoneNumberHintModule.kt). Mirrors the expo-phone-number-hint
// API shape so both apps' auth screens share the same call pattern.
export async function isAvailableAsync() {
  if (Platform.OS !== 'android' || !PhoneNumberHint) return false;
  try {
    return await PhoneNumberHint.isAvailable();
  } catch {
    return false;
  }
}

export async function showPhoneNumberHintAsync() {
  if (Platform.OS !== 'android' || !PhoneNumberHint) return null;
  try {
    return await PhoneNumberHint.showPhoneNumberHint();
  } catch {
    return null;
  }
}
