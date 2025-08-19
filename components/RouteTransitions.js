// components/RouteTransitions.js
import { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";
import { useRouter } from "next/router";

const noop = () => {};
const RouteTransitionCtx = createContext({
  startWithModal: noop,
  fadeTo: noop,
  pageVisible: true,
});

export function RouteTransitionProvider({ children }) {
  const router = useRouter();
  const [overlay, setOverlay] = useState({ visible: false, mode: "modal", msg: "" });
  const [pageVisible, setPageVisible] = useState(false);
  const holdTimerRef = useRef(null);
  const pendingPathRef = useRef(null);

  // Conteúdo nasce opaco e faz fade-in ao montar
  useEffect(() => {
    const t = setTimeout(() => setPageVisible(true), 20);
    return () => clearTimeout(t);
  }, []);

  useEffect(() => {
    return () => {
      if (holdTimerRef.current) clearTimeout(holdTimerRef.current);
    };
  }, []);

  const finishOverlayWithHold = useCallback((minHoldAfterCompleteMs = 0) => {
    if (holdTimerRef.current) clearTimeout(holdTimerRef.current);
    holdTimerRef.current = setTimeout(() => {
      setOverlay((o) => ({ ...o, visible: false }));
      pendingPathRef.current = null;
    }, Math.max(0, minHoldAfterCompleteMs));
  }, []);

  // Abre modal, navega e segura por +3s após concluir
  const startWithModal = useCallback(
    (path, { message = "Carregando…" } = {}) => {
      try {
        setOverlay({ visible: true, mode: "modal", msg: message });
        pendingPathRef.current = path;
        router.push(path);
      } catch {
        setOverlay((o) => ({ ...o, visible: false }));
      }
    },
    [router]
  );

  // Fade simples sem modal
  const fadeTo = useCallback(
    (path) => {
      try {
        setPageVisible(false);
        setTimeout(() => {
          router.push(path);
        }, 150);
      } catch {
        setPageVisible(true);
      }
    },
    [router]
  );

  useEffect(() => {
    function onComplete(url) {
      if (overlay.visible && overlay.mode === "modal" && pendingPathRef.current === url) {
        finishOverlayWithHold(3000);
      }
      setTimeout(() => setPageVisible(true), 30);
    }
    function onError() {
      setOverlay((o) => ({ ...o, visible: false }));
      setPageVisible(true);
    }

    router.events.on("routeChangeComplete", onComplete);
    router.events.on("routeChangeError", onError);
    return () => {
      router.events.off("routeChangeComplete", onComplete);
      router.events.off("routeChangeError", onError);
    };
  }, [router.events, overlay.visible, overlay.mode, finishOverlayWithHold]);

  return (
    <RouteTransitionCtx.Provider value={{ startWithModal, fadeTo, pageVisible }}>
      {/* Modal de carregando */}
      {overlay.visible && overlay.mode === "modal" && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/70 backdrop-blur-sm">
          <div className="flex flex-col items-center gap-3">
            <div className="h-10 w-10 rounded-full border-2 border-white/30 border-t-white animate-spin" />
            <div className="text-sm text-gray-200">{overlay.msg || "Carregando…"}</div>
          </div>
        </div>
      )}

      {/* Wrapper com fade */}
      <div className={`transition-opacity duration-300 ${pageVisible ? "opacity-100" : "opacity-0"}`}>
        {children}
      </div>
    </RouteTransitionCtx.Provider>
  );
}

export function useRouteTransition() {
  const ctx = useContext(RouteTransitionCtx);
  return ctx || { startWithModal: noop, fadeTo: noop, pageVisible: true };
}

// Também exporta como default (opcional)
export default RouteTransitionProvider;
