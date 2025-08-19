// components/LoginScreen.js
import { useEffect } from "react";
import { useRouter } from "next/router";

export default function LoginScreen() {
  const router = useRouter();

  useEffect(() => {
    // preserva a rota atual como ?next=
    const next =
      typeof window !== "undefined" ? encodeURIComponent(window.location.pathname + window.location.search) : "%2F";
    router.replace(`/login?next=${next}`);
  }, [router]);

  return null;
}
