import { createContext, ReactNode, useContext, useMemo, useState } from 'react';

interface TournamentSelectionContextValue {
  selectedTournamentId: string | null;
  setSelectedTournamentId: (id: string | null) => void;
}

const TournamentSelectionContext = createContext<TournamentSelectionContextValue | undefined>(
  undefined,
);

export function TournamentSelectionProvider({ children }: { children: ReactNode }) {
  const [selectedTournamentId, setSelectedTournamentId] = useState<string | null>(null);

  const value = useMemo(
    () => ({
      selectedTournamentId,
      setSelectedTournamentId,
    }),
    [selectedTournamentId],
  );

  return (
    <TournamentSelectionContext.Provider value={value}>
      {children}
    </TournamentSelectionContext.Provider>
  );
}

export function useTournamentSelection() {
  const context = useContext(TournamentSelectionContext);
  if (!context) {
    throw new Error('useTournamentSelection must be used within TournamentSelectionProvider');
  }
  return context;
}
