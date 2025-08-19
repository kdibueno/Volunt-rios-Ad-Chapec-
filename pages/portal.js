// pages/portal.js
import AuthGate from "../components/AuthGate";
import { onAuthStateChanged } from "firebase/auth";
import { useEffect, useState, useCallback, useMemo } from "react";
import { auth, db } from "../lib/firebase";
import { ref, onValue } from "firebase/database";
import useRoles from "../hooks/useRoles";
import AuthButton from "../components/AuthButton";
import { useRouteTransition } from "../components/RouteTransitions";
import Image from "next/image";
import { Bell, Clapperboard, CalendarDays, Cloud, ShieldCheck } from "lucide-react";

export default function Portal() {
  const [user, setUser] = useState(null);
  useEffect(() => onAuthStateChanged(auth, (u) => setUser(u || null)), []);
  const { roles } = useRoles(user);
  const { startWithModal } = useRouteTransition();

  // ---- Pendências de aprovação (só para admins) ----
  const [allUsers, setAllUsers] = useState({});
  const [showBellMenu, setShowBellMenu] = useState(false);

  useEffect(() => {
    if (!roles?.admin) return;
    const unsub = onValue(ref(db, "users"), (snap) => setAllUsers(snap.val() || {}));
    return () => unsub();
  }, [roles?.admin]);

  const pendingList = useMemo(() => {
    if (!roles?.admin) return [];
    return Object.entries(allUsers || {})
      .map(([id, v]) => ({ id, ...v }))
      .filter((u) => u?.approved === false);
  }, [allUsers, roles?.admin]);
  // -----------------------------------------------

  function Card({ title, desc, href, icon, status }) {
    const isEnabled = status === "enabled";

    const labelText =
      status === "enabled" ? "Disponível" :
      status === "production" ? "Em Produção" :
      "Sem permissão";

    const labelClass =
      status === "enabled"
        ? "border-green-400/30 bg-green-500/10 text-white"
        : status === "production"
        ? "border-yellow-400/30 bg-yellow-500/10 text-yellow-300"
        : "border-white/5 bg-white/5";

    const hintText =
      status === "enabled" ? "Clique para entrar" :
      status === "production" ? "Em breve disponível" :
      "Contate um admin";

    const onClick = useCallback((e) => {
      if (!isEnabled) {
        e.preventDefault();
        return;
      }
      e.preventDefault();
      startWithModal(href, { message: "Carregando módulo…" });
    }, [href, isEnabled, startWithModal]);

    return (
      <a
        href={isEnabled ? href : undefined}
        onClick={onClick}
        aria-disabled={!isEnabled}
        className={`
          group relative w-full
          transition-transform duration-200
          ${isEnabled ? "hover:-translate-y-1" : "cursor-not-allowed"}
        `}
      >
        {/* Borda gradiente */}
        <div
          className={`
            absolute inset-0 rounded-2xl
            bg-gradient-to-br from-emerald-600/30 via-emerald-700/20 to-emerald-500/30
            opacity-0 blur-xl transition-opacity duration-300
            ${isEnabled ? "group-hover:opacity-100" : "opacity-0"}
          `}
          aria-hidden="true"
        />
        {/* Card */}
        <div
          className={`
            relative rounded-2xl border p-6 shadow
            bg-black/30 border-white/10
            backdrop-blur-sm
            transition-colors
            ${isEnabled ? "group-hover:bg-white/10" : "opacity-75"}
          `}
        >
          <div className="flex items-center gap-4">
            <div
              className={`
                h-12 w-12 shrink-0 grid place-items-center rounded-xl
                bg-gradient-to-br from-emerald-600 to-emerald-700
                ring-1 ring-white/10 shadow
                ${isEnabled ? "" : "grayscale"}
              `}
            >
              <span className="text-white text-xl">{icon}</span>
            </div>
            <div className="min-w-0">
              <h3 className="text-lg font-semibold truncate">{title}</h3>
              <p className="text-sm text-gray-300 mt-1 line-clamp-2">{desc}</p>
            </div>
          </div>

          {/* CTA / estado */}
          <div className="mt-5 flex items-center justify-between">
            <span className={`text-xs px-2.5 py-1 rounded-full border ${labelClass}`}>
              {labelText}
            </span>
            <span
              className={`
                text-[11px] text-gray-400
                ${isEnabled ? "opacity-80 group-hover:opacity-100" : "opacity-60"}
              `}
            >
              {hintText}
            </span>
          </div>
        </div>
      </a>
    );
  }

  // Estados por módulo
  const statusOrganizador = roles.organizador ? "enabled" : "disabled";
  const statusCronograma  = roles.cronograma  ? "enabled" : "disabled";
  const statusAdmin       = roles.admin       ? "enabled" : "disabled";
  const statusDriver      = "production";

  return (
    <AuthGate>
      <div className="min-h-screen relative overflow-hidden bg-gradient-to-b from-black via-emerald-950 to-emerald-900 text-white">
        {/* glows */}
        <div className="pointer-events-none absolute -top-36 -left-36 h-72 w-72 bg-emerald-600/20 blur-3xl rounded-full" />
        <div className="pointer-events-none absolute -bottom-36 -right-36 h-72 w-72 bg-emerald-700/20 blur-3xl rounded-full" />

        {/* Header */}
        <div className="backdrop-blur-xl bg-black/30 border-b border-white/10">
          <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="relative h-9 w-9 rounded-full overflow-hidden ring-1 ring-white/10 bg-white/5">
                <Image
                  src="/voluntarios.png"
                  alt="Logo"
                  fill
                  sizes="36px"
                  className="object-contain p-0.5"
                  priority
                />
              </div>
              <div>
                <h1 className="text-xl font-semibold leading-none">Seja bem-vindo(a)</h1>
                <p className="text-xs text-gray-300">
                  você está logado como {user?.displayName || user?.email}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 relative">
              {/* Sino de pendências — apenas Admin */}
              {roles.admin && (
                <div className="relative">
                  <button
                    onClick={() => setShowBellMenu((v) => !v)}
                    className="relative rounded-lg px-2 py-2 bg-white/10 hover:bg-white/20 ring-1 ring-white/10 transition"
                    title="Solicitações de cadastro"
                  >
                    <Bell className="w-5 h-5 text-white/90" />
                    {pendingList.length > 0 && (
                      <span className="absolute -top-1 -right-1 min-w-[18px] h-4 px-1 rounded-full bg-rose-600 text-white text-[10px] font-bold flex items-center justify-center ring-2 ring-black/30">
                        {pendingList.length > 99 ? "99+" : pendingList.length}
                      </span>
                    )}
                  </button>

                  {/* Dropdown */}
                  {showBellMenu && (
                    <div
                      className="absolute right-0 mt-2 w-80 rounded-xl border border-white/10 bg-black/80 backdrop-blur p-2 shadow-2xl z-20"
                      onMouseLeave={() => setShowBellMenu(false)}
                    >
                      <div className="px-2 py-1 text-xs text-gray-400">
                        {pendingList.length === 0
                          ? "Sem solicitações pendentes."
                          : `Solicitações pendentes (${pendingList.length})`}
                      </div>
                      {pendingList.slice(0, 6).map((u) => (
                        <div
                          key={u.id}
                          className="px-2 py-2 rounded-lg hover:bg-white/10 transition"
                        >
                          <div className="text-sm font-medium truncate">
                            {u.displayName || u.email}
                          </div>
                          <div className="text-[11px] text-gray-400 truncate">
                            {u.email}
                          </div>
                          <div className="text-[11px] text-emerald-300 mt-0.5">
                            Aguardando aprovação
                          </div>
                        </div>
                      ))}
                      {pendingList.length > 6 && (
                        <div className="px-2 pb-2 text-[11px] text-gray-400">
                          + {pendingList.length - 6} outros…
                        </div>
                      )}
                      <div className="px-2 pt-1">
                        <button
                          onClick={() => {
                            setShowBellMenu(false);
                            startWithModal("/admin", { message: "Abrindo administração…" });
                          }}
                          className="w-full text-sm px-3 py-2 rounded-lg bg-emerald-700 hover:bg-emerald-600 text-white ring-1 ring-black/20 transition"
                        >
                          Ir para Administração
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )}

              <AuthButton user={user} />
            </div>
          </div>
        </div>

        {/* Grid 2x2 */}
        <main className="max-w-6xl mx-auto px-4 py-16">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-7">
            <Card
              title="Roteiro de Transmissão"
              desc="Criação e gerenciamento de roteiros e cenas."
              href="/"
              status={statusOrganizador}
              icon={<Clapperboard size={28} strokeWidth={2} />}
            />

            <Card
              title="Escalas"
              desc="Escala semanal dos usuários por função desempenhada."
              href="/cronograma"
              status={statusCronograma}
              icon={<CalendarDays size={28} strokeWidth={2} />}
            />

            <Card
              title="Cloud"
              desc="Armazenamento e compartilhamento de imagens e materiais."
              href="/driver"
              status={statusDriver}
              icon={<Cloud size={28} strokeWidth={2} />}
            />

            <Card
              title="Administração"
              desc="Gerenciamento de permissões, módulos e usuários."
              href="/admin"
              status={statusAdmin}
              icon={<ShieldCheck size={28} strokeWidth={2} />}
            />
          </div>

          {!roles.organizador && !roles.cronograma && !roles.admin && (
            <p className="text-center text-sm text-gray-300 mt-10"></p>
          )}
        </main>
      </div>
    </AuthGate>
  );
}
