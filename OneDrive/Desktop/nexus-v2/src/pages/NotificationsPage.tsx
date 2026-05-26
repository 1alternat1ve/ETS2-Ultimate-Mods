import { useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Bell,
  CheckCheck,
  Trash2,
  Info,
  AlertTriangle,
  CheckCircle,
  XCircle,
} from "lucide-react";
import { useNotifications, type AppNotification, type NotificationType } from "../context/NotificationsContext";
import { useI18n } from "../context/I18nContext";

function timeAgo(timestamp: number): string {
  const seconds = Math.floor((Date.now() - timestamp) / 1000);
  if (seconds < 60) return "только что";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes} мин назад`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} ч назад`;
  const days = Math.floor(hours / 24);
  return `${days} дн назад`;
}

const TYPE_CONFIG: Record<
  NotificationType,
  { Icon: typeof Info; color: string; bg: string; border: string }
> = {
  info: {
    Icon: Info,
    color: "var(--accent)",
    bg: "rgba(45, 212, 191, 0.08)",
    border: "rgba(45, 212, 191, 0.20)",
  },
  success: {
    Icon: CheckCircle,
    color: "var(--success)",
    bg: "rgba(46, 204, 113, 0.08)",
    border: "rgba(46, 204, 113, 0.20)",
  },
  error: {
    Icon: XCircle,
    color: "var(--error)",
    bg: "rgba(231, 76, 60, 0.08)",
    border: "rgba(231, 76, 60, 0.20)",
  },
  warn: {
    Icon: AlertTriangle,
    color: "var(--warn)",
    bg: "rgba(241, 196, 15, 0.08)",
    border: "rgba(241, 196, 15, 0.20)",
  },
};

function NotificationCard({ notification }: { notification: AppNotification }) {
  const { markRead, remove } = useNotifications();
  const cfg = TYPE_CONFIG[notification.type];
  const Icon = cfg.Icon;

  useEffect(() => {
    if (!notification.read) {
      markRead(notification.id);
    }
  }, []);

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 8, scale: 0.98 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, x: -20, scale: 0.95 }}
      transition={{ type: "spring", stiffness: 300, damping: 28 }}
      style={{
        display: "flex",
        alignItems: "flex-start",
        gap: 12,
        padding: "14px 16px",
        borderRadius: 14,
        background: notification.read
          ? "rgba(255, 255, 255, 0.03)"
          : "rgba(45, 212, 191, 0.05)",
        border: notification.read
          ? "1px solid rgba(255, 255, 255, 0.06)"
          : `1px solid ${cfg.border}`,
        backdropFilter: "blur(16px)",
        WebkitBackdropFilter: "blur(16px)",
        position: "relative",
        overflow: "hidden",
        cursor: "default",
      }}
    >
      {/* Unread dot */}
      {!notification.read && (
        <div
          style={{
            position: "absolute",
            top: 16,
            right: 16,
            width: 8,
            height: 8,
            borderRadius: "50%",
            background: "var(--accent)",
            boxShadow: "0 0 6px var(--accent)",
          }}
        />
      )}

      {/* Icon */}
      <div
        style={{
          width: 36,
          height: 36,
          borderRadius: 10,
          background: cfg.bg,
          border: `1px solid ${cfg.border}`,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          flexShrink: 0,
        }}
      >
        <Icon size={16} color={cfg.color} />
      </div>

      {/* Content */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div
          style={{
            fontSize: 13,
            fontWeight: 600,
            color: "var(--text-main)",
            marginBottom: 3,
          }}
        >
          {notification.title}
        </div>
        <div
          style={{
            fontSize: 12,
            color: "var(--text-muted)",
            lineHeight: 1.4,
          }}
        >
          {notification.body}
        </div>
        <div
          style={{
            fontSize: 10,
            color: "var(--text-ghost)",
            marginTop: 6,
            fontFamily: "var(--font-mono)",
          }}
        >
          {timeAgo(notification.timestamp)}
        </div>
        {notification.action && (
          <button
            onClick={(e) => { e.stopPropagation(); notification.action?.(); }}
            style={{
              marginTop: 6,
              padding: "4px 12px",
              fontSize: 11,
              fontWeight: 700,
              color: "var(--accent)",
              background: "rgba(45, 212, 191, 0.12)",
              border: "1px solid rgba(45, 212, 191, 0.3)",
              borderRadius: 6,
              cursor: "pointer",
              fontFamily: "var(--font-mono)",
              letterSpacing: "0.05em",
              textTransform: "uppercase",
            }}
          >
            Обновить
          </button>
        )}
      </div>

      {/* Remove button */}
      <button
        onClick={() => remove(notification.id)}
        style={{
          background: "none",
          border: "none",
          cursor: "pointer",
          color: "var(--text-ghost)",
          padding: 4,
          flexShrink: 0,
          opacity: 0.4,
          transition: "opacity 0.15s, color 0.15s",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          borderRadius: 6,
        }}
        onMouseEnter={(e) => {
          (e.currentTarget as HTMLElement).style.opacity = "1";
          (e.currentTarget as HTMLElement).style.color = "var(--danger)";
        }}
        onMouseLeave={(e) => {
          (e.currentTarget as HTMLElement).style.opacity = "0.4";
          (e.currentTarget as HTMLElement).style.color = "var(--text-ghost)";
        }}
        title="Удалить"
      >
        <Trash2 size={14} />
      </button>
    </motion.div>
  );
}

export function NotificationsPage() {
  const { notifications, markAllRead, clear, unreadCount } = useNotifications();
  const t = useI18n();

  return (
    <div className="page-pad">
      {/* Header */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 12,
          marginBottom: 24,
        }}
      >
        <div
          style={{
            width: 40,
            height: 40,
            borderRadius: 12,
            background: "rgba(45, 212, 191, 0.10)",
            border: "1px solid rgba(45, 212, 191, 0.20)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <Bell size={18} color="var(--accent)" />
        </div>
        <div>
          <h1
            style={{
              fontSize: 18,
              fontWeight: 700,
              color: "var(--text-main)",
              margin: 0,
            }}
          >
            {t("notificationsTitle")}
          </h1>
          {unreadCount > 0 && (
            <span
              style={{
                fontSize: 11,
                color: "var(--text-ghost)",
                fontFamily: "var(--font-mono)",
              }}
            >
              {unreadCount} непрочитанных
            </span>
          )}
        </div>

        {/* Actions */}
        {notifications.length > 0 && (
          <div style={{ display: "flex", gap: 8, marginLeft: "auto" }}>
            <button
              className="btn btn-ghost"
              onClick={markAllRead}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 6,
                fontSize: 12,
                padding: "6px 12px",
              }}
            >
              <CheckCheck size={13} />
              {t("markAllRead")}
            </button>
            <button
              className="btn btn-ghost"
              onClick={clear}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 6,
                fontSize: 12,
                padding: "6px 12px",
                color: "var(--error)",
              }}
            >
              <Trash2 size={13} />
              {t("clearAll")}
            </button>
          </div>
        )}
      </div>

      {/* Content */}
      {notifications.length === 0 ? (
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            padding: "60px 20px",
            gap: 16,
          }}
        >
          <div
            style={{
              width: 72,
              height: 72,
              borderRadius: 20,
              background: "rgba(20, 29, 53, 0.6)",
              backdropFilter: "blur(20px)",
              border: "1px solid rgba(255, 255, 255, 0.08)",
              borderLeft: "3px solid var(--accent)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <Bell size={28} color="var(--accent)" style={{ opacity: 0.6 }} />
          </div>
          <div
            style={{
              fontSize: 15,
              fontWeight: 600,
              color: "var(--text-muted)",
              textAlign: "center",
            }}
          >
            {t("noNotifications")}
          </div>
          <div
            style={{
              fontSize: 12,
              color: "var(--text-dim)",
              textAlign: "center",
            }}
          >
            Уведомления о загрузках, обновлениях и событиях появятся здесь
          </div>
        </motion.div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          <AnimatePresence mode="popLayout">
            {notifications.map((n) => (
              <NotificationCard key={n.id} notification={n} />
            ))}
          </AnimatePresence>
        </div>
      )}
    </div>
  );
}
