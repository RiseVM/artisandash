import { ReactNode } from "react";
import { PortalAuthContext, usePortalAuthState } from "./hooks";

export function PortalAuthProvider({ children }: { children: ReactNode }) {
  const auth = usePortalAuthState();

  return (
    <PortalAuthContext.Provider value={auth}>
      {children}
    </PortalAuthContext.Provider>
  );
}
