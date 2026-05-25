import { useState } from "react";
import { ChevronDown, HelpCircle, Search } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useI18n } from "../context/I18nContext";

type QA = { q: string; a: string; tags: string[] };

const FAQ: QA[] = [
  { q: "Как поменять версию игры в Steam?", a: `Для смены версии ETS2 в Steam:
  1. Нажмите правой кнопкой на Euro Truck Simulator 2 в библиотеке Steam
  2. Выберите "Свойства" → "Бета-версии"
  3. В выпадающем списке выберите нужную версию
  4. Steam автоматически скачает выбранную версию
  Для сборки NEXUS нужна версия 1.58.1.4 (temporary).`, tags: ["steam", "версия", "обновить", "downgrade"] },
  { q: "После установки сборки игра вылетает в меню", a: "Это значит, что один из модов несовместим с вашей версией ETS2. Запустите Анализ лога — он покажет, какой именно. Чаще всего проблема в карте ProMods: проверьте, что Def-файл сгенерирован под вашу версию игры и DLC.", tags: ["краш", "ошибка"] },
  { q: "Где Nexus хранит свои файлы?", a: "Все рабочие файлы — в %APPDATA%/Nexus/. Там лежат settings.json, installed_manifest.json, secrets.bin (зашифрованный токен), temp_sync/ (временные загрузки), crash_log.txt.", tags: ["папки", "хранение"] },
  { q: "Что такое Convoy и Solo профили?", a: "Convoy — облегчённый профиль для игры в команде (порядок модов должен совпадать у всех). Solo — расширенный, со 100+ модами. Различаются эталонными reference_profile.7z и reference_profile_solo.7z.", tags: ["профиль", "convoy"] },
  { q: "Как пройдёт обновление сборки?", a: "Nexus сравнит updated_at каждого ассета на GitHub с локальным манифестом. Скачает только изменённое, пропустит актуальное. Перед установкой создаст бэкап вашего профиля.", tags: ["обновление"] },
  { q: "Какой токен GitHub использовать?", a: "Personal Access Token с правом public_repo. С токеном — 5000 запросов в час, без — 60. Сохраняется зашифрованно в secrets.bin через DPAPI. Создать: github.com/settings/tokens", tags: ["github", "токен"] },
  { q: "Можно ли отменить установку?", a: "Да. В Mission Control есть кнопки Пауза, Пропустить (текущий файл) и Отмена. Скачанные файлы остаются в temp_sync/, поэтому при перезапуске установка докачается с этого места (resume).", tags: ["отмена", "пауза"] },
  { q: "Steam Cloud мешает редактированию профиля?", a: "Да. Если вы хотите вручную править profile.sii — временно отключите Steam Cloud в свойствах игры в Steam, иначе изменения откатятся при синхронизации.", tags: ["steam", "облако"] },
  { q: "Что делает «Применить порядок модов»?", a: "Берёт active_mods из reference_profile (Convoy или Solo) и подменяет ваш список модов на эталонный, оставляя остальные настройки профиля нетронутыми. Перед записью делается .sii.bak.", tags: ["профиль", "порядок"] },
];

const springTrans = { type: "spring" as const, stiffness: 200, damping: 20 };

const glassBase = {
  background: "rgba(20, 29, 53, 0.6)",
  backdropFilter: "blur(20px)",
  WebkitBackdropFilter: "blur(20px)",
  border: "1px solid rgba(255, 255, 255, 0.08)",
};

const glassTransition = "all 0.25s cubic-bezier(0.34, 1.56, 0.64, 1)";

export function FaqPage() {
  const t = useI18n();
  const [open, setOpen] = useState<number | null>(0);
  const [search, setSearch] = useState("");

  const filtered = FAQ.filter((qa) => {
    if (!search.trim()) return true;
    const s = search.toLowerCase();
    return qa.q.toLowerCase().includes(s) || qa.a.toLowerCase().includes(s) || qa.tags.some((t) => t.includes(s));
  });

  return (
    <div style={{ padding: 28, maxWidth: 880 }}>
      <motion.div
        initial={{ opacity: 0, y: 8, scale: 0.97 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ type: "spring", stiffness: 200, damping: 20 }}
        style={{ marginBottom: 24 }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 6 }}>
          <HelpCircle size={22} color="var(--accent)" />
          <h1 style={{ margin: 0, fontSize: 30, fontWeight: 800, letterSpacing: "-0.02em", color: "var(--text-main)" }}>
            {t("faqTitle")}
          </h1>
        </div>
        <p style={{ color: "var(--text-muted)", fontSize: 13, lineHeight: 1.6 }}>
          Самые частые вопросы по работе со сборкой. Если не нашли ответа — откройте Анализ лога, он подскажет.
        </p>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 8, scale: 0.97 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ delay: 0.05, type: "spring", stiffness: 200, damping: 20 }}
        style={{ position: "relative", marginBottom: 16 }}
      >
        <Search size={14} style={{ position: "absolute", left: 14, top: "50%", transform: "translateY(-50%)", color: "var(--text-dim)" }} />
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder={t("faqSearch")}
          style={{
            width: "100%",
            paddingLeft: 40,
            padding: "12px 16px 12px 40px",
            background: "rgba(20, 29, 53, 0.6)",
            backdropFilter: "blur(20px)",
            border: "1px solid rgba(255, 255, 255, 0.08)",
            borderRadius: 12,
            color: "var(--text-main)",
            fontSize: 13,
            outline: "none",
            transition: "border-color 0.2s, box-shadow 0.2s",
          }}
          onFocus={(e) => {
            e.target.style.borderColor = "rgba(45, 212, 191, 0.40)";
            e.target.style.boxShadow = "0 0 0 3px rgba(45, 212, 191, 0.08), 0 4px 16px rgba(0, 0, 0, 0.20)";
          }}
          onBlur={(e) => {
            e.target.style.borderColor = "rgba(255, 255, 255, 0.08)";
            e.target.style.boxShadow = "none";
          }}
        />
      </motion.div>

      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {filtered.map((qa, i) => {
          const isOpen = open === i;
          return (
            <FaqItem key={qa.q} qa={qa} isOpen={isOpen} onToggle={() => setOpen(isOpen ? null : i)} index={i} />
          );
        })}
      </div>
    </div>
  );
}

function FaqItem({ qa, isOpen, onToggle, index }: {
  qa: QA;
  isOpen: boolean;
  onToggle: () => void;
  index: number;
}) {
  const [hovered, setHovered] = useState(false);

  return (
    <motion.div
      initial={{ opacity: 0, y: 12, scale: 0.97 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ delay: 0.04 + index * 0.03, ...springTrans }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        background: isOpen ? "rgba(20, 29, 53, 0.80)" : hovered ? "rgba(20, 29, 53, 0.72)" : "rgba(20, 29, 53, 0.60)",
        backdropFilter: "blur(20px)",
        WebkitBackdropFilter: "blur(20px)",
        border: `1px solid ${isOpen ? "rgba(45, 212, 191, 0.22)" : hovered ? "rgba(255, 255, 255, 0.11)" : "rgba(255, 255, 255, 0.08)"}`,
        borderRadius: 14,
        overflow: "hidden",
        boxShadow: isOpen
          ? "0 6px 20px rgba(0, 0, 0, 0.28), 0 0 0 1px rgba(45, 212, 191, 0.05) inset"
          : hovered
          ? "0 4px 14px rgba(0, 0, 0, 0.22)"
          : "0 1px 4px rgba(0, 0, 0, 0.10)",
        transition: glassTransition,
      }}
    >
      <button
        onClick={onToggle}
        style={{
          width: "100%",
          display: "flex",
          alignItems: "center",
          gap: 12,
          padding: "15px 18px",
          fontSize: 14,
          fontWeight: 600,
          textAlign: "left",
          background: "transparent",
          border: "none",
          color: isOpen ? "var(--accent)" : "var(--text-main)",
          cursor: "pointer",
          transition: "color 0.15s",
        }}
      >
        <span style={{ flex: 1, lineHeight: 1.5 }}>{qa.q}</span>
        <motion.div
          animate={{ rotate: isOpen ? 180 : 0, scale: isOpen ? 1.1 : 1 }}
          transition={{ type: "spring", stiffness: 300, damping: 20 }}
          style={{ color: isOpen ? "var(--accent)" : "var(--text-dim)", flexShrink: 0 }}
        >
          <ChevronDown size={18} />
        </motion.div>
      </button>
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0, scale: 0.97 }}
            animate={{ height: "auto", opacity: 1, scale: 1 }}
            exit={{ height: 0, opacity: 0, scale: 0.97 }}
            transition={{ type: "spring", stiffness: 200, damping: 22 }}
            style={{ overflow: "hidden" }}
          >
            <div style={{ padding: "0 18px 18px", fontSize: 13, color: "var(--text-muted)", lineHeight: 1.65 }}>
              {qa.a}
              <div style={{ display: "flex", gap: 8, marginTop: 12, flexWrap: "wrap" }}>
                {qa.tags.map((t) => (
                  <motion.span
                    key={t}
                    whileHover={{ scale: 1.05 }}
                    style={{
                      padding: "4px 12px",
                      borderRadius: 20,
                      fontSize: 11,
                      fontWeight: 600,
                      background: "rgba(45, 212, 191, 0.08)",
                      color: "var(--accent)",
                      border: "1px solid rgba(45, 212, 191, 0.20)",
                    }}
                  >
                    {t}
                  </motion.span>
                ))}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
