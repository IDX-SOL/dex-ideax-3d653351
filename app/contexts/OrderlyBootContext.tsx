import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { useLocation } from "react-router-dom";
import { isHomeRoute } from "@/utils/is-home-route";

type OrderlyBootContextValue = {
  isBooted: boolean;
};

const OrderlyBootContext = createContext<OrderlyBootContextValue | null>(null);

export function OrderlyBootProvider({ children }: { children: ReactNode }) {
  const { pathname } = useLocation();
  const onHome = isHomeRoute(pathname);
  const [everBooted, setEverBooted] = useState(() => !onHome);

  useEffect(() => {
    if (!onHome) {
      setEverBooted(true);
    }
  }, [onHome]);

  // Boot synchronously when leaving `/` — useEffect alone lets Scaffold mount too early.
  const isBooted = !onHome || everBooted;

  const value = useMemo(() => ({ isBooted }), [isBooted]);

  return (
    <OrderlyBootContext.Provider value={value}>
      {children}
    </OrderlyBootContext.Provider>
  );
}

export function useOrderlyBoot() {
  const ctx = useContext(OrderlyBootContext);
  if (!ctx) {
    throw new Error("useOrderlyBoot must be used within OrderlyBootProvider");
  }
  return ctx;
}
