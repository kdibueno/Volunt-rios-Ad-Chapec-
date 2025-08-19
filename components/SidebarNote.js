import React, { useEffect, useState } from "react";
import { ref, onValue, push } from "firebase/database";
import { db } from "../lib/firebase";

/**
 * Props:
 * - open: boolean
 * - onClose: () => void
 * - projectId?: string
 * - sceneId?: string
 * - cameraId?: string
 * - user: { uid, displayName, email }
 *
 * Salva histórico com push:
 *  - Projeto: notes/<projectId>/__project__
 *  - Cena:    notes/<projectId>/<sceneId>/__scene__
 *  - Câmera:  notes/<projectId>/<sceneId>/<cameraId>
 */
export default function SidebarNote({
  open,
  onClose,
  projectId,
  sceneId,
  cameraId,
  user,
}) {
  const [text, setText] = useState("");
  const [entries, setEntries] = useState([]); // [{id, text, by, at}]

  const path = getPath(projectId, sceneId, cameraId);

  useEffect(() => {
    if (!open || !path) return;
    const notesRef = ref(db, path);
    const unsub = onValue(notesRef, (snap) => {
      const val = snap.val() || {};
      // transforma em array ordenada por at crescente
      const arr = Object.entries(val).map(([id, v]) => ({ id, ...v }));
      arr.sort((a, b) => (a.at || 0) - (b.at || 0));
      setEntries(arr);
    });
    return () => unsub();
  }, [open, path]);

  function getTitle() {
    if (cameraId) return "Observações da Câmera";
    if (sceneId) return "Observações da Cena";
    if (projectId) return "Observações do Projeto";
    return "Observações";
  }

  function getPath(projectId, sceneId, cameraId) {
    if (!projectId) return null;
    if (cameraId) return `notes/${projectId}/${sceneId}/${cameraId}`;
    if (sceneId) return `notes/${projectId}/${sceneId}/__scene__`;
    return `notes/${projectId}/__project__`;
  }

  async function addEntry() {
    const t = text.trim();
    if (!t || !path) return;
    await push(ref(db, path), {
      text: t,
      by: {
        uid: user?.uid || "anon",
        name: user?.displayName || user?.email || "Usuário",
      },
      at: Date.now(),
    });
    setText("");
  }

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex">
      {/* overlay */}
      <div
        className="flex-1 bg-black/50"
        onClick={onClose}
        aria-label="Fechar painel"
      />

      {/* drawer */}
      <aside className="w-full max-w-md bg-green-900 text-white border-l border-white/10 shadow-2xl overflow-hidden">
        <div className="flex items-center justify-between px-4 py-3 border-b border-white/10 bg-white/5">
          <h3 className="font-semibold">{getTitle()}</h3>
          <button
            onClick={onClose}
            className="bg-red-600 hover:bg-red-700 text-white rounded-full w-7 h-7 flex items-center justify-center text-sm font-bold"
            title="Fechar"
          >
            ×
          </button>
        </div>

        {/* histórico */}
        <div className="px-4 py-3 h-[70vh] overflow-y-auto space-y-3">
          {entries.length === 0 ? (
            <div className="text-sm text-gray-400">Sem observações ainda.</div>
          ) : (
            entries.map((e) => (
              <div
                key={e.id}
                className="rounded-lg border border-white/10 bg-white/5 p-3"
              >
                <div className="text-xs text-gray-400 mb-1">
                  {e.by?.name || "Usuário"} •{" "}
                  {e.at ? new Date(e.at).toLocaleString() : ""}
                </div>
                <div className="text-sm whitespace-pre-wrap">{e.text}</div>
              </div>
            ))
          )}
        </div>

        {/* composer */}
        <div className="px-4 py-3 border-t border-white/10 bg-white/5">
          <div className="flex items-start gap-2">
            <textarea
              className="flex-1 bg-gray-800 border border-white/10 rounded-md px-3 py-2 text-sm placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-indigo-600/50 h-24"
              placeholder="Escreva uma observação..."
              value={text}
              onChange={(e) => setText(e.target.value)}
              onKeyDown={(e) => {
                if ((e.metaKey || e.ctrlKey) && e.key === "Enter") addEntry();
              }}
            />
            <button
              onClick={addEntry}
              className="self-end bg-gradient-to-r from-indigo-600 to-blue-600 hover:from-indigo-500 hover:to-blue-500 text-white px-4 py-2 rounded-md text-sm"
            >
              Adicionar
            </button>
          </div>
          <p className="mt-2 text-[11px] text-gray-400">
            Dica: <kbd className="px-1 py-[1px] rounded bg-white/10">Ctrl/⌘</kbd> +{" "}
            <kbd className="px-1 py-[1px] rounded bg-white/10">Enter</kbd> para enviar.
          </p>
        </div>
      </aside>
    </div>
  );
}
