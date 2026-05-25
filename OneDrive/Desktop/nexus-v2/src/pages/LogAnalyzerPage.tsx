import { useEffect, useMemo, useState } from "react";
import { ScrollText, FileSearch, AlertOctagon, AlertTriangle, Info as InfoIcon } from "lucide-react";
import { motion } from "framer-motion";
import { realTauri } from "../api/tauri";
import { useI18n } from "../context/I18nContext";

type Severity = "critical" | "high" | "medium" | "low";

type Issue = {
  id: string;
  title: string;
  severity: Severity;
  category: string;
  description: string;
  solutions: string[];
  matched: number;
};

const RULES: { id: string; title: string; severity: Severity; category: string; pattern: RegExp; description: string; solutions: string[] }[] = [
  { id: "dx11_crash", title: "Сбой DirectX 11 (нехватка VRAM)", severity: "critical", category: "Графика", pattern: /(dxgi|d3d11|DXGI_ERROR_DEVICE)/i, description: "Видеокарта не справилась с текстурами или памятью.", solutions: ["Обновите драйвер NVIDIA/AMD до последней версии", "Снизьте качество текстур в графике", "Уменьшите разрешение или MSAA"] },
  { id: "oom", title: "Недостаточно памяти", severity: "critical", category: "Ресурсы", pattern: /(Out of memory|OutOfMemory|alloc.*failed)/i, description: "Игре не хватило RAM. Часто из-за модов на карты.", solutions: ["Закройте Chrome и другие тяжёлые программы", "Увеличьте файл подкачки до 32 ГБ", "Отключите часть модов на карты"] },
  { id: "mod_corrupt", title: "Сломанный или недокачанный мод", severity: "high", category: "Моды", pattern: /(\bunit\b.*not found|parse error|read failed)/i, description: "В моде отсутствует ресурс или файл повреждён.", solutions: ["Проверьте целостность модов в инструментах", "Перезалейте проблемный мод", "Временно переименуйте mod → mod_backup"] },
  { id: "version_mismatch", title: "Несовместимая версия игры", severity: "high", category: "Совместимость", pattern: /(version.*mismatch|incompatible.*version)/i, description: "Мод требует другую версию ETS2.", solutions: ["Сверьтесь с требованиями мода (обычно в описании на сайте)", "Откатите версию игры через свойства Steam → бета-версии", "Обновите мод"] },
  { id: "save_corrupt", title: "Сохранение повреждено", severity: "high", category: "Профиль", pattern: /(save.*corrupt|profile.*broken)/i, description: "SII-файл сохранения некорректен.", solutions: ["Восстановите из автоматического бэкапа", "Проверьте Steam Cloud копии", "Найдите .bak рядом с save файлом"] },
  { id: "promods_def", title: "Отсутствует Def-файл ProMods", severity: "medium", category: "Моды", pattern: /(promods.*def.*missing|promods_def)/i, description: "Не установлен Def-пакет ProMods для вашей версии и набора DLC.", solutions: ["Сгенерируйте Def на promods.net", "Укажите версию ETS2 и список установленных DLC", "Поставьте Def выше всех других модов"] },
  { id: "navigation_building", title: "Построение кэша навигации", severity: "low", category: "Информация", pattern: /(building.*pathfinder|navigation.*cache)/i, description: "Это НЕ ошибка. После установки модов карт игра один раз строит кэш.", solutions: ["Подождите 10–15 минут — окно не закрывайте", "Не выгружайте игру через Task Manager", "В следующий запуск пройдёт за секунды"] },
  { id: "fmod_audio", title: "Сбой звукового движка FMOD", severity: "medium", category: "Звук", pattern: /(fmod|audio.*error)/i, description: "Конфликт между несколькими звуковыми модами или драйвером.", solutions: ["Отключите все звуковые моды и включайте по одному", "Обновите драйвер аудио (Realtek/Creative)", "Проверьте формат звука по умолчанию: 48000 Hz, 16 бит"] },
  { id: "tauri_panic", title: "Крах лаунчера (Rust)", severity: "critical", category: "Лаунчер", pattern: /(panic|panicked)/i, description: "Приложение неожиданно завершилось.", solutions: ["Проверьте AppData/Local/Temp/nexus/ на дампы", "Откройте issue на GitHub с приложенным логом"] },
  { id: "rust_error", title: "Ошибка Rust-команды", severity: "high", category: "Лаунчер", pattern: /thread.*panicked|error.*command/i, description: "Команда Rust вернула ошибку.", solutions: ["Проверьте консоль разработчика", "Сбросьте настройки вручную"] },
];

const SEVERITY_COLOR: Record<Severity, string> = {
  critical: "var(--danger)",
  high: "var(--warn)",
  medium: "var(--info)",
  low: "var(--text-dim)",
};
const SEVERITY_ICON: Record<Severity, typeof InfoIcon> = {
  critical: AlertOctagon,
  high: AlertTriangle,
  medium: InfoIcon,
  low: InfoIcon,
};

const springTrans = { type: "spring" as const, stiffness: 200, damping: 20 };

const glassBase = {
  background: "rgba(20, 29, 53, 0.6)",
  backdropFilter: "blur(20px)",
  WebkitBackdropFilter: "blur(20px)",
  border: "1px solid rgba(255, 255, 255, 0.08)",
};

const hoverLiftEnter = {
  background: "rgba(20, 29, 53, 0.82)",
  borderColor: "rgba(255, 255, 255, 0.13)",
  boxShadow: "0 8px 28px rgba(0, 0, 0, 0.35), 0 0 0 1px rgba(255, 255, 255, 0.04) inset",
  y: -2,
};

const hoverLiftLeave = {
  background: "rgba(20, 29, 53, 0.6)",
  borderColor: "rgba(255, 255, 255, 0.08)",
  boxShadow: "0 2px 8px rgba(0, 0, 0, 0.18), 0 0 0 1px rgba(255, 255, 255, 0.02) inset",
  y: 0,
};

const glassTransition = "all 0.25s cubic-bezier(0.34, 1.56, 0.64, 1)";

function getSeverityHexColor(severity: Severity): string {
  const map: Record<Severity, string> = {
    critical: "#fb7185",
    high: "#fbbf24",
    medium: "#60a5fa",
    low: "#4a5568",
  };
  return map[severity];
}

export function LogAnalyzerPage() {
  const [source, setSource] = useState<"game" | "crash" | "install">("game");
  const [text, setText] = useState("");
  const [installFilter, setInstallFilter] = useState("all");
  const t = useI18n();

  useEffect(() => {
    if (source === "game") realTauri.read_game_log().then(setText);
    else if (source === "crash") realTauri.read_app_crash_log().then(setText);
    else if (source === "install") realTauri.read_install_log().then(setText);
  }, [source]);

  const sourceLabels = { game: "game.log.txt", crash: "crash_log.txt", install: "install_log.txt" };
  const sourceLabelsText = { game: t("gameLog"), crash: t("crashLog"), install: t("installLog") };
  const filterLabels = { all: t("all"), errors: t("errors"), downloads: t("downloads"), skip: t("skipped") };
  const filterKeys = ["all", "errors", "downloads", "skip"] as const;

  const filteredText = useMemo(() => {
    if (source !== "install" || installFilter === "all") return text;
    const lines = text.split("\n");
    const filtered = lines.filter((line) => {
      if (installFilter === "errors") return line.includes("error") || line.includes("Error");
      if (installFilter === "downloads") return line.includes("[download]");
      if (installFilter === "skip") return line.includes("SKIP");
      return true;
    });
    return filtered.join("\n");
  }, [text, source, installFilter]);

  const issues = useMemo<Issue[]>(() => {
    const logText = source === "install" ? filteredText : text;
    const out: Issue[] = [];
    for (const rule of RULES) {
      const matches = logText.match(new RegExp(rule.pattern, "gi"));
      if (matches && matches.length > 0) {
        out.push({ ...rule, matched: matches.length });
      }
    }
    return out.sort((a, b) => {
      const order = { critical: 0, high: 1, medium: 2, low: 3 };
      return order[a.severity] - order[b.severity];
    });
  }, [filteredText, text, source]);

  return (
    <div style={{ padding: "32px 36px", maxWidth: 1300 }}>
      <motion.header
        initial={{ opacity: 0, y: 8, scale: 0.97 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ type: "spring", stiffness: 200, damping: 20 }}
        style={{ marginBottom: 24 }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 6 }}>
          <ScrollText size={22} color="var(--accent)" />
          <h1 style={{ margin: 0, fontSize: 30, fontWeight: 800, letterSpacing: "-0.02em", color: "var(--text-main)" }}>
            {t("logAnalyzer")}
          </h1>
        </div>
        <p style={{ color: "var(--text-muted)", fontSize: 13, lineHeight: 1.6 }}>
          {t("logAnalyzerDesc")} <span style={{ fontFamily: "var(--font-mono)", color: "var(--accent)" }}>{sourceLabels[source]}</span> {t("andHighlights")}
        </p>
        <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
          {[
            { id: "game" as const, labelKey: "gameLog" },
            { id: "crash" as const, labelKey: "crashLog" },
            { id: "install" as const, labelKey: "installLog" },
          ].map((s) => (
            <button
              key={s.id}
              onClick={() => setSource(s.id)}
              style={{
                padding: "6px 14px",
                borderRadius: 8,
                background: source === s.id ? "var(--accent)" : "rgba(255,255,255,0.06)",
                border: source === s.id ? "none" : "1px solid rgba(255,255,255,0.08)",
                color: source === s.id ? "#fff" : "var(--text-dim)",
                cursor: "pointer",
                fontSize: 12,
                fontWeight: 600,
              }}
            >
              {t(s.labelKey)}
            </button>
          ))}
        </div>
        {source === "install" && (
          <div style={{ display: "flex", gap: 6, marginTop: 8 }}>
            {filterKeys.map((fId) => (
              <button
                key={fId}
                onClick={() => setInstallFilter(fId)}
                style={{
                  padding: "5px 12px",
                  borderRadius: 6,
                  background: installFilter === fId ? "rgba(45,212,191,0.15)" : "transparent",
                  border: `1px solid ${installFilter === fId ? "rgba(45,212,191,0.30)" : "rgba(255,255,255,0.08)"}`,
                  color: installFilter === fId ? "#2dd4bf" : "var(--text-dim)",
                  cursor: "pointer",
                  fontSize: 11,
                  fontWeight: 600,
                }}
              >
                {filterLabels[fId]}
              </button>
            ))}
          </div>
        )}
      </motion.header>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 380px", gap: 18 }}>
        {/* Log pane */}
        <motion.div
          initial={{ opacity: 0, y: 12, scale: 0.97 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ delay: 0.05, ...springTrans }}
          style={{
            ...glassBase,
            borderRadius: 18,
            display: "flex",
            flexDirection: "column",
            minHeight: 480,
            overflow: "hidden",
            boxShadow: "0 6px 20px rgba(0, 0, 0, 0.28)",
          }}
        >
          <div style={{
            padding: "12px 16px",
            borderBottom: "1px solid rgba(255, 255, 255, 0.06)",
            display: "flex",
            alignItems: "center",
            gap: 10,
            background: "rgba(0, 0, 0, 0.15)",
          }}>
            <FileSearch size={14} color="var(--text-dim)" />
            <span style={{ fontFamily: "var(--font-mono)", fontSize: 12, color: "var(--text-dim)" }}>
              {sourceLabels[source]}
            </span>
            <span style={{ fontSize: 11, color: "var(--text-dim)" }}>· последние 5 МБ</span>
          </div>
          <pre style={{
            flex: 1,
            margin: 0,
            padding: 16,
            fontSize: 11,
            lineHeight: 1.6,
            fontFamily: "var(--font-mono)",
            background: "rgba(0, 0, 0, 0.12)",
            color: "var(--text-muted)",
            overflow: "auto",
            whiteSpace: "pre-wrap",
            wordBreak: "break-word",
          }}>
            {source === "install" ? `${filteredText.split("\n").length} строк / ${installFilter} / ${filteredText.substring(0, 200)}` : (filteredText || t("logEmpty"))}
          </pre>
        </motion.div>

        {/* Issues pane */}
        <aside>
          <motion.div
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.10, ...springTrans }}
            style={{
              fontSize: 11,
              textTransform: "uppercase",
              letterSpacing: "0.1em",
              color: "var(--text-dim)",
              marginBottom: 12,
            }}
          >
            {t("issuesFound")} <span style={{ color: "var(--text-muted)" }}>{issues.length}</span>
          </motion.div>

          {issues.length === 0 && (
            <motion.div
              initial={{ opacity: 0, scale: 0.97 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={springTrans}
              style={{
                padding: 24,
                background: "rgba(52, 211, 153, 0.08)",
                border: "1px solid rgba(52, 211, 153, 0.20)",
                borderRadius: 16,
                fontSize: 13,
                color: "var(--success)",
                textAlign: "center",
                boxShadow: "0 4px 16px rgba(52, 211, 153, 0.10)",
              }}
            >
              {t("logClean")}
            </motion.div>
          )}

          {issues.map((it, i) => {
            const Icon = SEVERITY_ICON[it.severity];
            const hexColor = getSeverityHexColor(it.severity);
            return (
              <IssueCard key={it.id} issue={it} index={i} Icon={Icon} hexColor={hexColor} />
            );
          })}
        </aside>
      </div>
    </div>
  );
}

function IssueCard({ issue: it, index, Icon, hexColor }: {
  issue: Issue; index: number; Icon: typeof InfoIcon; hexColor: string;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, x: 12, scale: 0.97 }}
      animate={{ opacity: 1, x: 0, scale: 1 }}
      transition={{ delay: index * 0.05, ...springTrans }}
      whileHover={{ scale: 1.02, y: -2 }}
      style={{
        ...glassBase,
        border: `1px solid rgba(255, 255, 255, 0.08)`,
        borderLeft: `3px solid ${hexColor}`,
        borderRadius: 14,
        padding: 14,
        marginBottom: 10,
        transition: "all 0.25s cubic-bezier(0.34, 1.56, 0.64, 1)",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        <Icon size={14} color={hexColor} />
        <div style={{ fontWeight: 700, fontSize: 13, flex: 1, color: "var(--text-main)" }}>
          {it.title}
        </div>
        <span style={{
          fontFamily: "var(--font-mono)",
          fontSize: 10,
          color: "var(--text-dim)",
          background: "rgba(255,255,255,0.04)",
          padding: "2px 7px",
          borderRadius: 6,
          border: "1px solid rgba(255,255,255,0.06)",
        }}>
          x{it.matched}
        </span>
      </div>
      <div style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 6, lineHeight: 1.5 }}>
        {it.description}
      </div>
      <ul style={{ margin: "8px 0 0", paddingLeft: 18, fontSize: 12 }}>
        {it.solutions.map((s) => (
          <li key={s} style={{ color: "var(--text-main)", marginBottom: 4, lineHeight: 1.4 }}>
            {s}
          </li>
        ))}
      </ul>
    </motion.div>
  );
}
