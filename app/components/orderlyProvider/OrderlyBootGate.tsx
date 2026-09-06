import type { ReactNode } from "react";
import { useOrderlyBoot } from "@/contexts/OrderlyBootContext";
import OrderlyProvider from "@/components/orderlyProvider";

/** Orderly + wallet mount only off marketing home (or after first navigation away from `/`). */
export function OrderlyBootGate({ children }: { children: ReactNode }) {
  const { isBooted } = useOrderlyBoot();

  if (!isBooted) {
    return children;
  }

  return <OrderlyProvider>{children}</OrderlyProvider>;
}
