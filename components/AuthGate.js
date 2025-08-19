// components/AuthGate.js
import { useEffect, useState } from "react";
import { onAuthStateChanged } from "firebase/auth";
import { useRouter } from "next/router";
import { auth, db } from "../lib/firebase";
import { ref, onValue } from "firebase/database";

export default function AuthGate({ children, requireRole }) {
  const router = useRouter();
  const [user, setUser] = useState(null);
  const [roles, setRoles] = useState({});
  const [checking, setChecking] = useState(true);

  // auth
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (u) => {
      setUser(u || null);
      setChecking(false);
    });
    return () => unsub();
  }, []);

  // roles do usuário
  useEffect(() => {
    if (!user) {
      setRoles({});
      return;
    }
    const r = ref(db, `users/${user.uid}/roles`);
    const unsub = onValue(r, (snap) => setRoles(snap.val() || {}));
    return () => unsub();
  }, [user]);

  // gate por role (se exigido)
  const hasRole =
    !requireRole || (roles && roles[requireRole]) || (requireRole === "admin" && roles?.admin);

  // 1) Enquanto checa sessão: no /login não mostra nada (deixa o botão/spinner cuidar)
  if (checking && router.pathname === "/login") {
    return null;
  }

  // 2) Enquanto checa sessão em outras páginas: overlay minimalista sem texto
  if (checking && router.pathname !== "/login") {
    return (
      <div className="fixed inset-0 z-[999] bg-transparent pointer-events-none">
        {/* opcional: spinner sutil (sem texto) */}
        <div className="absolute inset-0 grid place-items-center">
          <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white/80" />
        </div>
      </div>
    );
  }

  // 3) Se não logado e não está em /login -> manda para login
  if (!user && router.pathname !== "/login") {
    if (typeof window !== "undefined") router.replace("/login");
    return null;
  }

  // 4) Se a página exige role e o usuário não tem: você pode redirecionar ou renderizar nada
  if (requireRole && !hasRole) {
    // sem mensagem “sem permissão” aqui para não poluir a UI
    return null;
  }

  return <>{children}</>;
}
