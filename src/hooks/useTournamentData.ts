import { useEffect, useMemo, useState } from 'react';
import { Match, Team, Tournament } from '../types/models';
import { subscribeMatches, subscribeTeams, subscribeTournaments } from '../firebase/repositories';
import { useTournamentSelection } from '../context/TournamentSelectionContext';

export function useTournamentData() {
  const [tournaments, setTournaments] = useState<Tournament[]>([]);
  const [teams, setTeams] = useState<Team[]>([]);
  const [matches, setMatches] = useState<Match[]>([]);
  const [hasLoadedTournaments, setHasLoadedTournaments] = useState(false);
  // どの大会のチーム・試合を読み込み済みか（undefined=未読み込み・null=大会なし）。
  // 真偽値フラグだと「大会未確定→大会確定」の切り替わりで古い「読み込み済み」が一瞬残り、
  // 試合一覧から渡された試合IDが「読み込み完了なのに見つからない」と誤判定されて捨てられる
  const [teamsLoadedFor, setTeamsLoadedFor] = useState<string | null | undefined>(undefined);
  const [matchesLoadedFor, setMatchesLoadedFor] = useState<string | null | undefined>(undefined);
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
      setTeamsLoadedFor(null);
      setMatchesLoadedFor(null);
      return;
    }

    const unsubTeams = subscribeTeams(tournamentId, (items) => {
      setTeams(items);
      setTeamsLoadedFor(tournamentId);
    });
    const unsubMatches = subscribeMatches(tournamentId, (items) => {
      setMatches(items);
      setMatchesLoadedFor(tournamentId);
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
  const currentTournamentId = currentTournament?.id ?? null;
  const isInitialLoading =
    !hasLoadedTournaments ||
    waitingForInitialSelection ||
    teamsLoadedFor !== currentTournamentId ||
    matchesLoadedFor !== currentTournamentId;

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
