// components/AuthButton.js
import { useState } from "react";
import { signOut } from "firebase/auth";
import { auth } from "../lib/firebase";
import { useRouter } from "next/router";
import { useRouteTransition } from "./RouteTransitions";

export default function AuthButton({ user }) {
  const [busy, setBusy] = useState(false);
  const router = useRouter();
  const { startWithModal } = useRouteTransition();

  async function handleSignOut() {
    if (busy) return;
    setBusy(true);

    // Evitar qualquer erro de storage em contextos restritos
    try { localStorage.removeItem("chatNotifEnabled"); } catch {}

    try {
      await signOut(auth);
      // usa o modal + fade que você já tem
      if (startWithModal) {
        startWithModal("/login", { message: "Saindo…" });
      } else {
        router.replace("/login");
      }
    } catch (e) {
      // fallback silencioso
      router.replace("/login");
    } finally {
      setBusy(false);
    }
  }

  if (!user) return null;

  return (
    <button
      onClick={handleSignOut}
      disabled={busy}
      className={`
        inline-flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm
        ${busy ? "opacity-70 cursor-not-allowed" : "hover:bg-white/10"}
        border border-white/10 bg-white/5 text-white
      `}
      title="Sair"
    >
      {/* ícone de logoff */}
      <svg
        xmlns="http://www.w3.org/2000/svg"
        className={`h-4 w-4 ${busy ? "animate-spin" : ""}`}
        viewBox="0 0 24 24" fill="none" stroke="currentColor"
      >
        <path strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" d="M15 3h4a2 2 0 012 2v3M10 17l5-5-5-5M21 21H7a2 2 0 01-2-2V5" />
      </svg>
      <span className="hidden sm:inline">{busy ? "Saindo…" : "Sair"}</span>
    </button>
  );
}
