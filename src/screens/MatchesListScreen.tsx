import { StyleSheet, Text, View } from 'react-native';
import ScreenContainer from '../components/ScreenContainer';
import TournamentSelector from '../components/TournamentSelector';
import { useTournamentData } from '../hooks/useTournamentData';

export default function MatchesListScreen() {
  const {
    tournaments,
    selectedTournamentId,
    setSelectedTournamentId,
    currentTournament,
    matches,
    teamNameMap,
  } = useTournamentData();

  return (
    <ScreenContainer
      title="試合一覧"
      subtitle="大会全体の試合と結果"
    >
      <TournamentSelector
        tournaments={tournaments}
        selectedTournamentId={selectedTournamentId}
        onSelect={setSelectedTournamentId}
      />

      <View style={styles.compactCard}>
        <Text style={styles.compactHeading}>
          大会: {currentTournament ? currentTournament.name : '未作成'}
        </Text>
        <Text style={styles.compactItem}>試合数: {matches.length}</Text>
      </View>

      <View style={styles.tableCard}>
        <View style={[styles.tableRow, styles.headerRow]}>
          <Text style={[styles.colTeams, styles.headerText]}>対戦カード</Text>
          <Text style={[styles.colSets, styles.headerText]}>セット</Text>
          <Text style={[styles.colResult, styles.headerText]}>結果</Text>
          <Text style={[styles.colPoints, styles.headerText]}>勝ち点</Text>
        </View>
        {matches.map((match) => (
          <View key={match.id} style={styles.tableRow}>
            <Text style={styles.colTeams}>
              {teamNameMap[match.homeTeamId] ?? '未設定'} vs {teamNameMap[match.awayTeamId] ?? '未設定'}
            </Text>
            <Text style={styles.colSets}>
              {match.status === 'completed'
                ? `${match.setScores[0]?.home}-${match.setScores[0]?.away} / ${match.setScores[1]?.home}-${match.setScores[1]?.away}`
                : '-'}
            </Text>
            <Text style={styles.colResult}>{match.status === 'completed' ? match.outcome : '-'}</Text>
            <Text style={styles.colPoints}>
              {match.status === 'completed' ? `${match.points.home}-${match.points.away}` : '-'}
            </Text>
          </View>
        ))}
        {matches.length === 0 ? (
          <View style={styles.tableRow}>
            <Text style={styles.emptyText}>試合がありません。</Text>
          </View>
        ) : null}
      </View>
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
  colTeams: {
    flex: 1,
    fontSize: 12,
    color: '#2d3748',
  },
  colSets: {
    width: 90,
    fontSize: 12,
    textAlign: 'center',
    color: '#2d3748',
  },
  colResult: {
    width: 44,
    fontSize: 12,
    textAlign: 'center',
    color: '#2d3748',
  },
  colPoints: {
    width: 52,
    fontSize: 12,
    textAlign: 'right',
    color: '#2d3748',
  },
  emptyText: {
    flex: 1,
    fontSize: 12,
    textAlign: 'center',
    color: '#2d3748',
  },
});
