// components/RouteLoader.jsx
import { useEffect, useState } from "react";
import { useRouter } from "next/router";
import ScreenLoader from "./ScreenLoader";

export default function RouteLoader() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let t;
    const start = () => {
      // Debounce rápido pra evitar piscar em navegações instantâneas
      t = setTimeout(() => setLoading(true), 120);
    };
    const done = () => {
      clearTimeout(t);
      setLoading(false);
    };

    router.events.on("routeChangeStart", start);
    router.events.on("routeChangeComplete", done);
    router.events.on("routeChangeError", done);
    return () => {
      router.events.off("routeChangeStart", start);
      router.events.off("routeChangeComplete", done);
      router.events.off("routeChangeError", done);
    };
  }, [router.events]);

  if (!loading) return null;
  return <ScreenLoader message="Trocando de tela..." />;
}
