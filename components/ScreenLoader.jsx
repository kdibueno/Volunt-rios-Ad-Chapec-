// components/ScreenLoader.jsx
export default function ScreenLoader({ message = "Carregando..." }) {
  return (
    <div className="fixed inset-0 z-[1000] grid place-items-center bg-gradient-to-b from-black via-emerald-950 to-emerald-900">
      <div className="flex flex-col items-center gap-4">
        <div className="relative h-14 w-14">
          <div className="absolute inset-0 rounded-full border-2 border-white/20" />
          {/* Loader verde no lugar do azul */}
          <div className="absolute inset-0 rounded-full border-2 border-emerald-500 border-t-transparent animate-spin" />
        </div>
        <div className="text-sm text-gray-200 animate-pulse">{message}</div>
      </div>
    </div>
  );
}
