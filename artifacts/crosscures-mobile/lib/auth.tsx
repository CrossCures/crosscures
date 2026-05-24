import AsyncStorage from "@react-native-async-storage/async-storage";
import { useRouter } from "expo-router";
import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import { authApi, setAuthTokenGetter, setUnauthorizedHandler } from "@/lib/api";

export interface User {
  id: string;
  email: string;
  full_name: string;
  role: "patient" | "physician";
  specialty?: string;
}

interface AuthState {
  user: User | null;
  token: string | null;
  hydrated: boolean;
  signIn: (email: string, password: string) => Promise<User>;
  register: (data: {
    email: string;
    password: string;
    full_name: string;
    role: "patient" | "physician";
    date_of_birth?: string;
    npi_number?: string;
    specialty?: string;
  }) => Promise<User>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthState | null>(null);

const TOKEN_KEY = "crosscures_token";
const USER_KEY = "crosscures_user";

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [hydrated, setHydrated] = useState(false);
  const router = useRouter();
  const tokenRef = useRef<string | null>(null);

  useEffect(() => {
    tokenRef.current = token;
  }, [token]);

  useEffect(() => {
    setAuthTokenGetter(() => tokenRef.current);
    setUnauthorizedHandler(() => {
      tokenRef.current = null;
      setToken(null);
      setUser(null);
      AsyncStorage.multiRemove([TOKEN_KEY, USER_KEY]).catch(() => {});
      router.replace("/(auth)/login");
    });
  }, [router]);

  useEffect(() => {
    (async () => {
      try {
        const [[, t], [, u]] = await AsyncStorage.multiGet([TOKEN_KEY, USER_KEY]);
        if (t && u) {
          setToken(t);
          setUser(JSON.parse(u));
        }
      } catch {}
      setHydrated(true);
    })();
  }, []);

  const persist = useCallback(async (u: User, t: string) => {
    await AsyncStorage.multiSet([
      [TOKEN_KEY, t],
      [USER_KEY, JSON.stringify(u)],
    ]);
  }, []);

  const signIn = useCallback(
    async (email: string, password: string) => {
      const res: any = await authApi.login({ email, password });
      const u: User = res.user;
      const t: string = res.access_token;
      tokenRef.current = t;
      setToken(t);
      setUser(u);
      await persist(u, t);
      return u;
    },
    [persist]
  );

  const register = useCallback(
    async (data: any) => {
      const res: any = await authApi.register(data);
      const u: User = res.user;
      const t: string = res.access_token;
      tokenRef.current = t;
      setToken(t);
      setUser(u);
      await persist(u, t);
      return u;
    },
    [persist]
  );

  const signOut = useCallback(async () => {
    tokenRef.current = null;
    setToken(null);
    setUser(null);
    await AsyncStorage.multiRemove([TOKEN_KEY, USER_KEY]);
    router.replace("/(auth)/login");
  }, [router]);

  const value = useMemo<AuthState>(
    () => ({ user, token, hydrated, signIn, register, signOut }),
    [user, token, hydrated, signIn, register, signOut]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthState {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
