// components/FloatingMusicPlayer.js
import { useState, useRef, useEffect } from "react";

export default function FloatingMusicPlayer({
  genres = [],
  bottomClass = "bottom-6",
  rightClass = "right-6",
}) {
  const [open, setOpen] = useState(false);
  const [genre, setGenre] = useState(genres[0] || "");
  const [tracks, setTracks] = useState([]);
  const [currentTrack, setCurrentTrack] = useState(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const audioRef = useRef(null);

  // simulação de fetch das músicas
  useEffect(() => {
    if (!genre) return;
    // aqui você trocaria para buscar as músicas da pasta selecionada
    setTracks([
      { title: `${genre} - Música 1`, url: "/music/sample1.mp3", desc: "Descrição da música 1" },
      { title: `${genre} - Música 2`, url: "/music/sample2.mp3", desc: "Descrição da música 2" },
    ]);
    setCurrentTrack(null);
    setIsPlaying(false);
  }, [genre]);

  function playTrack(track) {
    setCurrentTrack(track);
    setIsPlaying(true);
    if (audioRef.current) {
      audioRef.current.src = track.url;
      audioRef.current.play();
    }
  }

  function togglePlayPause() {
    if (!currentTrack || !audioRef.current) return;
    if (isPlaying) {
      audioRef.current.pause();
      setIsPlaying(false);
    } else {
      audioRef.current.play();
      setIsPlaying(true);
    }
  }

  function nextTrack() {
    if (!currentTrack) return;
    const idx = tracks.findIndex((t) => t.url === currentTrack.url);
    const next = tracks[(idx + 1) % tracks.length];
    playTrack(next);
  }

  function prevTrack() {
    if (!currentTrack) return;
    const idx = tracks.findIndex((t) => t.url === currentTrack.url);
    const prev = tracks[(idx - 1 + tracks.length) % tracks.length];
    playTrack(prev);
  }

  return (
    <>
      {/* Botão flutuante (nota musical) */}
      <button
        onClick={() => setOpen((v) => !v)}
        className={`fixed ${bottomClass} ${rightClass} z-50 rounded-full w-14 h-14 
          bg-gradient-to-br from-emerald-600 to-emerald-700 
          hover:from-emerald-500 hover:to-emerald-600 
          text-white shadow-xl ring-1 ring-white/10 
          flex items-center justify-center transition active:scale-95`}
        title={open ? "Fechar player" : "Abrir player"}
      >
        {/* ícone nota musical */}
        <svg
          xmlns="http://www.w3.org/2000/svg"
          className={`h-6 w-6 ${isPlaying ? "animate-pulse" : ""}`}
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
        >
          <path strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" d="M9 19V6l10-2v13" />
          <circle cx="7" cy="19" r="2" />
          <circle cx="17" cy="17" r="2" />
        </svg>
      </button>

      {/* Janela do player */}
      {open && (
        <div
          className={`fixed bottom-24 ${rightClass} z-50 w-[320px] sm:w-[360px] 
            rounded-2xl overflow-hidden 
            bg-gray-900/90 backdrop-blur 
            border border-white/10 shadow-2xl`}
        >
          <div className="p-4 space-y-3">
            <h2 className="text-sm font-semibold text-white">Player de Música</h2>

            {/* Seletor de gênero */}
            <select
              className="w-full bg-black/40 border border-white/10 rounded px-2 py-1 text-sm"
              value={genre}
              onChange={(e) => setGenre(e.target.value)}
            >
              {genres.map((g) => (
                <option key={g} value={g}>
                  {g}
                </option>
              ))}
            </select>

            {/* Música atual */}
            {currentTrack && (
              <div className="text-xs text-gray-300">
                <p className="font-medium">{currentTrack.title}</p>
                <p className="text-gray-400">{currentTrack.desc}</p>
              </div>
            )}

            {/* Controles */}
            <div className="flex items-center justify-center gap-3">
              <button
                onClick={prevTrack}
                className="p-2 rounded bg-white/10 hover:bg-white/20"
                title="Anterior"
              >
                ⏮
              </button>
              <button
                onClick={togglePlayPause}
                className="p-2 rounded bg-emerald-600 hover:bg-emerald-500"
                title={isPlaying ? "Pausar" : "Tocar"}
              >
                {isPlaying ? "⏸" : "▶️"}
              </button>
              <button
                onClick={nextTrack}
                className="p-2 rounded bg-white/10 hover:bg-white/20"
                title="Próxima"
              >
                ⏭
              </button>
            </div>

            {/* Lista de músicas */}
            <div className="space-y-1 max-h-32 overflow-y-auto">
              {tracks.map((track) => (
                <button
                  key={track.url}
                  onClick={() => playTrack(track)}
                  className={`w-full text-left px-2 py-1 rounded text-xs ${
                    currentTrack?.url === track.url
                      ? "bg-emerald-600/40 text-white"
                      : "bg-white/5 text-gray-300 hover:bg-white/10"
                  }`}
                >
                  {track.title}
                </button>
              ))}
            </div>
          </div>

          <audio ref={audioRef} onEnded={nextTrack} />
        </div>
      )}
    </>
  );
}
