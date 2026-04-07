import { useEffect, useMemo, useState } from 'react';
import { Match, Team, Tournament } from '../types/models';
import { subscribeMatches, subscribeTeams, subscribeTournaments } from '../firebase/repositories';
import { useTournamentSelection } from '../context/TournamentSelectionContext';

export function useTournamentData() {
  const [tournaments, setTournaments] = useState<Tournament[]>([]);
  const [teams, setTeams] = useState<Team[]>([]);
  const [matches, setMatches] = useState<Match[]>([]);
  const [hasLoadedTournaments, setHasLoadedTournaments] = useState(false);
  const [hasLoadedTeams, setHasLoadedTeams] = useState(false);
  const [hasLoadedMatches, setHasLoadedMatches] = useState(false);
  const { selectedTournamentId, setSelectedTournamentId } = useTournamentSelection();

  useEffect(() => {
    setHasLoadedTournaments(false);
    const unsub = subscribeTournaments((items) => {
      setTournaments(items);
      setHasLoadedTournaments(true);
    });
    return () => unsub();
  }, []);

  useEffect(() => {
    if (tournaments.length === 0) {
      return;
    }

    const selectedExists = tournaments.some((item) => item.id === selectedTournamentId);
    if (!selectedTournamentId || !selectedExists) {
      setSelectedTournamentId(tournaments[0].id);
    }
  }, [selectedTournamentId, setSelectedTournamentId, tournaments]);

  const currentTournament = useMemo(() => {
    if (!selectedTournamentId) return null;
    return tournaments.find((item) => item.id === selectedTournamentId) ?? null;
  }, [selectedTournamentId, tournaments]);

  useEffect(() => {
    const tournamentId = currentTournament?.id ?? null;

    if (!tournamentId) {
      setTeams([]);
      setMatches([]);
      setHasLoadedTeams(true);
      setHasLoadedMatches(true);
      return;
    }

    setHasLoadedTeams(false);
    setHasLoadedMatches(false);
    const unsubTeams = subscribeTeams(tournamentId, (items) => {
      setTeams(items);
      setHasLoadedTeams(true);
    });
    const unsubMatches = subscribeMatches(tournamentId, (items) => {
      setMatches(items);
      setHasLoadedMatches(true);
    });

    return () => {
      unsubTeams();
      unsubMatches();
    };
  }, [currentTournament?.id]);

  const teamNameMap = useMemo(() => {
    return teams.reduce<Record<string, string>>((acc, team) => {
      acc[team.id] = team.name;
      return acc;
    }, {});
  }, [teams]);

  const hasSelectedTournament = useMemo(
    () => tournaments.some((item) => item.id === selectedTournamentId),
    [selectedTournamentId, tournaments],
  );
  const waitingForInitialSelection =
    hasLoadedTournaments && tournaments.length > 0 && !hasSelectedTournament;
  const isInitialLoading =
    !hasLoadedTournaments || waitingForInitialSelection || !hasLoadedTeams || !hasLoadedMatches;

  return {
    tournaments,
    selectedTournamentId,
    setSelectedTournamentId,
    currentTournament,
    teams,
    matches,
    teamNameMap,
    isInitialLoading,
  };
}
