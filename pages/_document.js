// pages/_document.js
import { Html, Head, Main, NextScript } from "next/document";

export default function Document() {
  return (
    <Html lang="pt-BR" className="h-full">
      <Head>
        {/* Força a barra do sistema/navegador a usar preto */}
        <meta name="theme-color" content="#000000" />
      </Head>
      <body
        className="h-full antialiased"
        // ⚑ Este inline roda antes de qualquer CSS/JS — elimina o flash azul
        style={{
          margin: 0,
          background: "#000", // fallback imediato (substituído pelo gradiente do _app depois)
          color: "#fff",
        }}
      >
        <Main />
        <NextScript />
      </body>
    </Html>
  );
}
