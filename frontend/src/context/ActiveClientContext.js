import React, { createContext, useContext, useState, useCallback, useMemo } from 'react';

// Tracks which client's QMS forms an admin/auditor/reviewer currently has open, so
// the sidebar (Layout.js) can tailor the QMS Forms nav to that specific Client ID:
// only the primary (smallest) Client ID for a company gets the full Initial Audit
// list and plain "Surveillance - 1/2" labels — every other Client ID for the same
// company hides the Initial-Audit-only forms and gets its own numbered Surveillance
// cycle ("Surveillance - 1-2", "Surveillance - 1-3", …) per clientRank.
const ActiveClientContext = createContext(null);

export const ActiveClientProvider = ({ children }) => {
  const [activeClient, setActiveClient] = useState(null); // { clientId, company, isPrimaryClientId, clientRank } | null

  const clearActiveClient = useCallback(() => setActiveClient(null), []);

  const value = useMemo(
    () => ({ activeClient, setActiveClient, clearActiveClient }),
    [activeClient, clearActiveClient]
  );

  return (
    <ActiveClientContext.Provider value={value}>
      {children}
    </ActiveClientContext.Provider>
  );
};

export const useActiveClient = () => useContext(ActiveClientContext);
