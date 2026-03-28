import { useEffect, useMemo, useState } from 'react';
import { Match, Team, Tournament } from '../types/models';
import { subscribeMatches, subscribeTeams, subscribeTournaments } from '../firebase/repositories';
import { useTournamentSelection } from '../context/TournamentSelectionContext';

export function useTournamentData() {
  const [tournaments, setTournaments] = useState<Tournament[]>([]);
  const [teams, setTeams] = useState<Team[]>([]);
  const [matches, setMatches] = useState<Match[]>([]);
  const { selectedTournamentId, setSelectedTournamentId } = useTournamentSelection();

  useEffect(() => {
    const unsub = subscribeTournaments(setTournaments);
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
    const unsubTeams = subscribeTeams(currentTournament?.id ?? null, setTeams);
    const unsubMatches = subscribeMatches(currentTournament?.id ?? null, setMatches);

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

  return {
    tournaments,
    selectedTournamentId,
    setSelectedTournamentId,
    currentTournament,
    teams,
    matches,
    teamNameMap,
  };
}
