import { motion } from "framer-motion";

export function SplashScreen() {
  return (
    <motion.div
      initial={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
      style={{
        position: "fixed",
        inset: 0,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        background: "var(--bg-primary)",
        zIndex: 100,
        overflow: "hidden",
      }}
    >
      {/* Grid texture */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          backgroundImage:
            "linear-gradient(rgba(255,255,255,0.025) 1px, transparent 1px)," +
            "linear-gradient(90deg, rgba(255,255,255,0.025) 1px, transparent 1px)",
          backgroundSize: "40px 40px",
        }}
      />

      {/* Teal radial glow */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          background: "radial-gradient(ellipse at center, rgba(45,212,191,0.10) 0%, transparent 55%)",
        }}
      />

      {/* Outer glow ring */}
      <div
        style={{
          position: "absolute",
          width: 200,
          height: 200,
          borderRadius: "50%",
          border: "1px solid rgba(45,212,191,0.12)",
          animation: "pulse-ring 2.5s ease-in-out infinite",
        }}
      />

      {/* Logo mark with glow */}
      <motion.div
        initial={{ scale: 0.5, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ type: "spring", stiffness: 180, damping: 16, delay: 0.05 }}
        style={{
          width: 80,
          height: 80,
          borderRadius: 18,
          background: "var(--accent)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontSize: 38,
          fontWeight: 900,
          color: "#0b1120",
          marginBottom: 20,
          position: "relative",
          zIndex: 2,
          boxShadow: "0 16px 48px rgba(45,212,191,0.30), 0 0 80px rgba(45,212,191,0.15)",
        }}
      >
        <motion.div
          animate={{ scale: [1, 1.08, 1] }}
          transition={{ duration: 2.5, repeat: Infinity, ease: "easeInOut" }}
          style={{ display: "flex", alignItems: "center", justifyContent: "center", width: "100%", height: "100%" }}
        >
          N
        </motion.div>
      </motion.div>

      <motion.div
        initial={{ y: 12, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.25, duration: 0.5 }}
        style={{ textAlign: "center", zIndex: 2 }}
      >
        <div
          style={{
            fontSize: 28,
            fontWeight: 800,
            letterSpacing: "0.08em",
            fontFamily: "var(--font-mono)",
            color: "var(--text-main)",
          }}
        >
          NEXUS
          <span
            style={{
              color: "var(--accent)",
              marginLeft: 8,
              fontWeight: 400,
            }}
          >
            v2
          </span>
        </div>
        <div
          className="mono caps dim"
          style={{ marginTop: 8, fontSize: 11, letterSpacing: "0.2em" }}
        >
          ETS2 MOD LAUNCHER
        </div>
      </motion.div>

      {/* Loading line */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.6 }}
        style={{
          position: "absolute",
          bottom: 48,
          display: "flex",
          alignItems: "center",
          gap: 12,
          zIndex: 2,
        }}
      >
        <motion.div
          animate={{ opacity: [1, 0.3, 1] }}
          transition={{ duration: 1.2, repeat: Infinity }}
          style={{
            width: 6,
            height: 6,
            borderRadius: "50%",
            background: "var(--accent)",
          }}
        />
        <span
          className="mono dim"
          style={{ fontSize: 11, letterSpacing: "0.15em" }}
        >
          INITIALIZING MODULES
        </span>
      </motion.div>

      <style>{`
        @keyframes pulse-ring {
          0%, 100% { transform: scale(1); opacity: 0.6; }
          50% { transform: scale(1.12); opacity: 0.2; }
        }
      `}</style>
    </motion.div>
  );
}
