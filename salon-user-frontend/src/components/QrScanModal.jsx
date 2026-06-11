import { useEffect, useRef, useState } from "react";
import { X, ScanLine, ImageUp } from "lucide-react";

// Pulls a UPI ID (VPA) out of any scanned QR text.
// UPI payment QRs encode "upi://pay?pa=<vpa>&pn=..."; plain QRs may hold a raw VPA.
export function extractUpiId(text) {
  if (!text) return null;
  const paMatch = text.match(/[?&]pa=([^&]+)/i);
  const candidate = paMatch ? decodeURIComponent(paMatch[1]) : text;
  const vpa = candidate.match(/[\w.\-]{2,256}@[a-zA-Z]{2,64}/);
  return vpa ? vpa[0] : null;
}

// Live camera QR scanner using the native BarcodeDetector API, with an
// image-upload fallback. Calls onResult(upiId) when a UPI QR is recognised.
export default function QrScanModal({ onResult, onClose }) {
  const videoRef = useRef(null);
  const streamRef = useRef(null);
  const stopRef = useRef(false);
  const fileRef = useRef(null);
  const [error, setError] = useState("");
  const [supported] = useState(() => typeof window !== "undefined" && "BarcodeDetector" in window);

  useEffect(() => {
    if (!supported) return;
    stopRef.current = false;
    let detector;
    try {
      detector = new window.BarcodeDetector({ formats: ["qr_code"] });
    } catch {
      setError("QR scanning is not supported on this browser. Type the UPI ID instead.");
      return;
    }

    (async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: "environment" },
        });
        streamRef.current = stream;
        if (!videoRef.current) return;
        videoRef.current.srcObject = stream;
        await videoRef.current.play();

        const scan = async () => {
          if (stopRef.current || !videoRef.current) return;
          try {
            const codes = await detector.detect(videoRef.current);
            const upi = extractUpiId(codes[0]?.rawValue);
            if (upi) {
              stopRef.current = true;
              onResult(upi);
              return;
            }
            if (codes.length > 0) setError("That QR has no UPI ID. Scan a UPI payment QR.");
          } catch {
            // detector can throw while the video warms up — keep polling
          }
          setTimeout(scan, 300);
        };
        scan();
      } catch {
        setError("Camera access denied. Allow camera permission or type the UPI ID.");
      }
    })();

    return () => {
      stopRef.current = true;
      streamRef.current?.getTracks().forEach(t => t.stop());
    };
  }, [supported, onResult]);

  const scanImageFile = async (file) => {
    if (!file || !supported) return;
    setError("");
    try {
      const bitmap = await createImageBitmap(file);
      const detector = new window.BarcodeDetector({ formats: ["qr_code"] });
      const codes = await detector.detect(bitmap);
      const upi = extractUpiId(codes[0]?.rawValue);
      if (upi) onResult(upi);
      else setError(codes.length ? "That QR has no UPI ID. Use a UPI payment QR." : "No QR code found in that image.");
    } catch {
      setError("Could not read that image. Try another one.");
    }
  };

  return (
    <div
      onClick={onClose}
      style={{ position: "fixed", inset: 0, zIndex: 600, background: "rgba(0,0,0,0.75)", display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }}
    >
      <div onClick={e => e.stopPropagation()} style={{
        width: "100%", maxWidth: 400, borderRadius: 18, overflow: "hidden",
        background: "var(--t-card)", border: "1px solid var(--t-border)",
      }}>
        <div style={{ display: "flex", alignItems: "center", padding: "12px 14px", borderBottom: "1px solid var(--t-border)" }}>
          <ScanLine size={16} style={{ color: "#8b5cf6", marginRight: 8 }} />
          <span style={{ flex: 1, fontSize: 14, fontWeight: 700, color: "var(--t-text)" }}>Scan UPI QR</span>
          <button onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--t-text-3)", padding: 4 }}>
            <X size={18} />
          </button>
        </div>

        {supported ? (
          <div style={{ position: "relative", background: "#000" }}>
            <video ref={videoRef} muted playsInline style={{ width: "100%", height: 280, objectFit: "cover", display: "block" }} />
            <div style={{
              position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", pointerEvents: "none",
            }}>
              <div style={{ width: 190, height: 190, border: "2.5px solid rgba(139,92,246,0.9)", borderRadius: 18 }} />
            </div>
          </div>
        ) : (
          <p style={{ padding: "20px 16px", fontSize: 13, color: "var(--t-text-2)", lineHeight: 1.6 }}>
            Live scanning is not supported on this browser. Upload a photo of the QR instead, or type the UPI ID manually.
          </p>
        )}

        <div style={{ padding: "12px 14px" }}>
          {error && <p style={{ fontSize: 12, color: "#f87171", marginBottom: 8 }}>{error}</p>}
          <p style={{ fontSize: 11.5, color: "var(--t-text-3)", marginBottom: 10 }}>
            Point the camera at any UPI QR (PhonePe, GPay, Paytm, bank QR). The UPI ID is read automatically.
          </p>
          {supported && (
            <>
              <button
                onClick={() => fileRef.current?.click()}
                style={{
                  display: "flex", alignItems: "center", justifyContent: "center", gap: 8, width: "100%",
                  height: 40, borderRadius: 10, fontSize: 13, fontWeight: 600,
                  background: "var(--t-input-bg)", border: "1px solid var(--t-border)", color: "var(--t-text-2)", cursor: "pointer",
                }}
              >
                <ImageUp size={15} /> Scan from an image instead
              </button>
              <input ref={fileRef} type="file" accept="image/*" hidden onChange={e => scanImageFile(e.target.files?.[0])} />
            </>
          )}
        </div>
      </div>
    </div>
  );
}
