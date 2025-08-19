// components/BackToPortalLink.js
import { Home } from "lucide-react";
import { useRouteTransition } from "./RouteTransitions";

export default function BackToPortalLink({ label = "Portal" }) {
  const { fadeTo } = useRouteTransition();

  return (
    <button
      onClick={() => fadeTo("/portal")}
      className="px-3 py-1.5 text-sm rounded-lg bg-white/10 hover:bg-white/20 flex items-center gap-2 transition-colors"
      title="Voltar ao Portal"
    >
      <Home className="w-4 h-4 opacity-90" />
      <span>{label}</span>
    </button>
  );
}
