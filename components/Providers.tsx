"use client";

import { MsalProvider } from "@azure/msal-react";
import { PublicClientApplication } from "@azure/msal-browser";
import { ReactNode, useEffect, useState } from "react";
import { msalConfig } from "@/lib/msalConfig";

const msalInstance = new PublicClientApplication(msalConfig);

export default function Providers({ children }: { children: ReactNode }) {
  const [initialized, setInitialized] = useState(false);

  useEffect(() => {
    msalInstance
      .initialize()
      .then(() => setInitialized(true))
      .catch((err) => {
        console.error("MSAL initialization error:", err);
        setInitialized(true); // still render so app doesn't hang
      });
  }, []);

  if (!initialized) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <div className="text-gray-600">Loading...</div>
      </div>
    );
  }

  return (
    <MsalProvider instance={msalInstance}>
      {children}
    </MsalProvider>
  );
}
