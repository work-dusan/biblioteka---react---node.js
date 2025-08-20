import { createContext, useState, useEffect, ReactNode, useCallback } from "react";
import api from "../api/apiService";
import type { User } from "../types";

export interface AuthContextValue {
  user: User | null;
  login: (email: string, password: string) => Promise<{ success: boolean; message?: string }>;
  register: (name: string, email: string, password: string) => Promise<{ success: boolean; message?: string }>;
  logout: () => void;
  toggleFavorite: (bookId: string) => Promise<void>;
  updateProfile: (patch: { name?: string; email?: string; password?: string }) => Promise<{ success: boolean; message?: string }>;
  refreshMe: () => Promise<void>;
}

export const AuthContext = createContext<AuthContextValue>({
  user: null,
  login: async () => ({ success: false }),
  register: async () => ({ success: false }),
  logout: () => {},
  toggleFavorite: async () => {},
  updateProfile: async () => ({ success: false }),
  refreshMe: async () => {}
});

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);

  const refreshMe = useCallback(async () => {
    const token = localStorage.getItem("token");
    if (!token) {
      setUser(null);
      return;
    }
    try {
      // Authorization ide kroz interceptor
      const res = await api.get("/auth/me");
      setUser(res.data?.data ?? null);
    } catch {
      localStorage.removeItem("token");
      setUser(null);
    }
  }, []);

  useEffect(() => { void refreshMe(); }, [refreshMe]);

  const login: AuthContextValue["login"] = async (email, password) => {
    try {
      const res = await api.post("/auth/login", { email, password });
      const u = res.data?.data;
      if (!u?.token) return { success: false, message: "Neispravni podaci" };
      localStorage.setItem("token", u.token);
      setUser(u);
      return { success: true };
    } catch (err: any) {
      return { success: false, message: err.response?.data?.error || "Greška pri prijavi" };
    }
  };

  const register: AuthContextValue["register"] = async (name, email, password) => {
    try {
      const res = await api.post("/auth/register", { name, email, password });
      const u = res.data?.data;
      if (!u?.token) return { success: false, message: "Greška pri registraciji" };
      localStorage.setItem("token", u.token);
      setUser(u);
      return { success: true };
    } catch (err: any) {
      return { success: false, message: err.response?.data?.error || "Greška pri registraciji" };
    }
  };

  const logout = () => {
    localStorage.removeItem("token");
    setUser(null);
  };

  const toggleFavorite: AuthContextValue["toggleFavorite"] = async (bookId) => {
    if (!user) return;

    // ✅ Normalizacija ID-a korisnika (id ili _id)
    const userId = (user as any).id ?? (user as any)._id;
    if (!userId) {
      console.error("Nedostaje user.id / user._id u AuthContext-u.");
      return;
    }

    const prevFavorites = Array.isArray(user.favorites) ? user.favorites : [];
    const favorites = prevFavorites.includes(bookId)
      ? prevFavorites.filter((id) => id !== bookId)
      : [...prevFavorites, bookId];

    // optimistički update
    setUser({ ...user, favorites });

    try {
      const res = await api.patch(`/users/${userId}`, { favorites });
      const updated = res.data?.data ?? null;
      if (updated) setUser(updated);
    } catch (e) {
      // rollback
      setUser({ ...user, favorites: prevFavorites });
      throw e;
    }
  };

  const updateProfile: AuthContextValue["updateProfile"] = async (patch) => {
    if (!user) return { success: false, message: "Niste prijavljeni." };

    const userId = (user as any).id ?? (user as any)._id;
    if (!userId) return { success: false, message: "Nedostaje ID korisnika." };

    try {
      const res = await api.patch(`/users/${userId}`, patch);
      const updated = res.data?.data ?? null;
      if (updated) {
        setUser(updated);
        return { success: true };
      }
      return { success: false, message: "Nevalidan odgovor servera." };
    } catch (err: any) {
      return { success: false, message: err.response?.data?.error || "Greška pri ažuriranju podataka." };
    }
  };

  return (
    <AuthContext.Provider value={{ user, login, register, logout, toggleFavorite, updateProfile, refreshMe }}>
      {children}
    </AuthContext.Provider>
  );
}
