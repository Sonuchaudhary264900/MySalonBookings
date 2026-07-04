package com.mysalonbookings.user

import android.app.Activity
import android.content.Intent
import android.content.IntentSender
import com.facebook.react.bridge.ActivityEventListener
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod
import com.google.android.gms.auth.api.identity.GetPhoneNumberHintIntentRequest
import com.google.android.gms.auth.api.identity.Identity

// Wraps Google Play Services' Phone Number Hint API (Identity.getSignInClient)
// so the phone-entry screen can offer the user's SIM/Google-saved number
// instead of forcing manual typing. Not part of Firebase Auth — a separate
// Play Services Identity API — so it needs its own small native module.
class PhoneNumberHintModule(reactContext: ReactApplicationContext) :
  ReactContextBaseJavaModule(reactContext), ActivityEventListener {

  private var hintPromise: Promise? = null

  companion object {
    const val REQUEST_PHONE_HINT = 48174
  }

  init {
    reactContext.addActivityEventListener(this)
  }

  override fun getName() = "PhoneNumberHint"

  @ReactMethod
  fun isAvailable(promise: Promise) {
    promise.resolve(currentActivity != null)
  }

  @ReactMethod
  fun showPhoneNumberHint(promise: Promise) {
    val activity = currentActivity
    if (activity == null) {
      promise.resolve(null)
      return
    }
    hintPromise = promise
    val request = GetPhoneNumberHintIntentRequest.builder().build()
    Identity.getSignInClient(activity)
      .getPhoneNumberHintIntent(request)
      .addOnSuccessListener { result ->
        try {
          activity.startIntentSenderForResult(result.intentSender, REQUEST_PHONE_HINT, null, 0, 0, 0)
        } catch (e: IntentSender.SendIntentException) {
          hintPromise?.resolve(null)
          hintPromise = null
        }
      }
      .addOnFailureListener {
        hintPromise?.resolve(null)
        hintPromise = null
      }
  }

  override fun onActivityResult(activity: Activity?, requestCode: Int, resultCode: Int, data: Intent?) {
    if (requestCode != REQUEST_PHONE_HINT) return
    try {
      val phoneNumber = Identity.getSignInClient(reactApplicationContext).getPhoneNumberFromIntent(data)
      hintPromise?.resolve(phoneNumber)
    } catch (e: Exception) {
      hintPromise?.resolve(null)
    }
    hintPromise = null
  }

  override fun onNewIntent(intent: Intent?) {}
}
