import React from 'react';
import { Modal, View, TouchableOpacity, ActivityIndicator, StyleSheet, Linking } from 'react-native';
import { WebView } from 'react-native-webview';
import { Ionicons } from '@expo/vector-icons';
import AppText from './AppText';
import { useTheme } from '../context/ThemeContext';

// Renders Razorpay's hosted Checkout inside a WebView and relays the
// result back via postMessage — used because react-native-razorpay
// (native module) isn't installed in this Expo app.
export default function RazorpayCheckout({ visible, order, prefill, description, onSuccess, onDismiss, onFailure }) {
  const { theme } = useTheme();

  if (!order) return null;

  const html = `
    <!DOCTYPE html>
    <html>
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <script src="https://checkout.razorpay.com/v1/checkout.js"></script>
      </head>
      <body style="margin:0;background:#fff;">
        <script>
          var options = {
            key: ${JSON.stringify(order.key)},
            amount: ${JSON.stringify(order.amount)},
            currency: ${JSON.stringify(order.currency)},
            order_id: ${JSON.stringify(order.orderId)},
            name: "GlowLoox",
            description: ${JSON.stringify(description || '')},
            prefill: ${JSON.stringify(prefill || {})},
            theme: { color: "#8b5cf6" },
            handler: function (response) {
              window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'success', ...response }));
            },
            modal: {
              ondismiss: function () {
                window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'dismiss' }));
              }
            }
          };
          var rzp = new Razorpay(options);
          rzp.on('payment.failed', function (resp) {
            window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'failed', error: resp.error }));
          });
          rzp.open();
        </script>
      </body>
    </html>
  `;

  const handleMessage = (event) => {
    try {
      const data = JSON.parse(event.nativeEvent.data);
      if (data.type === 'success') {
        onSuccess?.(data);
      } else if (data.type === 'failed') {
        onFailure?.(data.error);
      } else {
        onDismiss?.();
      }
    } catch {
      onDismiss?.();
    }
  };

  // UPI apps (GPay/PhonePe/Paytm) are launched via non-http deep links the
  // WebView can't load — hand them to the OS and keep checkout open.
  const handleShouldStartLoad = (request) => {
    const url = request.url || '';
    if (/^(https?:|about:|data:)/.test(url)) return true;
    Linking.openURL(url).catch(() => {});
    return false;
  };

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onDismiss}>
      <View style={[styles.header, { backgroundColor: theme.card, borderBottomColor: theme.border }]}>
        <TouchableOpacity onPress={onDismiss} style={styles.closeBtn}>
          <Ionicons name="close" size={24} color={theme.text} />
        </TouchableOpacity>
        <AppText style={[styles.title, { color: theme.text }]}>Complete Payment</AppText>
        <View style={{ width: 38 }} />
      </View>
      <WebView
        source={{ html, baseUrl: 'https://mysalonbookings.com' }}
        originWhitelist={['*']}
        onMessage={handleMessage}
        onShouldStartLoadWithRequest={handleShouldStartLoad}
        domStorageEnabled
        startInLoadingState
        renderLoading={() => (
          <View style={styles.loading}>
            <ActivityIndicator size="large" color="#8b5cf6" />
          </View>
        )}
      />
    </Modal>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 14, paddingTop: 48, borderBottomWidth: 1 },
  closeBtn: { width: 38, height: 38, borderRadius: 19, alignItems: 'center', justifyContent: 'center' },
  title: { fontSize: 16, fontWeight: '700' },
  loading: { ...StyleSheet.absoluteFillObject, alignItems: 'center', justifyContent: 'center', backgroundColor: '#fff' },
});
