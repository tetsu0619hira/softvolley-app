import { StyleSheet, Text, View } from 'react-native';
import MatchupLabel from '../components/MatchupLabel';
import ScreenContainer from '../components/ScreenContainer';
import TournamentSelector from '../components/TournamentSelector';
import { useDelayedLoading } from '../hooks/useDelayedLoading';
import { useTournamentData } from '../hooks/useTournamentData';

export default function MatchesListScreen() {
  const {
    tournaments,
    selectedTournamentId,
    setSelectedTournamentId,
    currentTournament,
    matches,
    teamNameMap,
    isInitialLoading,
  } = useTournamentData();
  const showLoadingText = useDelayedLoading(isInitialLoading);

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

      <View style={styles.tableCardShadow}>
        <View style={styles.tableCard}>
        <View style={[styles.tableRow, styles.headerRow]}>
          <Text style={[styles.colTeams, styles.headerCell, styles.headerText]}>対戦カード</Text>
          <Text style={[styles.colSets, styles.headerCell, styles.headerText]}>セット</Text>
        </View>
        {matches.map((match) => (
          <View key={match.id} style={[styles.tableRow, styles.bodyRow]}>
            <View style={styles.colTeams}>
              <MatchupLabel
                home={teamNameMap[match.homeTeamId] ?? '未設定'}
                away={teamNameMap[match.awayTeamId] ?? '未設定'}
                textStyle={styles.teamNameText}
              />
            </View>
            <Text style={styles.colSets}>
              {match.status === 'completed'
                ? `${match.setScores[0]?.home}-${match.setScores[0]?.away} / ${match.setScores[1]?.home}-${match.setScores[1]?.away}`
                : '-'}
            </Text>
          </View>
        ))}
        {showLoadingText ? (
          <View style={[styles.tableRow, styles.bodyRow]}>
            <Text style={styles.emptyText}>データを読み込み中です...</Text>
          </View>
        ) : null}
        {!isInitialLoading && matches.length === 0 ? (
          <View style={[styles.tableRow, styles.bodyRow]}>
            <Text style={styles.emptyText}>試合がありません。</Text>
          </View>
        ) : null}
        </View>
      </View>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  tableCardShadow: {
    backgroundColor: '#f6f9ff',
    borderRadius: 28,
    borderWidth: 1,
    borderTopColor: '#ffffff',
    borderLeftColor: '#ffffff',
    borderRightColor: '#d8e3f5',
    borderBottomWidth: 0,
    shadowColor: '#8ba4cc',
    shadowOffset: { width: 0, height: 14 },
    shadowOpacity: 0.34,
    shadowRadius: 20,
    elevation: 12,
  },
  tableCard: {
    borderRadius: 28,
    overflow: 'visible',
    backgroundColor: '#f6f9ff',
    paddingVertical: 6,
  },
  tableRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  bodyRow: {
    marginHorizontal: 8,
    marginBottom: 6,
    borderRadius: 16,
    borderWidth: 1,
    borderTopColor: '#ffffff',
    borderLeftColor: '#ffffff',
    borderRightColor: '#d9e4f7',
    borderBottomColor: '#d9e4f7',
    backgroundColor: '#f2f7ff',
    shadowColor: '#9eb5d9',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.2,
    shadowRadius: 10,
    elevation: 6,
  },
  headerRow: {
    backgroundColor: 'transparent',
    gap: 6,
    marginHorizontal: 8,
    marginBottom: 6,
  },
  headerText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#3f5b8b',
    textAlign: 'center',
  },
  headerCell: {
    borderWidth: 1,
    borderTopColor: '#ffffff',
    borderLeftColor: '#ffffff',
    borderRightColor: '#d9e4f7',
    borderBottomColor: '#d9e4f7',
    backgroundColor: '#f2f7ff',
    borderRadius: 12,
    paddingVertical: 4,
    shadowColor: '#9eb5d9',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.2,
    shadowRadius: 10,
    elevation: 5,
  },
  colTeams: {
    flex: 1,
    paddingRight: 2,
  },
  teamNameText: {
    fontSize: 14,
    color: '#465777',
  },
  colSets: {
    width: 120,
    fontSize: 14,
    textAlign: 'center',
    color: '#465777',
  },
  emptyText: {
    flex: 1,
    fontSize: 14,
    textAlign: 'center',
    color: '#5a6c90',
  },
});
