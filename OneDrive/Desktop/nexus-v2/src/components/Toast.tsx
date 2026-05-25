import { AnimatePresence, motion } from "framer-motion";
import { CheckCircle2, Info, AlertTriangle, XCircle, X } from "lucide-react";
import { createContext, useCallback, useContext, useState } from "react";
import { useI18n } from "../context/I18nContext";

export type ToastVariant = "info" | "success" | "warn" | "error";

type ToastItem = {
  id: number;
  text: string;
  variant: ToastVariant;
  duration: number;
};

type ToastCtx = {
  push: (text: string, opts?: { variant?: ToastVariant; duration?: number }) => void;
};

const ToastContext = createContext<ToastCtx | null>(null);

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error("useToast must be used within ToastProvider");
  return ctx;
}

const ICONS = {
  info: Info,
  success: CheckCircle2,
  warn: AlertTriangle,
  error: XCircle,
};

const COLORS: Record<ToastVariant, string> = {
  info: "var(--info)",
  success: "var(--success)",
  warn: "var(--warn)",
  error: "var(--danger)",
};

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const push = useCallback(
    (text: string, opts?: { variant?: ToastVariant; duration?: number }) => {
      const id = Date.now() + Math.random();
      const item: ToastItem = {
        id,
        text,
        variant: opts?.variant ?? "info",
        duration: opts?.duration ?? 3500,
      };
      setToasts((prev) => [...prev, item]);
      setTimeout(() => {
        setToasts((prev) => prev.filter((t) => t.id !== id));
      }, item.duration);
    },
    []
  );

  return (
    <ToastContext.Provider value={{ push }}>
      {children}
      <div
        style={{
          position: "fixed",
          right: 24,
          bottom: 24,
          display: "flex",
          flexDirection: "column-reverse",
          gap: 10,
          zIndex: 9999,
          pointerEvents: "none",
        }}
      >
        <AnimatePresence>
          {toasts.map((t) => {
            const Icon = ICONS[t.variant];
            const color = COLORS[t.variant];
            return (
              <motion.div
                key={t.id}
                initial={{ opacity: 0, x: 50, scale: 0.92, y: 0 }}
                animate={{ opacity: 1, x: 0, scale: 1, y: 0 }}
                exit={{ opacity: 0, x: 50, scale: 0.88, y: 0 }}
                transition={{ type: "spring", stiffness: 260, damping: 22 }}
                whileHover={{ scale: 1.025, y: -2 }}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 12,
                  padding: "13px 16px",
                  background: "rgba(20, 29, 53, 0.80)",
                  backdropFilter: "blur(24px)",
                  WebkitBackdropFilter: "blur(24px)",
                  border: "1px solid rgba(255, 255, 255, 0.10)",
                  borderLeft: `3px solid ${color}`,
                  borderRadius: 14,
                  boxShadow: "0 8px 32px rgba(0, 0, 0, 0.40), 0 0 0 1px rgba(255,255,255,0.04) inset, 0 0 20px rgba(45,212,191,0.05)",
                  minWidth: 280,
                  maxWidth: 420,
                  pointerEvents: "auto",
                }}
              >
                <Icon size={18} color={color} strokeWidth={2} />
                <div style={{ flex: 1, fontSize: 13, color: "var(--text-main)", lineHeight: 1.45 }}>
                  {t.text}
                </div>
                <motion.button
                  whileHover={{ scale: 1.12 }}
                  whileTap={{ scale: 0.92 }}
                  onClick={() => setToasts((prev) => prev.filter((x) => x.id !== t.id))}
                  aria-label="закрыть"
                  style={{
                    width: 26,
                    height: 26,
                    borderRadius: 8,
                    border: "1px solid rgba(255,255,255,0.08)",
                    background: "rgba(255,255,255,0.04)",
                    color: "var(--text-dim)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    cursor: "pointer",
                    flexShrink: 0,
                    transition: "color 0.15s, border-color 0.15s, background 0.15s",
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.color = "var(--text-main)";
                    e.currentTarget.style.borderColor = "rgba(255,255,255,0.15)";
                    e.currentTarget.style.background = "rgba(255,255,255,0.08)";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.color = "var(--text-dim)";
                    e.currentTarget.style.borderColor = "rgba(255,255,255,0.08)";
                    e.currentTarget.style.background = "rgba(255,255,255,0.04)";
                  }}
                >
                  <X size={13} />
                </motion.button>
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>
    </ToastContext.Provider>
  );
}
