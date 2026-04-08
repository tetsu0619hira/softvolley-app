import { useMemo } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import ScreenContainer from '../components/ScreenContainer';
import TournamentSelector from '../components/TournamentSelector';
import { useDelayedLoading } from '../hooks/useDelayedLoading';
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
  const showLoadingText = useDelayedLoading(isInitialLoading);

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

    >
      <TournamentSelector
        tournaments={tournaments}
        selectedTournamentId={selectedTournamentId}
        onSelect={setSelectedTournamentId}
      />
      <View style={styles.compactCard}>
        <Text style={styles.compactHeading}>勝ち点ルール</Text>
        <View style={styles.ruleWrap}>
          <View style={styles.rulePill}>
            <Text style={styles.rulePillKey}>2-0勝ち</Text>
            <Text style={styles.rulePillValue}>{currentTournament?.pointRules.straightWin ?? '-'}点</Text>
          </View>
          <View style={styles.rulePill}>
            <Text style={styles.rulePillKey}>1-1（得点多い）</Text>
            <Text style={styles.rulePillValue}>{currentTournament?.pointRules.drawHigherScore ?? '-'}点</Text>
          </View>
          <View style={styles.rulePill}>
            <Text style={styles.rulePillKey}>1-1（得点少ない）</Text>
            <Text style={styles.rulePillValue}>{currentTournament?.pointRules.drawLowerScore ?? '-'}点</Text>
          </View>
          <View style={styles.rulePill}>
            <Text style={styles.rulePillKey}>1-1（得点同じ）</Text>
            <Text style={styles.rulePillValue}>{currentTournament?.pointRules.drawEqualScore ?? '-'}点</Text>
          </View>
          <View style={styles.rulePill}>
            <Text style={styles.rulePillKey}>0-2負け</Text>
            <Text style={styles.rulePillValue}>0点</Text>
          </View>
        </View>
      </View>

      <View style={styles.tableCardShadow}>
        <View style={styles.tableCard}>
        <View style={[styles.tableRow, styles.headerRow]}>
          <Text style={[styles.colRank, styles.headerCell, styles.headerCellPrimary, styles.headerText, styles.headerTextPrimary]}>
            順位
          </Text>
          <Text style={[styles.colTeam, styles.headerCell, styles.headerTeamCell, styles.headerCellPrimary, styles.headerText, styles.headerTextPrimary]}>
            チーム名
          </Text>
          <Text style={[styles.colNum, styles.headerCell, styles.headerCellSecondary, styles.headerText, styles.headerTextSecondary]}>
            勝ち点
          </Text>
          <Text style={[styles.colNum, styles.headerCell, styles.headerCellSecondary, styles.headerText, styles.headerTextSecondary]}>
            総得点
          </Text>
          <Text style={[styles.colNum, styles.headerCell, styles.headerCellSecondary, styles.headerText, styles.headerTextSecondary]}>
            総失点
          </Text>
        </View>
        {(() => {
          return rankedStandings.map((row, index) => {
            const rankNumber = row.rank === 0 ? rankedStandings[index - 1].rank : row.rank;
            const isTie = tieRankSet.has(rankNumber);
            return (
              <View
                key={row.teamId}
                style={[styles.tableRow, styles.bodyRow]}
              >
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
          });
        })()}
        {showLoadingText ? (
          <View style={[styles.tableRow, styles.bodyRow]}>
            <Text style={styles.emptyText}>データを読み込み中です...</Text>
          </View>
        ) : null}
        {!isInitialLoading && standings.length === 0 ? (
          <View style={[styles.tableRow, styles.bodyRow]}>
            <Text style={styles.emptyText}>大会・チーム登録後に順位表が表示されます。</Text>
          </View>
        ) : null}
        </View>
      </View>

      <Text style={styles.footnote}>
        同点時は得失点差、さらに同点なら総得点で並び替えます。同値（勝ち点/総得点/総失点が同じ）の場合は同順位で黄色表示になります。
      </Text>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  compactCard: {
    backgroundColor: '#f6f9ff',
    borderRadius: 28,
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderWidth: 1,
    borderTopColor: '#ffffff',
    borderLeftColor: '#ffffff',
    borderRightColor: '#cedcf1',
    borderBottomColor: '#cedcf1',
    gap: 4,
    shadowColor: '#8ba4cc',
    shadowOffset: { width: 0, height: 14 },
    shadowOpacity: 0.3,
    shadowRadius: 20,
    elevation: 10,
  },
  compactHeading: {
    fontSize: 13,
    fontWeight: '600',
    color: '#24324b',
  },
  ruleWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  rulePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderRadius: 12,
    backgroundColor: '#f6f9ff',
    borderWidth: 1,
    borderTopColor: '#ffffff',
    borderLeftColor: '#ffffff',
    borderRightColor: '#d9e4f7',
    borderBottomColor: '#d9e4f7',
  },
  rulePillKey: {
    fontSize: 10,
    color: '#415a85',
  },
  rulePillValue: {
    fontSize: 10,
    fontWeight: '700',
    color: '#2f4f82',
  },
  tableCardShadow: {
    backgroundColor: '#f6f9ff',
    borderRadius: 28,
    borderWidth: 1,
    borderTopColor: '#ffffff',
    borderLeftColor: '#ffffff',
    borderRightColor: '#cedcf1',
    borderBottomWidth: 0,
    shadowColor: '#8ba4cc',
    shadowOffset: { width: 0, height: 14 },
    shadowOpacity: 0.3,
    shadowRadius: 20,
    elevation: 10,
  },
  tableCard: {
    borderRadius: 28,
    overflow: 'visible',
    backgroundColor: '#f6f9ff',
    paddingTop: 4,
    paddingBottom: 6,
  },
  tableRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 9,
  },
  bodyRow: {
    marginHorizontal: 12,
    marginBottom: 4,
    borderRadius: 16,
    borderWidth: 1,
    borderTopColor: '#ffffff',
    borderLeftColor: '#ffffff',
    borderRightColor: '#cfdcf0',
    borderBottomColor: '#cfdcf0',
    backgroundColor: '#f6f9ff',
    shadowColor: '#9eb5d9',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.18,
    shadowRadius: 10,
    elevation: 5,
  },
  headerRow: {
    backgroundColor: 'transparent',
    gap: 6,
    marginHorizontal: 12,
    marginBottom: 4,
  },
  headerText: {
    fontSize: 12,
    fontWeight: '700',
    lineHeight: 16,
    color: '#3f5b8b',
    textAlign: 'center',
  },
  headerCell: {
    borderWidth: 1,
    borderTopColor: '#ffffff',
    borderLeftColor: '#ffffff',
    borderRightColor: '#cfdcf0',
    borderBottomColor: '#cfdcf0',
    backgroundColor: '#f6f9ff',
    borderRadius: 12,
    height: 26,
    paddingTop: 4,
    paddingBottom: 4,
    shadowColor: '#9eb5d9',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.17,
    shadowRadius: 10,
    elevation: 4,
  },
  headerCellPrimary: {
    backgroundColor: '#e2eeff',
    borderRightColor: '#c6d9f7',
    borderBottomColor: '#c6d9f7',
  },
  headerCellSecondary: {
    backgroundColor: '#fff2e6',
    borderRightColor: '#f0d4b8',
    borderBottomColor: '#f0d4b8',
  },
  headerTeamCell: {
    textAlign: 'left',
    paddingLeft: 0,
  },
  headerTextPrimary: {
    color: '#2b5fa5',
  },
  headerTextSecondary: {
    color: '#9a5b2a',
  },
  colRank: {
    width: 36,
    fontSize: 12,
    color: '#465777',
  },
  rankBadge: {
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
    backgroundColor: '#d6e5fb',
  },
  rankBadgeTie: {
    backgroundColor: '#ffe89a',
  },
  rankBadgeText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#465777',
  },
  rankBadgeTextTie: {
    color: '#8a5a1f',
  },
  colTeam: {
    flex: 1,
    fontSize: 12,
    color: '#465777',
  },
  colNum: {
    width: 52,
    textAlign: 'right',
    fontSize: 12,
    color: '#465777',
  },
  emptyText: {
    flex: 1,
    fontSize: 12,
    textAlign: 'center',
    color: '#5a6c90',
  },
  footnote: {
    fontSize: 11,
    color: '#6b7a99',
    paddingHorizontal: 8,
  },
});
