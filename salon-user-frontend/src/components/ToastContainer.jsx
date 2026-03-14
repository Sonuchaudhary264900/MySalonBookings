import { useNotifications } from "../context/NotificationContext";

const STYLES = {
  success: "bg-green-600 text-white",
  error:   "bg-red-600 text-white",
  info:    "bg-indigo-600 text-white",
  warning: "bg-amber-500 text-white",
};

const ICONS = {
  success: "✓",
  error:   "✕",
  info:    "ℹ",
  warning: "⚠",
};

export default function ToastContainer() {
  const { toasts, removeToast } = useNotifications();
  if (!toasts.length) return null;

  return (
    <div className="fixed bottom-6 right-4 z-[9999] flex flex-col gap-2 max-w-sm w-full px-4 pointer-events-none">
      {toasts.map((t) => (
        <div
          key={t.id}
          className={`flex items-center gap-3 px-4 py-3 rounded-xl shadow-lg text-sm font-medium fade-in pointer-events-auto ${STYLES[t.type] || STYLES.info}`}
        >
          <span className="text-base shrink-0 w-5 text-center">{ICONS[t.type] || ICONS.info}</span>
          <span className="flex-1">{t.message}</span>
          <button
            onClick={() => removeToast(t.id)}
            className="shrink-0 opacity-70 hover:opacity-100 transition text-base leading-none"
          >
            ✕
          </button>
        </div>
      ))}
    </div>
  );
}
