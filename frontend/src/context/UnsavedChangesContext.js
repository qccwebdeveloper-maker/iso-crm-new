import React, { createContext, useContext, useRef } from 'react';

// Lets whichever QMS form page is currently open register "I have unsaved
// changes" + save/discard callbacks, and lets Layout.js (the one place that
// renders every sidebar nav link) check that before letting an in-app
// navigation proceed. A ref (not state) on purpose — the guard is written on
// every keystroke and only ever read at the moment of a nav click, so there's
// no need to re-render anything when it changes.
const UnsavedChangesContext = createContext(null);

export const UnsavedChangesProvider = ({ children }) => {
  const guardRef = useRef(null); // { isDirty, onSave, onDiscard } | null
  return (
    <UnsavedChangesContext.Provider value={guardRef}>
      {children}
    </UnsavedChangesContext.Provider>
  );
};

export const useUnsavedChangesGuard = () => useContext(UnsavedChangesContext);
