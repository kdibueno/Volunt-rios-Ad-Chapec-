// pages/admin.js
import AuthGate from "../components/AuthGate";
import { onAuthStateChanged } from "firebase/auth";
import { useEffect, useMemo, useState } from "react";
import { auth, db } from "../lib/firebase";
import { ref, onValue, update, remove } from "firebase/database";
import useRoles from "../hooks/useRoles";
import AuthButton from "../components/AuthButton";
import Image from "next/image";
import BackToPortalButton from "../components/BackToPortalButton";
import {ChevronRight,Check,X,Trash2,UserMinus,FilterIcon,} from "lucide-react";

export default function Admin() {
  const [user, setUser] = useState(null);
  useEffect(() => onAuthStateChanged(auth, (u) => setUser(u || null)), []);
  const { roles } = useRoles(user);

  const [users, setUsers] = useState({});
  const [q, setQ] = useState("");
  const [collapsed, setCollapsed] = useState({}); // padrão: oculto
  const [onlyPending, setOnlyPending] = useState(false);

  useEffect(() => {
    const unsub = onValue(ref(db, "users"), (snap) => setUsers(snap.val() || {}));
    return () => unsub();
  }, []);

  const canAdmin = !!roles.admin;

  const list = useMemo(() => {
    let arr = Object.entries(users || {}).map(([id, v]) => ({ id, ...v }));
    if (onlyPending) arr = arr.filter((u) => u.approved === false);
    if (q.trim()) {
      const term = q.trim().toLowerCase();
      arr = arr.filter(
        (u) =>
          (u.displayName || "").toLowerCase().includes(term) ||
          (u.email || "").toLowerCase().includes(term) ||
          (u.id || "").toLowerCase().includes(term)
      );
    }
    arr.sort((a, b) => {
      const ap = a.approved === false ? 0 : 1;
      const bp = b.approved === false ? 0 : 1;
      if (ap !== bp) return ap - bp;
      const an = (a.displayName || a.email || "").toLowerCase();
      const bn = (b.displayName || b.email || "").toLowerCase();
      return an.localeCompare(bn);
    });
    return arr;
  }, [users, q, onlyPending]);

  const pendingCount = useMemo(
    () => Object.values(users || {}).filter((u) => u?.approved === false).length,
    [users]
  );

  const PERMISSION_GROUPS = [
    { title: "Portal (acesso aos módulos)", keys: ["organizador", "cronograma", "driver", "admin"] },
    { title: "Ações no Cronograma", keys: ["cronograma_view", "cronograma_edit"] },
    { title: "Ações no Organizador de Cenas", keys: ["organizador_view", "organizador_edit"] },
    { title: "Driver", keys: ["driver_view", "driver_upload", "driver_edit", "driver_delete"] },
  ];

  function toggleCollapse(uid) {
    setCollapsed((prev) => ({ ...prev, [uid]: !(prev[uid] ?? true) }));
  }

  async function toggleRole(uid, roleKey) {
    if (!canAdmin) return;
    const current = users?.[uid]?.roles?.[roleKey] || false;
    await update(ref(db, `users/${uid}/roles`), { [roleKey]: !current });
  }

  async function approveUser(uid) {
    if (!canAdmin) return;
    const payload = {
      approved: true,
      approvedAt: Date.now(),
    };
    if (user?.uid) {
      payload.approvedBy = { uid: user.uid, name: user.displayName || user.email || "admin" };
    }
    await update(ref(db, `users/${uid}`), payload);
  }

  async function rejectUser(uid) {
    if (!canAdmin) return;
    if (!confirm("Rejeitar esta solicitação? O usuário continuará sem acesso.")) return;
    await update(ref(db, `users/${uid}`), {
      approved: false,
      rejectedAt: Date.now(),
      roles: {}, // opcional: limpar roles
    });
  }

  // --- NOVOS: Remover acesso e Excluir usuário ---
  async function removeAccess(uid) {
    if (!canAdmin) return;
    if (!confirm("Remover acesso deste usuário? Ele ficará como não aprovado e sem permissões.")) return;
    await update(ref(db, `users/${uid}`), {
      approved: false,
      roles: {},
      accessRemovedAt: Date.now(),
      accessRemovedBy: user?.uid || "admin",
    });
  }

  async function deleteUser(uid) {
    if (!canAdmin) return;
    const u = users?.[uid];
    const label = u?.displayName || u?.email || uid;
    const msg =
      `Excluir o usuário "${label}" do banco de dados?\n\n` +
      `Isso remove o registro em /users/${uid}. (Não remove da Firebase Auth.)`;
    if (!confirm(msg)) return;
    await remove(ref(db, `users/${uid}`));
  }

  return (
    <AuthGate requireRole="admin">
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
                <h1 className="text-xl font-semibold leading-none">Administração</h1>
                <p className="text-xs text-gray-300">Gerencie acessos e permissões de usuários</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <div
                className={`text-xs px-2 py-1 rounded-lg border ${
                  pendingCount > 0
                    ? "border-yellow-400/30 bg-yellow-500/10 text-yellow-300"
                    : "border-white/10 bg-white/5 text-gray-300"
                }`}
                title="Solicitações pendentes"
              >
                Pendentes: {pendingCount}
              </div>
              <BackToPortalButton label="Portal" message="Voltando ao portal…" />
              <AuthButton user={user} />
            </div>
          </div>
        </div>

        <main className="max-w-4xl mx-auto px-4 py-6 space-y-4">
          {!canAdmin ? (
            <div className="rounded-xl border border-white/10 bg-black/30 p-4">
              Você não tem permissão para administrar usuários.
            </div>
          ) : (
            <>
              {/* Busca e filtro */}
              <div className="rounded-xl border border-white/10 bg-black/30 p-3 shadow flex flex-wrap items-center gap-2 justify-between">
                <div className="flex items-center gap-2">
                  <input
                    className="bg-black/50 border border-white/10 rounded px-3 py-2 text-sm w-64 placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-emerald-600/40"
                    placeholder="Buscar por nome, e-mail ou UID…"
                    value={q}
                    onChange={(e) => setQ(e.target.value)}
                  />
                  {q && (
                    <button
                      onClick={() => setQ("")}
                      className="px-3 py-2 rounded bg-white/10 hover:bg-white/20 text-sm"
                      title="Limpar busca"
                    >
                      Limpar
                    </button>
                  )}
                </div>

                <label className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    className="accent-emerald-600"
                    checked={onlyPending}
                    onChange={(e) => setOnlyPending(e.target.checked)}
                  />
                  <span className="flex items-center gap-1 text-gray-300">
                    <FilterIcon className="w-4 h-4" />
                    Mostrar apenas pendentes
                  </span>
                </label>
              </div>

              {/* Lista */}
              {list.length === 0 ? (
                <div className="rounded-xl border border-white/10 bg-black/30 p-6 text-center text-gray-300">
                  Nenhum usuário encontrado.
                </div>
              ) : (
                <div className="space-y-3">
                  {list.map((u) => {
                    const isCollapsed = (collapsed[u.id] ?? true);
                    const isPending = u.approved === false;

                    return (
                      <div
                        key={u.id}
                        className="rounded-xl border border-white/10 bg-black/30 shadow overflow-hidden"
                      >
                        {/* Cabeçalho do cartão */}
                        <button
                          onClick={() => toggleCollapse(u.id)}
                          className="w-full flex items-center justify-between px-4 py-3 hover:bg-white/5"
                          aria-expanded={!isCollapsed}
                        >
                          <div className="flex items-center gap-3">
                            <ChevronRight
                              className={`w-4 h-4 text-gray-400 transition-transform duration-300 ${!isCollapsed ? "rotate-90" : ""}`}
                            />
                            <div className="text-left">
                              <div className="flex items-center gap-2">
                                <h2 className="font-medium truncate">{u.displayName || u.email}</h2>
                                <p className="text-xs text-gray-400 truncate">{u.email}</p>
                              </div>
                              <div className="mt-1">
                                {isPending ? (
                                  <span className="text-[11px] px-2 py-0.5 rounded-full border border-yellow-400/30 bg-yellow-500/10 text-yellow-300">
                                    Aguardando aprovação
                                  </span>
                                ) : (
                                  <span className="text-[11px] px-2 py-0.5 rounded-full border border-green-400/30 bg-green-500/10 text-emerald-300">
                                    Aprovado
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>
                          <span className="text-[11px] text-gray-500">UID: {u.id}</span>
                        </button>

                        {/* Conteúdo expandido */}
                        <div
                          className={`transition-[max-height,opacity] duration-300 ease-in-out
                            ${isCollapsed ? "max-h-0 opacity-0" : "max-h-[1200px] opacity-100"}`}
                          style={{ overflow: "hidden" }}
                        >
                          <div className="px-4 pb-4 pt-1 space-y-5">
                            {/* Ações rápidas */}
                              <div className="flex gap-2 mt-2">
                                    {/* Aprovar */}
                                    <button
                                      onClick={() => approveUser(u.id)}
                                      className="flex items-center gap-1 px-2 py-1 text-xs rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white transition"
                                      title="Aprovar usuário"
                                    >
                                      <Check className="w-3.5 h-3.5" />
                                      Aprovar
                                    </button>

                                    {/* Rejeitar */}
                                    <button
                                      onClick={() => rejectUser(u.id)}
                                      className="flex items-center gap-1 px-2 py-1 text-xs rounded-lg bg-red-600 hover:bg-red-700 text-white transition"
                                      title="Rejeitar usuário"
                                    >
                                      <X className="w-3.5 h-3.5" />
                                      Rejeitar
                                    </button>

                                    {/* Remover acesso */}
                                    <button
                                      onClick={() => removeAccess(u.id)}
                                      className="flex items-center gap-1 px-2 py-1 text-xs rounded-lg bg-yellow-600 hover:bg-yellow-700 text-white transition"
                                      title="Remover acessos"
                                    >
                                      <UserMinus className="w-3.5 h-3.5" />
                                      Acesso
                                    </button>

                                    {/* Excluir usuário */}
                                    <button
                                      onClick={() => deleteUser(u.id)}
                                      className="flex items-center gap-1 px-2 py-1 text-xs rounded-lg bg-gray-600 hover:bg-gray-700 text-white transition"
                                      title="Excluir usuário"
                                    >
                                      <Trash2 className="w-3.5 h-3.5" />
                                      Excluir
                                    </button>
                            </div>

                            {/* Permissões */}
                            {PERMISSION_GROUPS.map((group) => (
                              <div key={group.title}>
                                <h3 className="text-sm font-medium text-emerald-300 mb-2">{group.title}</h3>
                                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                                  {group.keys.map((rk) => (
                                    <label
                                      key={rk}
                                      className="flex items-center gap-2 rounded-lg border border-white/10 bg-white/5 px-2 py-1.5 text-xs hover:bg-white/10 transition"
                                    >
                                      <input
                                        type="checkbox"
                                        className="accent-emerald-600"
                                        checked={!!users?.[u.id]?.roles?.[rk]}
                                        onChange={() => toggleRole(u.id, rk)}
                                      />
                                      <span className="capitalize">{rk.replace(/_/g, " ")}</span>
                                    </label>
                                  ))}
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </>
          )}
        </main>
      </div>
    </AuthGate>
  );
}
