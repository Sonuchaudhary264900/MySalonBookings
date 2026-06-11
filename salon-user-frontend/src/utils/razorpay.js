// Loads the Razorpay Checkout script once and resolves true/false on availability
let razorpayPromise = null;

export function loadRazorpay() {
  if (window.Razorpay) return Promise.resolve(true);
  if (razorpayPromise) return razorpayPromise;

  razorpayPromise = new Promise((resolve) => {
    const script = document.createElement("script");
    script.src = "https://checkout.razorpay.com/v1/checkout.js";
    script.onload = () => resolve(true);
    script.onerror = () => resolve(false);
    document.body.appendChild(script);
  });

  return razorpayPromise;
}

export const RAZORPAY_KEY_ID = import.meta.env.VITE_RAZORPAY_KEY_ID || "";
