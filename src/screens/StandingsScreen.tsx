import { useMemo } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import ScreenContainer from '../components/ScreenContainer';
import TournamentSelector from '../components/TournamentSelector';
import { useTournamentData } from '../hooks/useTournamentData';

export default function StandingsScreen() {
  const {
    tournaments,
    selectedTournamentId,
    setSelectedTournamentId,
    currentTournament,
    teams,
    matches,
    isInitialLoading,
  } = useTournamentData();

  const standings = useMemo(() => {
    const table = teams.map((team) => ({
      teamId: team.id,
      teamName: team.name,
      points: 0,
      scored: 0,
      conceded: 0,
    }));

    const byId = table.reduce<Record<string, (typeof table)[number]>>((acc, item) => {
      acc[item.teamId] = item;
      return acc;
    }, {});

    matches.forEach((match) => {
      if (match.status !== 'completed') return;
      const home = byId[match.homeTeamId];
      const away = byId[match.awayTeamId];
      if (!home || !away) return;

      home.points += match.points.home;
      away.points += match.points.away;
      home.scored += match.totalScore.home;
      home.conceded += match.totalScore.away;
      away.scored += match.totalScore.away;
      away.conceded += match.totalScore.home;
    });

    return table.sort((a, b) => {
      if (b.points !== a.points) return b.points - a.points;
      const diffA = a.scored - a.conceded;
      const diffB = b.scored - b.conceded;
      if (diffB !== diffA) return diffB - diffA;
      return b.scored - a.scored;
    });
  }, [teams, matches]);

  const rankedStandings = useMemo(() => {
    return standings.map((row, index) => {
      const prev = standings[index - 1];
      const isSameAsPrev =
        !!prev &&
        prev.points === row.points &&
        prev.scored === row.scored &&
        prev.conceded === row.conceded;

      const rank = isSameAsPrev ? 0 : index + 1;
      return { ...row, rank };
    });
  }, [standings]);

  const tieRankSet = useMemo(() => {
    const count = new Map<number, number>();
    rankedStandings.forEach((row, index) => {
      const rankNumber = row.rank === 0 ? rankedStandings[index - 1].rank : row.rank;
      count.set(rankNumber, (count.get(rankNumber) ?? 0) + 1);
    });
    return new Set(Array.from(count.entries()).filter(([, c]) => c > 1).map(([r]) => r));
  }, [rankedStandings]);

  return (
    <ScreenContainer
      title="順位表"
      subtitle={`勝ち点合計でソート（大会: ${isInitialLoading ? '読み込み中...' : currentTournament?.name ?? '未作成'}）`}
    >
      <TournamentSelector
        tournaments={tournaments}
        selectedTournamentId={selectedTournamentId}
        onSelect={setSelectedTournamentId}
      />
      <View style={styles.compactCard}>
        <Text style={styles.compactHeading}>勝ち点ルール</Text>
        <Text style={styles.compactItem}>2-0勝ち {currentTournament?.pointRules.straightWin ?? '-'}点</Text>
        <Text style={styles.compactItem}>
          1-1（得点多い） {currentTournament?.pointRules.drawHigherScore ?? '-'}点
        </Text>
        <Text style={styles.compactItem}>
          1-1（得点少ない） {currentTournament?.pointRules.drawLowerScore ?? '-'}点
        </Text>
        <Text style={styles.compactItem}>0-2負け 0点</Text>
        <Text style={styles.compactItem}>
          1-1（得点同じ） {currentTournament?.pointRules.drawEqualScore ?? '-'}点
        </Text>
      </View>

      <View style={styles.tableCard}>
        <View style={[styles.tableRow, styles.headerRow]}>
          <Text style={[styles.colRank, styles.headerText]}>順位</Text>
          <Text style={[styles.colTeam, styles.headerText]}>チーム名</Text>
          <Text style={[styles.colNum, styles.headerText]}>勝ち点</Text>
          <Text style={[styles.colNum, styles.headerText]}>総得点</Text>
          <Text style={[styles.colNum, styles.headerText]}>総失点</Text>
        </View>
        {rankedStandings.map((row, index) => {
          const rankNumber = row.rank === 0 ? rankedStandings[index - 1].rank : row.rank;
          const isTie = tieRankSet.has(rankNumber);
          return (
          <View key={row.teamId} style={styles.tableRow}>
            <View style={[styles.rankBadge, isTie && styles.rankBadgeTie]}>
              <Text style={[styles.rankBadgeText, isTie && styles.rankBadgeTextTie]}>
                {rankNumber}
              </Text>
            </View>
            <Text style={styles.colTeam}>{row.teamName}</Text>
            <Text style={styles.colNum}>{row.points}</Text>
            <Text style={styles.colNum}>{row.scored}</Text>
            <Text style={styles.colNum}>{row.conceded}</Text>
          </View>
          );
        })}
        {isInitialLoading ? (
          <View style={styles.tableRow}>
            <Text style={styles.emptyText}>データを読み込み中です...</Text>
          </View>
        ) : null}
        {!isInitialLoading && standings.length === 0 ? (
          <View style={styles.tableRow}>
            <Text style={styles.emptyText}>大会・チーム登録後に順位表が表示されます。</Text>
          </View>
        ) : null}
      </View>

      <Text style={styles.footnote}>
        同点時は得失点差、さらに同点なら総得点で並び替えます。同値（勝ち点/総得点/総失点が同じ）の場合は同順位で黄色表示になります。
      </Text>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  compactCard: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    gap: 4,
  },
  compactHeading: {
    fontSize: 13,
    fontWeight: '600',
    color: '#1a202c',
  },
  compactItem: {
    fontSize: 12,
    color: '#2d3748',
  },
  tableCard: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    overflow: 'hidden',
  },
  tableRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#edf2f7',
  },
  headerRow: {
    backgroundColor: '#f8fafc',
  },
  headerText: {
    fontSize: 11,
    fontWeight: '500',
    color: '#4a5568',
  },
  colRank: {
    width: 36,
    fontSize: 12,
    color: '#2d3748',
  },
  rankBadge: {
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
    backgroundColor: '#edf2f7',
  },
  rankBadgeTie: {
    backgroundColor: '#fef08a',
  },
  rankBadgeText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#2d3748',
  },
  rankBadgeTextTie: {
    color: '#744210',
  },
  colTeam: {
    flex: 1,
    fontSize: 12,
    color: '#2d3748',
  },
  colNum: {
    width: 52,
    textAlign: 'right',
    fontSize: 12,
    color: '#2d3748',
  },
  emptyText: {
    flex: 1,
    fontSize: 12,
    textAlign: 'center',
    color: '#2d3748',
  },
  footnote: {
    fontSize: 11,
    color: '#4a5568',
    paddingHorizontal: 4,
  },
});
