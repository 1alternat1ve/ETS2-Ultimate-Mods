import { useEffect, useState, useRef, useCallback } from "react";
import { motion } from "framer-motion";
import { Cloud, HardDrive, RefreshCw, User as UserIcon } from "lucide-react";
import { realTauri, type ProfileInfo } from "../api/tauri";
import { formatRelativeDate } from "../lib/format";

export function ProfileSelector({
  selectedProfile,
  onChange,
}: {
  selectedProfile: ProfileInfo | null;
  onChange: (profile: ProfileInfo | null) => void;
}) {
  const [profiles, setProfiles] = useState<ProfileInfo[]>([]);
  const [loading, setLoading] = useState(true);
  // selectedId — локальное визуальное состояние
  const [selectedId, setSelectedId] = useState<string | undefined>(
    selectedProfile?.id ?? undefined
  );
  // currentIdRef — всегда актуальный id выбора (не сбрасывается между рендерами)
  const currentIdRef = useRef<string | undefined>(selectedProfile?.id);
  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;

  // list_profiles("") — Rust находит Steam Cloud + локальные профили
  const refresh = useCallback(() => {
    setLoading(true);
    realTauri.list_profiles("").then((list) => {
      setProfiles(list);
      // Восстанавливаем выбранный профиль из currentIdRef или selectedProfile
      const toRestore = currentIdRef.current ?? selectedProfile?.id;
      if (toRestore && list.some((p) => p.id === toRestore)) {
        setSelectedId(toRestore);
      } else if (list.length > 0) {
        setSelectedId(undefined);
      }
      setLoading(false);
    }).catch(() => setLoading(false));
  }, [selectedProfile?.id]);

  useEffect(() => {
    refresh();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Синхронизация с родительским selectedProfile
  useEffect(() => {
    if (selectedProfile?.id && selectedProfile.id !== currentIdRef.current) {
      currentIdRef.current = selectedProfile.id;
      setSelectedId(selectedProfile.id);
    }
  }, [selectedProfile?.id]);

  // При клике — обновляем ref, state, и уведомляем родителя
  function handleSelect(p: ProfileInfo) {
    currentIdRef.current = p.id;
    setSelectedId(p.id);
    onChangeRef.current(p);
  }

  return (
    <div>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          marginBottom: 8,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <UserIcon size={13} color="var(--accent)" strokeWidth={2.5} />
          <label
            style={{
              fontSize: 10,
              fontWeight: 700,
              color: "var(--text-muted)",
              letterSpacing: "0.12em",
              textTransform: "uppercase",
            }}
          >
            Профиль игры
          </label>
        </div>
        <motion.button
          onClick={refresh}
          title="Обновить список"
          whileHover={{ scale: 1.10 }}
          whileTap={{ scale: 0.92 }}
          style={{
            width: 26,
            height: 26,
            borderRadius: 8,
            border: "1px solid rgba(255, 255, 255, 0.08)",
            background: "rgba(255, 255, 255, 0.04)",
            color: "var(--text-dim)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            cursor: "pointer",
          }}
        >
          <RefreshCw size={11} />
        </motion.button>
      </div>

      <div
        style={{
          display: "flex",
          flexDirection: "column",
          gap: 6,
          maxHeight: 220,
          overflow: "auto",
        }}
      >
        {loading && Array.from({ length: 2 }).map((_, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, y: 8, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{ delay: i * 0.06, type: "spring", stiffness: 200, damping: 20 }}
            className="shimmer"
            style={{ height: 56, borderRadius: 12, border: "1px solid rgba(255, 255, 255, 0.05)" }}
          />
        ))}
        {!loading && profiles.length === 0 && (
          <motion.div
            initial={{ opacity: 0, scale: 0.97 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ type: "spring", stiffness: 200, damping: 20 }}
            style={{
              padding: 18,
              textAlign: "center",
              fontSize: 12,
              color: "var(--text-muted)",
              background: "rgba(20, 29, 53, 0.6)",
              backdropFilter: "blur(20px)",
              borderRadius: 12,
              border: "1px dashed rgba(255, 255, 255, 0.08)",
            }}
          >
            <UserIcon size={20} style={{ marginBottom: 6, opacity: 0.5 }} />
            <div>Профили не найдены</div>
            <div
              style={{
                fontSize: 10,
                color: "var(--text-dim)",
                marginTop: 4,
                fontFamily: "var(--font-mono)",
                letterSpacing: "0.04em",
              }}
            >
              Запустите игру хотя бы один раз
            </div>
          </motion.div>
        )}
        {profiles.map((p, i) => {
          const active = selectedId === p.id;
          return (
            <motion.div
              key={p.id}
              onClick={() => handleSelect(p)}
              initial={{ opacity: 0, y: 12, scale: 0.97 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              transition={{ delay: i * 0.06, type: "spring", stiffness: 200, damping: 20 }}
              whileHover={{ scale: 1.01, y: -1 }}
              whileTap={{ scale: 0.98 }}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 12,
                padding: "10px 12px",
                borderRadius: 12,
                background: active ? "rgba(45, 212, 191, 0.12)" : "rgba(20, 29, 53, 0.6)",
                backdropFilter: "blur(20px)",
                WebkitBackdropFilter: "blur(20px)",
                border: active ? "1.5px solid rgba(45, 212, 191, 0.35)" : "1px solid rgba(255, 255, 255, 0.08)",
                color: "var(--text-main)",
                cursor: "pointer",
                textAlign: "left",
                userSelect: "none",
                boxShadow: active
                  ? "0 4px 16px rgba(0, 0, 0, 0.25), 0 0 12px rgba(45, 212, 191, 0.10)"
                  : "0 2px 6px rgba(0, 0, 0, 0.15)",
                transition: "background 0.15s, border-color 0.15s",
              }}
            >
              <div
                style={{
                  width: 34,
                  height: 34,
                  borderRadius: 10,
                  background: active
                    ? "var(--accent)"
                    : p.location === "steam_cloud"
                    ? "rgba(96, 165, 250, 0.12)"
                    : "rgba(45, 212, 191, 0.08)",
                  color: active ? "#0b1120" : p.location === "steam_cloud" ? "var(--info)" : "var(--text-muted)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  flexShrink: 0,
                  transition: "all 0.15s",
                  border: active ? "none" : "1px solid rgba(255, 255, 255, 0.06)",
                  boxShadow: active ? "0 0 14px rgba(45, 212, 191, 0.30)" : "none",
                }}
              >
                {p.location === "steam_cloud" ? <Cloud size={16} strokeWidth={active ? 2.5 : 1.8} /> : <HardDrive size={16} strokeWidth={active ? 2.5 : 1.8} />}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div
                  style={{
                    fontWeight: 700,
                    fontSize: 13,
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    whiteSpace: "nowrap",
                    color: active ? "var(--accent)" : "var(--text-main)",
                    transition: "color 0.15s",
                  }}
                >
                  {p.name}
                </div>
                <div
                  style={{
                    fontSize: 10,
                    color: "var(--text-dim)",
                    fontFamily: "var(--font-mono)",
                    letterSpacing: "0.04em",
                    marginTop: 2,
                  }}
                >
                  {p.location === "steam_cloud" ? "STEAM CLOUD" : "ЛОКАЛЬНЫЙ"} · {formatRelativeDate(p.lastModified)}
                </div>
              </div>
              {active && (
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ type: "spring", stiffness: 300, damping: 15 }}
                  style={{
                    width: 9,
                    height: 9,
                    borderRadius: "50%",
                    background: "var(--accent)",
                    boxShadow: "0 0 12px var(--accent-glow)",
                    flexShrink: 0,
                  }}
                />
              )}
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}
