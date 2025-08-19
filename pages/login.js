// pages/login.js
import { useEffect, useState } from "react";
import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  updateProfile,
  signOut,
} from "firebase/auth";
import { ref, set, get } from "firebase/database";
import { auth, db } from "../lib/firebase";
import { DEFAULT_ROLES } from "../lib/roles";
import Image from "next/image";

/* ---------- Logo redonda (com fallback) ---------- */
function RoundLogo() {
  const candidates = [
    "/voluntarios.png",
    "/logo-voluntarios.png",
    "/Logo%20Volunt%C3%A1rios.png",
  ];
  const [idx, setIdx] = useState(0);
  const [failed, setFailed] = useState(false);
  const onError = () =>
    idx < candidates.length - 1 ? setIdx((i) => i + 1) : setFailed(true);

  return (
    <div className="relative h-16 w-16 rounded-full overflow-hidden ring-2 ring-white/30 shadow-md bg-white/5">
      {!failed ? (
        <Image
          src={candidates[idx]}
          alt="Logo"
          fill
          sizes="64px"
          className="object-contain p-1"
          priority
          onError={onError}
        />
      ) : (
        <div className="h-full w-full grid place-items-center text-gray-400 text-xs">
          LOGO
        </div>
      )}
    </div>
  );
}

export default function LoginPage() {
  const [mode, setMode] = useState("login"); // "login" | "signup"
  const [email, setEmail] = useState("");
  const [pass, setPass] = useState("");
  const [name, setName] = useState("");

  const [busy, setBusy] = useState(false);      // estado do botão
  const [err, setErr] = useState("");           // erros de login/signup
  const [info, setInfo] = useState("");         // mensagens informativas (pendente, criado, etc.)
  const [autoChecking, setAutoChecking] = useState(true); // checagem automática se já está logado

  // Se o usuário já estiver autenticado e vier ao /login,
  // checamos o status: se approved -> /portal; se pending -> signOut e mensagem.
  useEffect(() => {
    const unsub = auth.onAuthStateChanged(async (u) => {
      if (!u) {
        setAutoChecking(false);
        return;
      }
      try {
        const snap = await get(ref(db, `users/${u.uid}`));
        const node = snap.val() || {};
        const status = node?.status || "approved"; // fallback para legados
        if (status === "approved") {
          window.location.href = "/portal";
        } else {
          // pendente -> sair e exibir mensagem
          await signOut(auth);
          setInfo("Seu cadastro está em análise. Aguarde um administrador aprovar sua solicitação.");
          setAutoChecking(false);
        }
      } catch {
        // falha ao ler nó: por segurança, sair e permitir tentar novamente
        await signOut(auth);
        setAutoChecking(false);
      }
    });
    return () => unsub();
  }, []);

  async function handleLogin(e) {
    e.preventDefault();
    setErr("");
    setInfo("");
    setBusy(true);
    try {
      if (mode === "login") {
        const cred = await signInWithEmailAndPassword(auth, email, pass);
        // Checa status no DB antes de sair da página de login
        const snap = await get(ref(db, `users/${cred.user.uid}`));
        const node = snap.val() || {};
        const status = node?.status || "approved";

        if (status === "approved") {
          window.location.href = "/portal";
        } else {
          // pendente -> signOut e mostrar mensagem
          await signOut(auth);
          setInfo("Seu cadastro está em análise. Aguarde um administrador aprovar sua solicitação.");
        }
      } else {
        // signup
        const { user } = await createUserWithEmailAndPassword(auth, email, pass);
        if (name?.trim()) {
          await updateProfile(user, { displayName: name.trim() });
        }
        // cria nó: por padrão PENDENTE
        await set(ref(db, `users/${user.uid}`), {
          email: user.email,
          displayName: name?.trim() || user.email.split("@")[0],
          createdAt: Date.now(),
          roles: { ...DEFAULT_ROLES },
          status: "pending",
        });
        // após criar, sai e mostra mensagem de análise
        await signOut(auth);
        setInfo("Conta criada! Seu cadastro está em análise. Você poderá acessar quando for aprovado.");
      }
    } catch (e) {
      setErr(e.message || "Falha na autenticação.");
    } finally {
      setBusy(false);
    }
  }

  const isLoading = busy || autoChecking;

  return (
    <div className="min-h-screen relative overflow-hidden bg-gradient-to-b from-black via-emerald-950 to-emerald-900 text-white">
      {/* glows */}
      <div className="pointer-events-none absolute -top-36 -left-36 h-72 w-72 bg-emerald-600/20 blur-3xl rounded-full" />
      <div className="pointer-events-none absolute -bottom-36 -right-36 h-72 w-72 bg-emerald-700/20 blur-3xl rounded-full" />

      <div className="min-h-screen flex items-center justify-center p-4">
        <form
          onSubmit={handleLogin}
          className="w-full max-w-md bg-white/10 backdrop-blur-md border border-white/15 rounded-2xl p-8 shadow-2xl"
        >
          {/* Cabeçalho */}
          <div className="flex flex-col items-center gap-3 mb-6">
            <RoundLogo />
            <div className="text-center">
              <h1 className="text-2xl font-semibold leading-tight text-white">
                Acesso ao Portal
              </h1>
              <p className="text-xs text-gray-300">
                {mode === "login"
                  ? "Entre com suas credenciais"
                  : "Crie sua conta"}
              </p>
            </div>
          </div>

          {mode === "signup" && (
            <div className="mb-3">
              <label className="block text-left text-xs text-gray-300">
                Nome
              </label>
              <input
                className="mt-1 w-full bg-black/40 border border-white/15 rounded-lg px-3 py-2 text-sm text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-emerald-600/60"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Seu nome"
                required
              />
            </div>
          )}

          <div className="mb-3">
            <label className="block text-left text-xs text-gray-300">
              E-mail
            </label>
            <input
              type="email"
              className="mt-1 w-full bg-black/40 border border-white/15 rounded-lg px-3 py-2 text-sm text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-emerald-600/60"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="seu@email.com"
              required
            />
          </div>

          <div className="mb-4">
            <label className="block text-left text-xs text-gray-300">
              Senha
            </label>
            <input
              type="password"
              className="mt-1 w-full bg-black/40 border border-white/15 rounded-lg px-3 py-2 text-sm text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-emerald-600/60"
              value={pass}
              onChange={(e) => setPass(e.target.value)}
              placeholder="••••••••"
              required
            />
          </div>

          {err && (
            <div className="mb-3 text-xs text-red-400 bg-red-900/25 border border-red-500/30 rounded-lg px-3 py-2 text-center">
              {err}
            </div>
          )}
          {info && !err && (
            <div className="mb-3 text-xs text-emerald-300/90 bg-emerald-900/20 border border-emerald-500/30 rounded-lg px-3 py-2 text-center">
              {info}
            </div>
          )}

          {/* Botão menor com spinner quando carregando */}
          <div className="flex justify-center">
            <button
              disabled={isLoading}
              className="
                inline-flex items-center justify-center gap-2
                bg-black hover:bg-emerald-600 disabled:opacity-60
                text-white font-medium text-sm
                py-2.5 px-5 rounded-lg
                ring-1 ring-black/20
                transition hover:-translate-y-0.5
                focus:outline-none focus:ring-2 focus:ring-emerald-400/60
                hover:shadow-[0_0_24px_rgba(16,185,129,0.35)]
              "
              type="submit"
            >
              {isLoading && (
                <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white/80" />
              )}
              {mode === "login" ? "Entrar" : "Criar conta"}
            </button>
          </div>

          <div className="text-xs text-gray-400 mt-4 text-center">
            {mode === "login" ? (
              <>
                Não tem conta?{" "}
                <button
                  type="button"
                  className="text-emerald-400 hover:underline"
                  onClick={() => {
                    setErr("");
                    setInfo("");
                    setMode("signup");
                  }}
                >
                  Cadastre-se
                </button>
              </>
            ) : (
              <>
                Já tem conta?{" "}
                <button
                  type="button"
                  className="text-emerald-400 hover:underline"
                  onClick={() => {
                    setErr("");
                    setInfo("");
                    setMode("login");
                  }}
                >
                  Fazer login
                </button>
              </>
            )}
          </div>
        </form>
      </div>
    </div>
  );
}
