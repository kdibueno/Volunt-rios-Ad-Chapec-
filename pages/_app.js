import { useEffect } from "react";
import "../styles/globals.css";
import Head from "next/head";

import { RouteTransitionProvider } from "../components/RouteTransitions";
import RouteTransitionOverlay from "../components/RouteTransitionOverlay";

export default function MyApp({ Component, pageProps }) {
  useEffect(() => {
    const anti = document.getElementById("anti-flash");
    if (anti && anti.parentNode) anti.parentNode.removeChild(anti);
    document.documentElement.style.background = "";
    document.body.style.background = "";
  }, []);

  return (
    <>
      <Head>
        <title>Voluntários AD Chapecó</title>
        <meta name="description" content="Descrição do meu projeto" />
        
        {/* 🔹 Ícone da aba usando sua logo */}
        <link rel="icon" href="/icon.png" type="image/png" />
        {/* se for .svg, pode usar: */}
        {/* <link rel="icon" href="/logo.svg" type="image/svg+xml" /> */}
      </Head>

      <RouteTransitionProvider>
        <Component {...pageProps} />
        <RouteTransitionOverlay />
      </RouteTransitionProvider>
    </>
  );
}
