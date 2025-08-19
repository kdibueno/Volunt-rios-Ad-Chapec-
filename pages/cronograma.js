// pages/cronograma.js
import AuthGate from "../components/AuthGate";
import { onAuthStateChanged } from "firebase/auth";
import { useEffect, useMemo, useState } from "react";
import { auth, db } from "../lib/firebase";
import useRoles from "../hooks/useRoles";
import { ref, onValue, update, set } from "firebase/database";
import AuthButton from "../components/AuthButton";
import Link from "next/link";
import BackToPortalButton from "../components/BackToPortalButton";
import Image from "next/image";

/* ===================== CONFIG ===================== */

const DAY_SLOTS = [
  { key: "diretorCena",     label: "Diretor(a) de Cena" },
  { key: "diretorVmix",     label: "Diretor(a) de vMix" },
  { key: "cam5Central",     label: "Câmera 5 - Central" },
  { key: "cam6LateralDir",  label: "Câmera 6 - Lateral Direita" },
  { key: "cam7LateralEsq",  label: "Câmera 7 - Lateral Esquerda" },
  { key: "camMovel",        label: "Câmera Móvel" },
  { key: "diretorApoio",    label: "Diretor(a) de Apoio" },
  { key: "apoio1",          label: "Equipe de Apoio 1" },
  { key: "apoio2",          label: "Equipe de Apoio 2" },
  { key: "apoio3",          label: "Equipe de Apoio 3" },
  { key: "apoio4",          label: "Equipe de Apoio 4" },
  { key: "apoio5",          label: "Equipe de Apoio 5" },
];

const SLOT_STYLES = {
  diretorCena:     { bg: "bg-orange-500/10",  ring: "ring-orange-500/30",  label: "text-orange-200",  chip: "bg-orange-600/80 text-white",   border: "border-orange-500/30" },
  diretorVmix:     { bg: "bg-violet-500/10",  ring: "ring-violet-500/30",  label: "text-violet-200",  chip: "bg-violet-600/80 text-white",   border: "border-violet-500/30" },
  cam5Central:     { bg: "bg-sky-500/10",     ring: "ring-sky-500/30",     label: "text-sky-200",     chip: "bg-sky-600/80 text-white",      border: "border-sky-500/30" },
  cam6LateralDir:  { bg: "bg-indigo-500/10",  ring: "ring-indigo-500/30",  label: "text-indigo-200",  chip: "bg-indigo-600/80 text-white",   border: "border-indigo-500/30" },
  cam7LateralEsq:  { bg: "bg-blue-500/10",    ring: "ring-blue-500/30",    label: "text-blue-200",    chip: "bg-blue-600/80 text-white",     border: "border-blue-500/30" },
  camMovel:        { bg: "bg-cyan-500/10",    ring: "ring-cyan-500/30",    label: "text-cyan-200",    chip: "bg-cyan-600/80 text-white",     border: "border-cyan-500/30" },
  diretorApoio:    { bg: "bg-emerald-500/10", ring: "ring-emerald-500/30", label: "text-emerald-200", chip: "bg-emerald-600/80 text-white",  border: "border-emerald-500/30" },
  apoio1:          { bg: "bg-fuchsia-500/10", ring: "ring-fuchsia-500/30", label: "text-fuchsia-200", chip: "bg-fuchsia-600/80 text-white",  border: "border-fuchsia-500/30" },
  apoio2:          { bg: "bg-fuchsia-500/10", ring: "ring-fuchsia-500/30", label: "text-fuchsia-200", chip: "bg-fuchsia-600/80 text-white",  border: "border-fuchsia-500/30" },
  apoio3:          { bg: "bg-fuchsia-500/10", ring: "ring-fuchsia-500/30", label: "text-fuchsia-200", chip: "bg-fuchsia-600/80 text-white",  border: "border-fuchsia-500/30" },
  apoio4:          { bg: "bg-fuchsia-500/10", ring: "ring-fuchsia-500/30", label: "text-fuchsia-200", chip: "bg-fuchsia-600/80 text-white",  border: "border-fuchsia-500/30" },
  apoio5:          { bg: "bg-fuchsia-500/10", ring: "ring-fuchsia-500/30", label: "text-fuchsia-200", chip: "bg-fuchsia-600/80 text-white",  border: "border-fuchsia-500/30" },
};

const LEGEND = [
  { key: "diretorCena", label: "Diretor(a) de Cena" },
  { key: "diretorVmix", label: "Diretor(a) de vMix" },
  { key: "cam5Central", label: "Câmera 5 - Central" },
  { key: "cam6LateralDir", label: "Câmera 6 - Lateral Direita" },
  { key: "cam7LateralEsq", label: "Câmera 7 - Lateral Esquerda" },
  { key: "camMovel", label: "Câmera Móvel" },
  { key: "diretorApoio", label: "Diretor(a) de Apoio" },
  { key: "apoio1", label: "Equipe de Apoio" },
];

/* ===================== UTIL ===================== */
function styleFor(key) {
  return SLOT_STYLES[key] || {
    bg: "bg-white/10",
    ring: "ring-white/10",
    label: "text-gray-300",
    chip: "bg-white/10 text-gray-100",
    border: "border-white/10",
  };
}
function fmtYMD(d) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  // formato dia-mês-ano como você usou
  return `${day}-${m}-${y}`;
}
function startOfWeek(date) {
  const d = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  const day = d.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  d.setDate(d.getDate() + diff);
  d.setHours(0, 0, 0, 0);
  return d;
}
const WEEKDAY_LABELS = ["Seg", "Ter", "Qua", "Qui", "Sex", "Sáb", "Dom"];

/* ===================== PAGE ===================== */
export default function Cronograma() {
  const [user, setUser] = useState(null);
  const [weekStart, setWeekStart] = useState(() => startOfWeek(new Date()));
  const [byDay, setByDay] = useState({});
  const [users, setUsers] = useState({});
  const [filterUid, setFilterUid] = useState("");

  useEffect(() => onAuthStateChanged(auth, (u) => setUser(u || null)), []);
  const { roles } = useRoles(user);
  const canEdit = roles.editor || roles.admin;

  useEffect(() => {
    const unsub = onValue(ref(db, "scheduleByDay"), (snap) => setByDay(snap.val() || {}));
    return () => unsub();
  }, []);
  useEffect(() => {
    const unsub = onValue(ref(db, "users"), (snap) => setUsers(snap.val() || {}));
    return () => unsub();
  }, []);

  const days = useMemo(() => {
    return Array.from({ length: 7 }, (_, i) => {
      const d = new Date(weekStart);
      d.setDate(weekStart.getDate() + i);
      return d;
    });
  }, [weekStart]);

  const userList = useMemo(() => {
    const arr = Object.entries(users || {}).map(([uid, v]) => ({
      uid,
      name: v?.name || v?.displayName || v?.email || uid,
    }));
    arr.sort((a, b) => a.name.localeCompare(b.name));
    return arr;
  }, [users]);

  async function setAssignment(dayKey, slotKey, uid) {
    if (!canEdit) return;
    await set(ref(db, `scheduleByDay/${dayKey}/${slotKey}`), uid || null);
    await update(ref(db), {
      [`scheduleByDay/${dayKey}/updatedAt`]: Date.now(),
      [`scheduleByDay/${dayKey}/updatedBy`]: user?.uid || "system",
    });
  }
  async function clearDay(dayKey) {
    if (!canEdit) return;
    if (!confirm(`Limpar todas as atribuições de ${dayKey}?`)) return;
    const updates = {};
    for (const s of DAY_SLOTS) updates[`scheduleByDay/${dayKey}/${s.key}`] = null;
    updates[`scheduleByDay/${dayKey}/updatedAt`] = Date.now();
    updates[`scheduleByDay/${dayKey}/updatedBy`] = user?.uid || "system";
    await update(ref(db), updates);
  }
  async function copyFromPrev(dayKey) {
    if (!canEdit) return;
    const d = new Date(dayKey);
    const prev = new Date(d); prev.setDate(d.getDate() - 1);
    const prevKey = fmtYMD(prev);
    const prevData = byDay?.[prevKey] || {};
    const updates = {};
    for (const s of DAY_SLOTS) updates[`scheduleByDay/${dayKey}/${s.key}`] = prevData?.[s.key] || null;
    updates[`scheduleByDay/${dayKey}/updatedAt`] = Date.now();
    updates[`scheduleByDay/${dayKey}/updatedBy`] = user?.uid || "system";
    await update(ref(db), updates);
  }

  function prevWeek() { const d = new Date(weekStart); d.setDate(d.getDate() - 7); setWeekStart(startOfWeek(d)); }
  function nextWeek() { const d = new Date(weekStart); d.setDate(d.getDate() + 7); setWeekStart(startOfWeek(d)); }
  function goToday()  { setWeekStart(startOfWeek(new Date())); }

  const weekLabel = useMemo(() => {
    const first = days[0], last = days[6];
    const fmt = (d) => d.toLocaleDateString(undefined, { day: "2-digit", month: "short", year: "numeric" });
    return `${fmt(first)} – ${fmt(last)}`;
  }, [days]);

  function dayHasUser(dayKey, uid) {
    if (!uid) return true;
    const data = byDay?.[dayKey] || {};
    return DAY_SLOTS.some((s) => data?.[s.key] === uid);
  }
  const isFilterHit = (uid) => filterUid && uid === filterUid;

  /* ===================== RENDER ===================== */
  return (
    <AuthGate requireRole="cronograma">
      <div className="min-h-screen bg-gradient-to-b from-black via-emerald-950 to-emerald-900 text-white relative overflow-hidden">
        {/* glows */}
        <div className="pointer-events-none absolute -top-36 -left-36 h-72 w-72 bg-emerald-600/20 blur-3xl rounded-full" />
        <div className="pointer-events-none absolute -bottom-36 -right-36 h-72 w-72 bg-emerald-700/20 blur-3xl rounded-full" />

        {/* Header */}
        <div className="backdrop-blur-xl bg-black/30 border-b border-white/10">
          <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="relative h-9 w-9 rounded-full overflow-hidden ring-1 ring-white/10 bg-white/5">
                <Image
                  src="/voluntarios.png"        // coloque aqui o mesmo caminho que você usou no login
                  alt="Logo"
                  fill
                  sizes="36px"
                  className="object-contain p-0.5"
                  priority
                />
              </div>
              <div>
                <h1 className="text-lg font-semibold leading-none">Escala Semanal</h1>
                <p className="text-[11px] text-gray-300">{weekLabel}</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <BackToPortalButton label="Portal" message="Voltando ao portal…" />
              <AuthButton user={user} />
            </div>
          </div>
        </div>

        <main className="max-w-7xl mx-auto px-4 py-5 space-y-4">
          {/* Legenda */}
          <div className="rounded-xl border border-white/10 bg-black/30 p-2.5 shadow-xl overflow-x-auto">
            <div className="flex items-center gap-2 min-w-max">
              <span className="text-[11px] text-gray-300 mr-1">Legenda:</span>
              {LEGEND.map((item) => {
                const st = styleFor(item.key);
                return (
                  <div key={item.key} className={`flex items-center gap-2 px-2 py-1 rounded-lg border ${st.border} ${st.bg} ring-1 ${st.ring}`}>
                    <span className={`inline-block w-2.5 h-2.5 rounded-full ${st.chip.replace(" text-white","").replace(" text-black","")} ring-1 ring-black/20`} />
                    <span className={`text-[11px] ${st.label}`}>{item.label}</span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Barra de filtros + navegação */}
          <div className="rounded-xl border border-white/10 bg-black/30 p-2.5 shadow-xl flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <label className="text-[11px] text-gray-300">Filtrar por usuário:</label>
              <select
                className="bg-black/50 border border-white/10 rounded px-2.5 py-1.5 text-sm"
                value={filterUid}
                onChange={(e) => setFilterUid(e.target.value)}
              >
                <option value="">Todos</option>
                {userList.map((u) => (
                  <option key={u.uid} value={u.uid}>{u.name}</option>
                ))}
              </select>
              {filterUid && (
                <button
                  onClick={() => setFilterUid("")}
                  className="px-2.5 py-1.5 rounded-lg text-sm bg-white/10 hover:bg-white/20"
                >
                  Limpar filtro
                </button>
              )}
            </div>
            <div className="flex items-center gap-2">
              <button onClick={prevWeek} className="px-2.5 py-1.5 rounded-lg text-sm bg-white/10 hover:bg-white/20">← Semana</button>
              <button onClick={goToday}  className="px-2.5 py-1.5 rounded-lg text-sm bg-white/10 hover:bg-white/20">Hoje</button>
              <button onClick={nextWeek} className="px-2.5 py-1.5 rounded-lg text-sm bg-white/10 hover:bg-white/20">Semana →</button>
            </div>
          </div>

          {/* Calendário */}
          <div className="overflow-x-auto">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-7 gap-2 md:gap-3 min-w-[980px]">
              {days.map((d, idx) => {
                const key = fmtYMD(d);
                const data = byDay?.[key] || {};
                const weekday = WEEKDAY_LABELS[idx] || d.toLocaleDateString(undefined, { weekday: "short" });
                const isToday = fmtYMD(new Date()) === key;
                const visible = dayHasUser(key, filterUid);

                return (
                  <div
                    key={key}
                    className={
                      `rounded-xl border border-white/10 bg-black/30 shadow-lg flex flex-col transition ` +
                      (isToday ? "ring-2 ring-emerald-500 border-emerald-500 " : "") +
                      (filterUid ? (visible ? "" : " opacity-35") : "")
                    }
                  >
                    {/* Cabeçalho */}
                    <div className="px-2 pt-2 pb-1 sticky top-0 z-10 bg-black/50 backdrop-blur border-b border-white/10">
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <div className="text-[9px] uppercase tracking-wide text-gray-400">{weekday}</div>
                          <div className="text-sm font-semibold truncate">
                            {d.toLocaleDateString(undefined, { day: "2-digit"})}
                          </div>
                          <div className="text-[9px] text-gray-500">{key}</div>
                        </div>

                        {(roles.editor || roles.admin) && (
                          <div className="flex gap-1">
                            <button
                              onClick={() => copyFromPrev(key)}
                              className="px-1.5 py-0.5 text-[10px] rounded-md bg-white/10 hover:bg-white/20"
                              title="Copiar do dia anterior"
                            >
                              Copiar
                            </button>
                            <button
                              onClick={() => clearDay(key)}
                              className="px-1.5 py-0.5 text-[10px] rounded-md bg-red-600/80 hover:bg-red-600 text-white"
                              title="Limpar dia"
                            >
                              Limpar
                            </button>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Slots (sem scroll interno) */}
                    <div className="px-2 pb-2 pt-1 space-y-1.5">
                      {DAY_SLOTS.map((slot) => {
                        const assignedUid = data?.[slot.key] || "";
                        const assignedUser =
                          assignedUid && userList.find((u) => u.uid === assignedUid);
                        const st = styleFor(slot.key);
                        const hit = isFilterHit(assignedUid);

                        return (
                          <div
                            key={slot.key}
                            className={`rounded-lg border ${st.border} ${st.bg} ring-1 ${st.ring} p-2`}
                          >
                            <div className={`text-[10px] ${st.label} mb-1 leading-tight`}>
                              {slot.label}
                            </div>

                            {assignedUser ? (
                              <div className="flex items-center justify-between gap-2">
                                <span
                                  className={`text-[10px] px-2 py-1 rounded-full ${st.chip} ring-1 ${
                                    hit ? "ring-2 ring-white/60" : "ring-black/20"
                                  } truncate max-w-[70%]`}
                                  title={assignedUser.name}
                                >
                                  {assignedUser.name}
                                </span>
                                {canEdit && (
                                  <button
                                    onClick={() => setAssignment(key, slot.key, "")}
                                    className="text-[10px] px-2 py-1 rounded bg-white/10 hover:bg-white/20 whitespace-nowrap"
                                    title="Remover"
                                  >
                                    Remover
                                  </button>
                                )}
                              </div>
                            ) : canEdit ? (
                              <select
                                className={`w-full bg-black/50 border ${st.border} rounded px-2 py-1.5 text-[11px] focus:outline-none focus:ring-2 ${st.ring}`}
                                value={assignedUid}
                                onChange={(e) => setAssignment(key, slot.key, e.target.value)}
                              >
                                <option value="">Selecionar</option>
                                {userList.map((u) => (
                                  <option key={u.uid} value={u.uid}>
                                    {u.name}
                                  </option>
                                ))}
                              </select>
                            ) : (
                              <span className="text-[10px] text-gray-500">—</span>
                            )}
                          </div>
                        );
                      })}

                      {data?.updatedAt && (
                        <div className="pt-1 text-[9px] text-gray-500">
                          Atualizado em{" "}
                          {new Date(data.updatedAt).toLocaleString(undefined, {
                            day: "2-digit",
                            month: "2-digit",
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </main>
      </div>
    </AuthGate>
  );
}
