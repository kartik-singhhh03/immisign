"use client"

import React, { createContext, useContext, ReactNode } from "react"
import { useParams, useRouter } from "next/navigation"
import { useAuthStore } from "@/features/auth/store/authStore"

interface AgencyContextType {
  agencyId: string;
  agencySlug: string;
}

const AgencyContext = createContext<AgencyContextType | undefined>(undefined);

export function TenantProvider({ children }: { children: ReactNode }) {
  const params = useParams();
  const router = useRouter();
  const { activeWorkspace } = useAuthStore();

  const agencySlug = params?.agency as string;
  
  if (!agencySlug || !activeWorkspace) {
    return null; // or a loading spinner
  }

  // Safety boundary: if the URL slug doesn't match the active workspace in store, redirect or block
  if (agencySlug !== activeWorkspace.slug) {
    router.push('/unauthorized');
    return null;
  }

  return (
    <AgencyContext.Provider value={{ agencyId: activeWorkspace.id, agencySlug }}>
      {children}
    </AgencyContext.Provider>
  );
}

export function getCurrentAgency(): AgencyContextType | undefined {
  const context = useContext(AgencyContext);
  return context;
}

export function requireCurrentAgency(): AgencyContextType {
  const context = useContext(AgencyContext);
  if (context === undefined) {
    throw new Error("requireCurrentAgency must be used within a TenantProvider");
  }
  return context;
}
