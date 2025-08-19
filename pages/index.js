// pages/index.js
import { useEffect, useMemo, useRef, useState } from "react";
import { onAuthStateChanged } from "firebase/auth";
import { ref, onValue, push, set, remove, update } from "firebase/database";
import { auth, db } from "../lib/firebase";
import AuthButton from "../components/AuthButton";
import CameraCard from "../components/CameraCard";
import AuthGate from "../components/AuthGate";
import useRoles from "../hooks/useRoles";
import dynamic from "next/dynamic";
import FloatingChat from "../components/FloatingChat";
import BackToPortalButton from "../components/BackToPortalButton";
import Image from "next/image";


export default function Home() {
  // ---------- HOOKS ----------

  const [user, setUser] = useState(null);
  const [checkingAuth, setCheckingAuth] = useState(true);

  const [projects, setProjects] = useState({});
  const [live, setLive] = useState(null);

  const [filterProjectId, setFilterProjectId] = useState("all");
  const [collapsed, setCollapsed] = useState({}); // ocultar/expandir projeto

  const [, setTick] = useState(0);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (u) => {
      setUser(u || null);
      setCheckingAuth(false);
    });
    return () => unsub();
  }, []);

  const { roles } = useRoles(user);
  const canEdit = roles.editor || roles.admin;

  useEffect(() => {
    if (!user) return;
    const unsub = onValue(ref(db, "projects"), (snap) => setProjects(snap.val() || {}));
    return () => unsub();
  }, [user]);

  useEffect(() => {
    if (!user) return;
    const unsub = onValue(ref(db, "live"), (snap) => setLive(snap.val() || null));
    return () => unsub();
  }, [user]);

  useEffect(() => {
    const id = setInterval(() => setTick((t) => (t + 1) % 1_000_000), 1000);
    return () => clearInterval(id);
  }, []);

  // ---------- HELPERS ----------
  const sortByOrderThenName = (obj) => {
    const arr = Object.entries(obj || {}).map(([id, v]) => ({ id, ...v }));
    arr.sort((a, b) => {
      const ao = a.order ?? Number.MAX_SAFE_INTEGER;
      const bo = b.order ?? Number.MAX_SAFE_INTEGER;
      if (ao !== bo) return ao - bo;
      return String(a.name || "").localeCompare(String(b.name || ""));
    });
    return arr;
  };

  const projectsAsc = useMemo(() => sortByOrderThenName(projects), [projects]);
  const projectsNewestFirst = useMemo(() => [...projectsAsc].reverse(), [projectsAsc]);

  const visibleProjects = useMemo(() => {
    if (filterProjectId === "all") return projectsNewestFirst;
    return projectsNewestFirst.filter((p) => p.id === filterProjectId);
  }, [projectsNewestFirst, filterProjectId]);

  const isLiveHere = (pId, sId, cId) =>
    live &&
    live.projectId === pId &&
    (sId ? live.sceneId === sId : true) &&
    (cId ? live.cameraId === cId : true);

  const getProject = (projectId) => projects?.[projectId] || null;
  const getScene = (projectId, sceneId) => projects?.[projectId]?.scenes?.[sceneId] || null;
  const getCamera = (projectId, sceneId, cameraId) =>
    projects?.[projectId]?.scenes?.[sceneId]?.cameras?.[cameraId] || null;

  const getDurationSec = (projectId, sceneId, cameraId) => {
    const d = Number(getCamera(projectId, sceneId, cameraId)?.durationSec);
    return Number.isFinite(d) && d > 0 ? d : 30;
  };

  const getRuntime = (projectId) => projects?.[projectId]?.runtime || null;

  const getRemainingSec = (projectId) => {
    const rt = getRuntime(projectId);
    if (!rt) return null;
    if (rt.status === "running" && rt.endsAt) {
      const ms = rt.endsAt - Date.now();
      return Math.max(0, Math.ceil(ms / 1000));
    }
    if (rt.status === "paused" && typeof rt.remainingSec === "number") {
      return Math.max(0, Math.ceil(rt.remainingSec));
    }
    return null;
  };

  // ---------- CRUD ----------
  async function addProject(name) {
    if (!canEdit) return;
    if (!name?.trim()) return;
    const newRef = push(ref(db, "projects"));
    const nextOrder = Object.keys(projects || {}).length || 0;
    await set(newRef, {
      name: name.trim(),
      createdAt: Date.now(),
      order: nextOrder,
      scenes: {},
    });
  }

  async function addScene(projectId, name) {
    if (!canEdit) return;
    if (!name?.trim()) return;
    const scenes = getProject(projectId)?.scenes || {};
    const nextOrder = Object.keys(scenes).length;
    const newRef = push(ref(db, `projects/${projectId}/scenes`));
    await set(newRef, { name: name.trim(), order: nextOrder, cameras: {} });
  }

  async function addCamera(projectId, sceneId, name, description = "") {
    if (!canEdit) return;
    if (!name?.trim()) return;
    const cams = getScene(projectId, sceneId)?.cameras || {};
    const nextOrder = Object.keys(cams).length;
    const newRef = push(ref(db, `projects/${projectId}/scenes/${sceneId}/cameras`));
    await set(newRef, {
      name: name.trim(),
      description: (description || "").trim(),
      order: nextOrder,
      durationSec: 30,
    });
  }

  async function removeProject(projectId) {
    if (!canEdit) return;
    if (!confirm("Remover este projeto e todo o conteúdo?")) return;
    await remove(ref(db, `projects/${projectId}`));
    if (live?.projectId === projectId) await remove(ref(db, "live"));
  }

  async function removeScene(projectId, sceneId) {
    if (!canEdit) return;
    if (!confirm("Remover esta cena e câmeras/notas?")) return;
    await remove(ref(db, `projects/${projectId}/scenes/${sceneId}`));
    if (isLiveHere(projectId, sceneId)) await remove(ref(db, "live"));
  }

  async function removeCamera(projectId, sceneId, cameraId) {
    if (!canEdit) return;
    if (!confirm("Remover esta câmera?")) return;
    await remove(ref(db, `projects/${projectId}/scenes/${sceneId}/cameras/${cameraId}`));
    if (isLiveHere(projectId, sceneId, cameraId)) await remove(ref(db, "live"));
  }

  // ---------- EDIÇÃO ----------
  async function editProjectName(projectId) {
    if (!canEdit) return;
    const current = getProject(projectId)?.name || "";
    const ans = window.prompt("Novo nome do projeto:", current);
    if (ans == null) return;
    const name = ans.trim();
    if (!name) return;
    await update(ref(db, `projects/${projectId}`), { name });
  }

  async function editSceneName(projectId, sceneId) {
    if (!canEdit) return;
    const current = getScene(projectId, sceneId)?.name || "";
    const ans = window.prompt("Novo nome da cena:", current);
    if (ans == null) return;
    const name = ans.trim();
    if (!name) return;
    await update(ref(db, `projects/${projectId}/scenes/${sceneId}`), { name });
  }

  async function editCameraName(projectId, sceneId, cameraId) {
    if (!canEdit) return;
    const current = getCamera(projectId, sceneId, cameraId)?.name || "";
    const ans = window.prompt("Novo nome da câmera:", current);
    if (ans == null) return;
    const name = ans.trim();
    if (!name) return;
    await update(ref(db, `projects/${projectId}/scenes/${sceneId}/cameras/${cameraId}`), { name });
  }

  async function editCameraDescription(projectId, sceneId, cameraId) {
    if (!canEdit) return;
    const current = getCamera(projectId, sceneId, cameraId)?.description || "";
    const ans = window.prompt("Nova descrição da câmera:", current);
    if (ans == null) return;
    await update(ref(db, `projects/${projectId}/scenes/${sceneId}/cameras/${cameraId}`), {
      description: ans.trim(),
    });
  }

  async function editCameraDuration(projectId, sceneId, cameraId) {
    if (!canEdit) return;
    const current = getDurationSec(projectId, sceneId, cameraId);
    const ans = window.prompt("Duração (segundos) desta câmera:", String(current));
    if (ans == null) return;
    const val = Math.max(1, Math.floor(Number(ans) || 0));
    await update(ref(db, `projects/${projectId}/scenes/${sceneId}/cameras/${cameraId}`), {
      durationSec: val,
    });
  }

  // ---------- RUNTIME / LIVE ----------
  async function setLiveCamera(projectId, sceneId, cameraId) {
    await set(ref(db, "live"), {
      projectId,
      sceneId,
      cameraId,
      at: Date.now(),
      by: { uid: user.uid, name: user.displayName || "Usuário" },
    });
  }

  function firstSceneAndCamera(projectId) {
    const scenesArr = sortByOrderThenName(getProject(projectId)?.scenes || {});
    if (scenesArr.length === 0) return null;
    const sceneId = scenesArr[0].id;
    const camsArr = sortByOrderThenName(getScene(projectId, sceneId)?.cameras || {});
    if (camsArr.length === 0) return null;
    const cameraId = camsArr[0].id;
    return { sceneId, cameraId };
  }

  function nextCameraSameScene(projectId, sceneId, cameraId) {
    const camsArr = sortByOrderThenName(getScene(projectId, sceneId)?.cameras || {});
    const ids = camsArr.map((c) => c.id);
    const idx = ids.indexOf(cameraId);
    if (idx === -1) return null;
    if (idx + 1 < ids.length) return { sceneId, cameraId: ids[idx + 1] };
    return null;
  }

  async function startProject(projectId) {
    if (!canEdit) return;
    const rt = getRuntime(projectId);
    if (rt?.status === "paused" && typeof rt.remainingSec === "number") {
      const endsAt = Date.now() + rt.remainingSec * 1000;
      await update(ref(db, `projects/${projectId}/runtime`), { status: "running", endsAt });
      await setLiveCamera(projectId, rt.sceneId, rt.cameraId);
      return;
    }
    const start = firstSceneAndCamera(projectId);
    if (!start) {
      alert("Adicione pelo menos uma cena e uma câmera.");
      return;
    }
    const duration = getDurationSec(projectId, start.sceneId, start.cameraId);
    const endsAt = Date.now() + duration * 1000;
    await set(ref(db, `projects/${projectId}/runtime`), {
      status: "running",
      sceneId: start.sceneId,
      cameraId: start.cameraId,
      endsAt,
    });
    await setLiveCamera(projectId, start.sceneId, start.cameraId);
  }

  async function pauseProject(projectId) {
    if (!canEdit) return;
    const rt = getRuntime(projectId);
    if (!rt) return;
    let remaining = 0;
    if (rt.status === "running" && rt.endsAt) {
      remaining = Math.max(0, Math.ceil((rt.endsAt - Date.now()) / 1000));
    } else if (rt.status === "paused" && typeof rt.remainingSec === "number") {
      remaining = rt.remainingSec;
    }
    await update(ref(db, `projects/${projectId}/runtime`), {
      status: "paused",
      remainingSec: remaining,
      endsAt: null,
    });
  }

  async function resetProject(projectId) {
    if (!canEdit) return;
    await remove(ref(db, `projects/${projectId}/runtime`));
    if (live?.projectId === projectId) await remove(ref(db, "live"));
  }

  const advancingRef = useRef(false);
  useEffect(() => {
    if (!user) return;
    const id = setInterval(async () => {
      if (advancingRef.current) return;
      const now = Date.now();
      for (const p of visibleProjects) {
        const projectId = p.id;
        const rt = getRuntime(projectId);
        if (rt?.status === "running" && rt.endsAt && rt.endsAt <= now) {
          advancingRef.current = true;
          try {
            const nxt = nextCameraSameScene(projectId, rt.sceneId, rt.cameraId);
            if (nxt) {
              const dur = getDurationSec(projectId, nxt.sceneId, nxt.cameraId);
              const endsAt = Date.now() + dur * 1000;
              await set(ref(db, `projects/${projectId}/runtime`), {
                status: "running",
                sceneId: nxt.sceneId,
                cameraId: nxt.cameraId,
                endsAt,
              });
              await setLiveCamera(projectId, nxt.sceneId, nxt.cameraId);
            } else {
              await update(ref(db, `projects/${projectId}/runtime`), {
                status: "paused",
                remainingSec: 0,
                endsAt: null,
              });
            }
          } finally {
            advancingRef.current = false;
          }
          break;
        }
      }
    }, 500);
    return () => clearInterval(id);
  }, [user, visibleProjects, projects]);

  const toggleProject = (projectId) =>
    setCollapsed((prev) => ({ ...prev, [projectId]: !prev[projectId] }));

  // ---------- UI STATES ----------
  if (checkingAuth) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-black via-emerald-950 to-emerald-900 text-white flex items-center justify-center relative overflow-hidden">
        <div className="pointer-events-none absolute -top-36 -left-36 h-72 w-72 bg-emerald-600/20 blur-3xl rounded-full" />
        <div className="pointer-events-none absolute -bottom-36 -right-36 h-72 w-72 bg-emerald-700/20 blur-3xl rounded-full" />
        <div className="animate-pulse text-gray-300">Carregando...</div>
      </div>
    );
  }

  if (!user) {
    if (typeof window !== "undefined") window.location.href = "/login";
    return null;
  }

  // ---------- RENDER ----------
  return (
    <AuthGate requireRole="organizador">
      <div className="min-h-screen relative overflow-hidden bg-gradient-to-b from-black via-emerald-950 to-emerald-900 text-white">
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
                <h1 className="text-xl font-semibold leading-none">Roteiro de Transmissão</h1>
                <p className="text-xs text-gray-300">
                  você está logado como <span className="text-gray-100">{user.displayName || user.email}</span>
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
                <BackToPortalButton label="Início" message="Voltando ao portal…" />
              <AuthButton user={user} />
            </div>
          </div>
        </div>

        <main className="max-w-7xl mx-auto px-4 py-6 space-y-8">
          {/* Criar projeto + Filtro */}
          <div className="rounded-2xl border border-white/10 bg-black/30 backdrop-blur-sm p-4 shadow-xl">
            <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
              {canEdit ? (
                <AddProjectBar onAdd={addProject} />
              ) : (
                <div className="text-sm text-gray-300">Sem permissão para criar projetos.</div>
              )}
              <div className="flex items-center gap-2">
                <label className="text-xs text-gray-300">Filtrar projeto:</label>
                <select
                  className="bg-black/50 border border-white/10 rounded px-3 py-2 text-sm"
                  value={filterProjectId}
                  onChange={(e) => setFilterProjectId(e.target.value)}
                >
                  <option value="all">Todos</option>
                  {projectsNewestFirst.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {visibleProjects.length === 0 ? (
            <EmptyState />
          ) : (
            visibleProjects.map(({ id: projectId, ...project }) => {
              const scenesArr = sortByOrderThenName(project.scenes || {});
              const rt = getRuntime(projectId);
              const running = rt?.status === "running";
              const paused = rt?.status === "paused";
              const remaining = getRemainingSec(projectId);

              const sceneCount = scenesArr.length;
              const totalCameras = scenesArr.reduce(
                (sum, s) => sum + Object.keys(s.cameras || {}).length,
                0
              );
              const hasAnyCamera = totalCameras > 0;
              const isCollapsed = !!collapsed[projectId];

              return (
                <section
                  key={projectId}
                  className="rounded-2xl border border-white/10 bg-black/30 backdrop-blur-sm p-5 shadow-xl"
                >
                  {/* Topo do projeto */}
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div
                      className={`text-2xl font-bold flex items-center gap-3 ${canEdit ? "cursor-pointer" : ""}`}
                      onDoubleClick={() => canEdit && editProjectName(projectId)}
                      title={canEdit ? "Duplo clique para editar o nome do projeto" : ""}
                    >
                      {/* botão ocultar/expandir */}
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          toggleProject(projectId);
                        }}
                        className="rounded-lg bg-white/10 hover:bg-white/20 p-1.5 ring-1 ring-white/10"
                        title={isCollapsed ? "Expandir" : "Ocultar"}
                      >
                        {isCollapsed ? (
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                            <path strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" d="M6 9l6 6 6-6" />
                          </svg>
                        ) : (
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                            <path strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" d="M18 15l-6-6-6 6" />
                          </svg>
                        )}
                      </button>

                      <span>{project.name}</span>

                      <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-white/10 text-gray-200 ring-1 ring-white/10">
                        {sceneCount} roteiro(s) • {totalCameras} câmera(s)
                      </span>
                    </div>

                    <div className="flex items-center gap-2">
                      {!running && hasAnyCamera && (
                        <button
                          disabled={!canEdit}
                          onClick={() => startProject(projectId)}
                          className={`px-3 py-1 rounded-lg text-sm ${canEdit ? "bg-emerald-700 hover:bg-emerald-600 text-white" : "bg-white/10 text-gray-400 cursor-not-allowed"}`}
                          title={paused ? "Retomar" : "Iniciar"}
                        >
                          {paused ? "Retomar" : "Iniciar"}
                        </button>
                      )}
                      {running && (
                        <button
                          disabled={!canEdit}
                          onClick={() => pauseProject(projectId)}
                          className={`px-3 py-1 rounded-lg text-sm ${canEdit ? "bg-yellow-600 hover:bg-yellow-500 text-white" : "bg-white/10 text-gray-400 cursor-not-allowed"}`}
                          title="Pausar"
                        >
                          Pausar
                        </button>
                      )}
                      {(paused || running) && (
                        <button
                          disabled={!canEdit}
                          onClick={() => resetProject(projectId)}
                          className={`px-3 py-1 rounded-lg text-sm ${canEdit ? "bg-white/10 hover:bg-white/20" : "bg-white/10 opacity-60 cursor-not-allowed"}`}
                          title="Resetar"
                        >
                          Resetar
                        </button>
                      )}

                      {canEdit && (
                        <button
                          onClick={() => removeProject(projectId)}
                          className="ml-2 bg-red-600/80 hover:bg-red-600 text-white rounded-full w-7 h-7 flex items-center justify-center text-sm font-bold shadow ring-1 ring-black/20"
                          title="Remover projeto"
                        >
                          ×
                        </button>
                      )}
                    </div>
                  </div>

                  {!isCollapsed && (
                    <>
                      <div className="mt-1 text-xs text-gray-300">
                        {running && typeof remaining === "number" ? `Em execução • ${remaining}s` : "Parado"}
                      </div>

                      <div className="mt-4 flex items-center justify-between">
                        <span className="text-xs text-gray-400">Gerencie cenas e câmeras</span>
                        {canEdit && <AddSceneInline onAdd={(sceneName) => addScene(projectId, sceneName)} />}
                      </div>

                      {/* Cenas */}
                      <div className="mt-5 flex gap-5 overflow-x-auto pb-2">
                        {scenesArr.length > 0 ? (
                          scenesArr.map(({ id: sceneId, ...scene }) => {
                            const camsArr = sortByOrderThenName(scene.cameras || {});
                            return (
                              <div
                                key={sceneId}
                                className="relative min-w-[360px] rounded-2xl p-[1px] bg-gradient-to-br from-white/10 via-white/5 to-white/10 overflow-visible"
                              >
                                <div className="relative h-full w-full rounded-2xl bg-black/40 border border-white/10 p-4 overflow-visible">
                                  {canEdit && (
                                    <button
                                      onClick={() => removeScene(projectId, sceneId)}
                                      className="absolute top-2 right-2 bg-red-600/80 hover:bg-red-600 text-white rounded-full w-6 h-6 flex items-center justify-center text-sm font-bold shadow ring-1 ring-black/20"
                                      title="Remover roteiro"
                                    >
                                      ×
                                    </button>
                                  )}

                                  <div className="flex items-center justify-between mb-3 pr-6">
                                    <h3
                                      className={`text-lg font-semibold flex items-center gap-2 ${canEdit ? "cursor-pointer" : ""}`}
                                      onDoubleClick={() => canEdit && editSceneName(projectId, sceneId)}
                                      title={canEdit ? "Duplo clique para editar o nome do roteiro" : ""}
                                    >
                                      {scene.name}
                                    </h3>
                                  </div>

                                  {/* CÂMERAS */}
                                  <div className="flex flex-nowrap gap-3 overflow-x-auto overflow-y-hidden pb-1">
                                    {camsArr.length > 0 ? (
                                      camsArr.map(({ id: cameraId, ...camera }) => {
                                        const camIsLive = isLiveHere(projectId, sceneId, cameraId);
                                        const durationSec = getDurationSec(projectId, sceneId, cameraId);
                                        const remainingForCard =
                                          camIsLive && typeof getRemainingSec(projectId) === "number"
                                            ? getRemainingSec(projectId)
                                            : null;

                                        return (
                                          <div key={cameraId} className="relative overflow-visible">
                                            {canEdit && (
                                              <button
                                                onClick={() => removeCamera(projectId, sceneId, cameraId)}
                                                className="absolute top-1 right-1 z-20 pointer-events-auto bg-red-600/80 hover:bg-red-600 text-white rounded-full w-6 h-6 flex items-center justify-center text-sm font-bold shadow ring-1 ring-black/20"
                                                title="Remover câmera"
                                              >
                                                ×
                                              </button>
                                            )}

                                            <CameraCard
                                              camera={{
                                                ...camera,
                                                durationSec,
                                                _isLive: camIsLive,
                                                remainingSec: remainingForCard,
                                              }}
                                              onEditName={canEdit ? () => editCameraName(projectId, sceneId, cameraId) : undefined}
                                              onEditDescription={canEdit ? () => editCameraDescription(projectId, sceneId, cameraId) : undefined}
                                              onEditDuration={canEdit ? () => editCameraDuration(projectId, sceneId, cameraId) : undefined}
                                            />
                                          </div>
                                        );
                                      })
                                    ) : (
                                      <div className="text-sm text-gray-300">Sem câmeras neste roteiro.</div>
                                    )}
                                  </div>

                                  {canEdit && (
                                    <AddCameraInline
                                      onAdd={(camName, desc) => addCamera(projectId, sceneId, camName, desc)}
                                    />
                                  )}
                                </div>
                              </div>
                            );
                          })
                        ) : (
                          <div className="text-sm text-gray-300">Sem roteiro ainda.</div>
                        )}
                      </div>
                    </>
                  )}
                </section>
              );
            })
          )}
        </main>

        <FloatingChat user={user} />
      </div>
    </AuthGate>
  );
}

/* ======= Auxiliares ======= */
function EmptyState() {
  return (
    <div className="rounded-2xl border border-white/10 bg-black/30 backdrop-blur-sm p-10 text-center shadow-xl">
      <h3 className="text-xl font-semibold mt-4">Sem projetos ainda</h3>
      <p className="text-gray-300 text-sm mt-1">Crie seu primeiro projeto, utilizando + Projeto para começar.</p>
    </div>
  );
}

function AddProjectBar({ onAdd }) {
  const [name, setName] = useState("");
  return (
    <div className="flex flex-col sm:flex-row gap-2 sm:items-center">
      <input
        className="flex-1 bg-black/50 border border-white/10 rounded-lg px-3 py-2 text-sm placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-emerald-600/50"
        placeholder="Nome do projeto (ex: Projeto Piloto)"
        value={name}
        onChange={(e) => setName(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            onAdd(name);
            setName("");
          }
        }}
      />
      <button
        onClick={() => {
          onAdd(name);
          setName("");
        }}
        className="bg-emerald-700 hover:bg-emerald-600 text-white px-4 py-2 rounded-lg text-sm shadow ring-1 ring-black/20"
      >
        + Projeto
      </button>
    </div>
  );
}

function AddSceneInline({ onAdd }) {
  const [name, setName] = useState("");
  return (
    <div className="flex gap-2">
      <input
        className="bg-black/50 border border-white/10 rounded px-3 py-2 text-sm placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-emerald-600/50"
        placeholder="Nova cena (ex: Cena 1)"
        value={name}
        onChange={(e) => setName(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            onAdd(name);
            setName("");
          }
        }}
      />
      <button
        onClick={() => {
          onAdd(name);
          setName("");
        }}
        className="bg-emerald-700 hover:bg-emerald-600 text-white px-3 py-2 rounded text-sm shadow ring-1 ring-black/20"
      >
        + Roteiro
      </button>
    </div>
  );
}

function AddCameraInline({ onAdd }) {
  const [name, setName] = useState("");
  const [desc, setDesc] = useState("");
  return (
    <div className="mt-4 flex items-center gap-2">
      <input
        className="bg-black/50 border border-white/10 rounded px-3 py-2 text-sm placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-emerald-600/50 w-48 flex-none"
        placeholder="Câmera (ex: Câmera A)"
        value={name}
        onChange={(e) => setName(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            onAdd(name, desc);
            setName("");
            setDesc("");
          }
        }}
      />
      <input
        className="bg-black/50 border border-white/10 rounded px-3 py-2 text-sm placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-emerald-600/50 w-64 flex-none"
        placeholder="Descrição (ex: Plano geral)"
        value={desc}
        onChange={(e) => setDesc(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            onAdd(name, desc);
            setName("");
            setDesc("");
          }
        }}
      />
      <button
        onClick={() => {
          onAdd(name, desc);
          setName("");
          setDesc("");
        }}
        className="bg-emerald-700 hover:bg-emerald-600 text-white px-3 py-2 rounded text-sm shadow ring-1 ring-black/20 flex-none"
      >
        + Câmera
      </button>
    </div>
  );
}
