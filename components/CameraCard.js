// components/CameraCard.js
export default function CameraCard({
  camera = {},
  onOpenNotes,
  onEditName,
  onEditDescription,
  onEditDuration, // duplo clique no timer
  className = "",
}) {
  const {
    name = "Câmera",
    description = "",
    durationSec = 30,
    remainingSec = null, // quando estiver ao vivo, o index passa esse valor
    _isLive = false,
  } = camera;

  const baseClasses = _isLive
    ? "bg-red-900/40 border-red-500/60"
    : "bg-gray-900/60 border-white/10";

  const timeToShow =
    _isLive && typeof remainingSec === "number" ? remainingSec : durationSec;

  return (
    <div
      className={`w-56 flex-shrink-0 rounded-xl border p-3 shadow transition ${baseClasses} ${className}`}
    >
      {/* Cabeçalho: 🎥 Nome */}
      <div className="flex items-center justify-between gap-2">
        {/* Nome da câmera (duplo clique para editar) */}
        <h4
          className="font-semibold truncate cursor-pointer"
          onDoubleClick={onEditName}
          title="Duplo clique para editar nome"
        >
          🎥 {name}
        </h4>
      </div>

      {/* Timer + Ao vivo (alinhados verticalmente e afastados da borda) */}
      <div className="flex flex-col items-end mt-2 mr-1">
        <span
          className="text-[11px] px-2 py-0.5 rounded-full bg-black/60 border border-white/10 cursor-pointer select-none"
          title="Duplo clique para editar duração"
          onDoubleClick={onEditDuration}
        >
          ⏱ {Number(timeToShow)}s
        </span>

        {_isLive && (
          <span className="mt-1 text-[10px] px-2 py-0.5 rounded-full bg-red-600 text-white">
            No Ar
          </span>
        )}
      </div>

      {/* Descrição (duplo clique para editar) */}
      <p
        className="mt-2 text-xs text-gray-300 cursor-pointer"
        onDoubleClick={onEditDescription}
        title="Duplo clique para editar descrição"
      >
        {description || "Sem descrição"}
      </p>
    </div>
  );
}
