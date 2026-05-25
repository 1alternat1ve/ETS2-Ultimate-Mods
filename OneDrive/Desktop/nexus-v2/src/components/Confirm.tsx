import { AnimatePresence, motion } from "framer-motion";
import { createContext, useCallback, useContext, useState } from "react";
import { AlertTriangle, CheckCircle2, Info, XCircle } from "lucide-react";

type Variant = "info" | "success" | "warn" | "danger";

type Request = {
  title: string;
  message: string;
  variant?: Variant;
  confirmLabel?: string;
  cancelLabel?: string;
  resolve: (ok: boolean) => void;
};

const ConfirmCtx = createContext<((opts: Omit<Request, "resolve">) => Promise<boolean>) | null>(null);

export function useConfirm() {
  const fn = useContext(ConfirmCtx);
  if (!fn) throw new Error("useConfirm must be used within ConfirmProvider");
  return fn;
}

const ICON: Record<Variant, typeof Info> = {
  info: Info,
  success: CheckCircle2,
  warn: AlertTriangle,
  danger: XCircle,
};

const COLOR: Record<Variant, string> = {
  info: "var(--info)",
  success: "var(--success)",
  warn: "var(--warn)",
  danger: "var(--danger)",
};

const BG_SOFT: Record<Variant, string> = {
  info: "var(--info-soft)",
  success: "var(--success-soft)",
  warn: "var(--warn-soft)",
  danger: "var(--danger-soft)",
};

export function ConfirmProvider({ children }: { children: React.ReactNode }) {
  const [req, setReq] = useState<Request | null>(null);

  const confirm = useCallback(
    (opts: Omit<Request, "resolve">) =>
      new Promise<boolean>((resolve) => setReq({ ...opts, resolve })),
    []
  );

  function answer(ok: boolean) {
    req?.resolve(ok);
    setReq(null);
  }

  const variant = req?.variant ?? "warn";
  const Icon = ICON[variant];
  const color = COLOR[variant];
  const bgSoft = BG_SOFT[variant];

  return (
    <ConfirmCtx.Provider value={confirm}>
      {children}
      <AnimatePresence>
        {req && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.18 }}
            onClick={() => answer(false)}
            style={{
              position: "fixed",
              inset: 0,
              background: "rgba(2, 5, 12, 0.65)",
              backdropFilter: "blur(14px)",
              WebkitBackdropFilter: "blur(14px)",
              zIndex: 950,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              padding: 20,
            }}
          >
            <motion.div
              onClick={(e) => e.stopPropagation()}
              initial={{ scale: 0.90, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.90, opacity: 0, y: 16 }}
              transition={{ type: "spring", stiffness: 260, damping: 22 }}
              whileHover={{ scale: 1.005 }}
              style={{
                width: "100%",
                maxWidth: 460,
                background: "rgba(20, 29, 53, 0.90)",
                backdropFilter: "blur(24px)",
                WebkitBackdropFilter: "blur(24px)",
                border: "1px solid rgba(255, 255, 255, 0.10)",
                borderRadius: 18,
                boxShadow: "0 24px 64px rgba(0, 0, 0, 0.55), 0 0 0 1px rgba(255,255,255,0.03) inset, 0 0 40px rgba(45,212,191,0.04)",
                overflow: "hidden",
              }}
            >
              {/* Header */}
              <div
                style={{
                  padding: "24px 26px 20px",
                  display: "flex",
                  alignItems: "flex-start",
                  gap: 14,
                  background: `linear-gradient(135deg, ${bgSoft} 0%, transparent 70%)`,
                  borderBottom: "1px solid rgba(255, 255, 255, 0.06)",
                }}
              >
                <div
                  style={{
                    width: 46,
                    height: 46,
                    borderRadius: 14,
                    background: bgSoft,
                    border: `1px solid ${color}35`,
                    color: color,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    flexShrink: 0,
                    boxShadow: `0 0 20px ${color}18`,
                  }}
                >
                  <Icon size={21} strokeWidth={2} />
                </div>
                <div style={{ flex: 1, paddingTop: 2 }}>
                  <div
                    style={{
                      fontSize: 16,
                      fontWeight: 800,
                      letterSpacing: "-0.01em",
                      color: "var(--text-main)",
                    }}
                  >
                    {req.title}
                  </div>
                  <div
                    style={{
                      fontSize: 13,
                      color: "var(--text-muted)",
                      lineHeight: 1.55,
                      marginTop: 6,
                      whiteSpace: "pre-line",
                    }}
                  >
                    {req.message}
                  </div>
                </div>
              </div>

              {/* Footer */}
              <div
                style={{
                  padding: "16px 20px",
                  display: "flex",
                  justifyContent: "flex-end",
                  gap: 8,
                  background: "rgba(0, 0, 0, 0.18)",
                }}
              >
                <motion.button
                  onClick={() => answer(false)}
                  whileHover={{ scale: 1.025, y: -1 }}
                  whileTap={{ scale: 0.97 }}
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: 6,
                    padding: "9px 18px",
                    borderRadius: 11,
                    fontWeight: 600,
                    fontSize: 13,
                    background: "rgba(255, 255, 255, 0.04)",
                    color: "var(--text-muted)",
                    border: "1px solid rgba(255, 255, 255, 0.08)",
                    cursor: "pointer",
                    transition: "color 0.15s, border-color 0.15s, background 0.15s, box-shadow 0.15s",
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.color = "var(--text-main)";
                    e.currentTarget.style.borderColor = "rgba(255, 255, 255, 0.14)";
                    e.currentTarget.style.background = "rgba(255, 255, 255, 0.07)";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.color = "var(--text-muted)";
                    e.currentTarget.style.borderColor = "rgba(255, 255, 255, 0.08)";
                    e.currentTarget.style.background = "rgba(255, 255, 255, 0.04)";
                  }}
                >
                  {req.cancelLabel ?? "Отмена"}
                </motion.button>
                <motion.button
                  onClick={() => answer(true)}
                  whileHover={{ scale: 1.025, y: -1 }}
                  whileTap={{ scale: 0.97 }}
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: 7,
                    padding: "9px 20px",
                    borderRadius: 11,
                    fontWeight: 700,
                    fontSize: 13,
                    background: color,
                    color: "#fff",
                    border: "none",
                    cursor: "pointer",
                    transition: "filter 0.15s, box-shadow 0.15s",
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.filter = "brightness(1.12)";
                    e.currentTarget.style.boxShadow = `0 8px 24px ${color}45`;
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.filter = "none";
                    e.currentTarget.style.boxShadow = "none";
                  }}
                >
                  {req.confirmLabel ?? "Подтвердить"}
                </motion.button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </ConfirmCtx.Provider>
  );
}
