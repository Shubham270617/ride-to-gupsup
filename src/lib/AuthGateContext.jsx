import { createContext, useCallback, useContext, useMemo, useState } from "react";

const AuthGateContext = createContext({ signal: 0, initialMode: "login", requestLogin: () => {} });

export function AuthGateProvider({ children }) {
  const [signal, setSignal] = useState(0);
  const [initialMode, setInitialMode] = useState("login");

  const requestLogin = useCallback((mode = "login") => {
    setInitialMode(mode);
    setSignal((s) => s + 1);
  }, []);

  const value = useMemo(() => ({ signal, initialMode, requestLogin }), [signal, initialMode, requestLogin]);

  return <AuthGateContext.Provider value={value}>{children}</AuthGateContext.Provider>;
}

export function useAuthGate() {
  return useContext(AuthGateContext);
}
