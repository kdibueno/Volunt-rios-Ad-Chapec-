// components/BackToPortalButton.jsx
import { useCallback } from "react";
import { useRouteTransition } from "./RouteTransitions";

export default function BackToPortalButton({
  label = "Voltar ao Portal",
  message = "Voltando ao portal…",
  className = "",
}) {
  const { startWithModal } = useRouteTransition();

  const onClick = useCallback(
    (e) => {
      e.preventDefault();
      // abre o modal de carregando + faz a transição com hold mínimo
      startWithModal("/portal", { message });
    },
    [startWithModal, message]
  );

  return (
    <button
      onClick={onClick}
      className={
        // estilo discreto (verde/preto) — ajuste se quiser
        "inline-flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm " +
        "bg-white/10 hover:bg-white/20 ring-1 ring-white/10 transition " +
        className
      }
      title="Voltar ao Portal"
    >
      {/* ícone seta (SVG) */}
      <svg
        xmlns="http://www.w3.org/2000/svg"
        className="h-4 w-4"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
      >
        <path strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
      </svg>
      {label}
    </button>
  );
}
