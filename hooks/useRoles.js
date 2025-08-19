// hooks/useRoles.js
import { useEffect, useState } from "react";
import { ref, onValue } from "firebase/database";
import { db } from "../lib/firebase";
import { DEFAULT_ROLES } from "../lib/roles";

export default function useRoles(user) {
  const [roles, setRoles] = useState(null);
  const [loading, setLoading] = useState(!!user);

  useEffect(() => {
    if (!user) {
      setRoles(null);
      setLoading(false);
      return;
    }
    const r = ref(db, `users/${user.uid}/roles`);
    const unsub = onValue(r, (snap) => {
      setRoles({ ...DEFAULT_ROLES, ...(snap.val() || {}) });
      setLoading(false);
    });
    return () => unsub();
  }, [user]);

  return { roles: roles || DEFAULT_ROLES, loading };
}
