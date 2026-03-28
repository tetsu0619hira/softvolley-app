import { useEffect, useMemo, useRef, useState } from 'react';
import {
  Alert,
  Keyboard,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { onAuthStateChanged, User } from 'firebase/auth';
import AnimatedPressable from '../components/AnimatedPressable';
import ScreenContainer from '../components/ScreenContainer';
import TournamentSelector from '../components/TournamentSelector';
import { auth } from '../firebase/config';
import { detectOutcome, validateTwoSetScores } from '../utils/scoreValidation';
import { useTournamentData } from '../hooks/useTournamentData';
import { submitMatchResult } from '../firebase/repositories';

export default function MatchResultInputScreen() {
  const {
    tournaments,
    selectedTournamentId,
    setSelectedTournamentId,
    currentTournament,
    matches,
    teamNameMap,
  } = useTournamentData();
  const [user, setUser] = useState<User | null>(null);
  const [matchId, setMatchId] = useState('');
  const [set1Home, setSet1Home] = useState('');
  const [set1Away, setSet1Away] = useState('');
  const [set2Home, setSet2Home] = useState('');
  const [set2Away, setSet2Away] = useState('');
  const set1HomeRef = useRef<TextInput | null>(null);
  const set1AwayRef = useRef<TextInput | null>(null);
  const set2HomeRef = useRef<TextInput | null>(null);
  const set2AwayRef = useRef<TextInput | null>(null);

  useEffect(() => {
    if (!auth) return;
    const unsub = onAuthStateChanged(auth, (value) => setUser(value));
    return () => unsub();
  }, []);

  const canViewCompleted = Boolean(user);
  const hasTournament = Boolean(currentTournament);
  const visibleMatches = useMemo(
    () =>
      hasTournament
        ? canViewCompleted
          ? matches
          : matches.filter((item) => item.status !== 'completed')
        : [],
    [canViewCompleted, hasTournament, matches],
  );

  const selectedMatch = useMemo(
    () => visibleMatches.find((item) => item.id === matchId) ?? null,
    [visibleMatches, matchId],
  );

  useEffect(() => {
    if (!matchId) return;
    const isStillExists = visibleMatches.some((item) => item.id === matchId);
    if (!isStillExists) {
      setMatchId('');
    }
  }, [matchId, visibleMatches]);

  useEffect(() => {
    if (!selectedMatch) return;
    if (selectedMatch.setScores.length === 2) {
      setSet1Home(String(selectedMatch.setScores[0].home));
      setSet1Away(String(selectedMatch.setScores[0].away));
      setSet2Home(String(selectedMatch.setScores[1].home));
      setSet2Away(String(selectedMatch.setScores[1].away));
      return;
    }
    setSet1Home('');
    setSet1Away('');
    setSet2Home('');
    setSet2Away('');
  }, [selectedMatch]);

  const setScores = useMemo(
    () => [
      { home: Number(set1Home || '0'), away: Number(set1Away || '0') },
      { home: Number(set2Home || '0'), away: Number(set2Away || '0') },
    ],
    [set1Home, set1Away, set2Home, set2Away],
  );

  const isValid = useMemo(() => validateTwoSetScores(setScores), [setScores]);
  const outcome = useMemo(() => detectOutcome(setScores), [setScores]);

  const handleSave = async () => {
    Keyboard.dismiss();
    set1HomeRef.current?.blur();
    set1AwayRef.current?.blur();
    set2HomeRef.current?.blur();
    set2AwayRef.current?.blur();

    if (!selectedMatch || !currentTournament) {
      Alert.alert('対象なし', '試合を選択してください。');
      return;
    }
    if (selectedMatch.status === 'completed' && !canViewCompleted) {
      Alert.alert('権限不足', '入力済み試合の閲覧・修正は管理者のみ可能です。');
      return;
    }
    if (!isValid) {
      Alert.alert('入力不正', 'セットスコアがルール違反です。');
      return;
    }

    try {
      await submitMatchResult(selectedMatch.id, setScores, currentTournament.pointRules);
      Alert.alert('保存完了', '試合結果を保存しました。');
    } catch (error) {
      Alert.alert('保存失敗', '試合結果の保存に失敗しました。');
    }
  };

  return (
    <ScreenContainer
      title="試合結果入力"
      subtitle="セットごとのスコア入力"
    >
      <TournamentSelector
        tournaments={tournaments}
        selectedTournamentId={selectedTournamentId}
        onSelect={setSelectedTournamentId}
      />

      {!hasTournament ? (
        <View style={styles.card}>
          <Text style={styles.item}>
            大会データがありません。管理者画面で大会を作成してから結果入力をご利用ください。
          </Text>
        </View>
      ) : null}

      {hasTournament ? (
        <>
          <View style={styles.card}>
            <Text style={styles.heading}>対象試合を選択</Text>
            {visibleMatches.map((match) => (
              <AnimatedPressable
                key={match.id}
                style={[styles.matchButton, match.id === matchId && styles.matchButtonSelected]}
                onPress={() => {
                  Keyboard.dismiss();
                  setMatchId(match.id);
                }}
              >
                <Text style={styles.item}>
                  {teamNameMap[match.homeTeamId] ?? '未設定'} vs {teamNameMap[match.awayTeamId] ?? '未設定'}
                </Text>
                <Text style={styles.subItem}>
                  {match.status === 'completed' ? '入力済み（再入力で上書き）' : '未入力'}
                </Text>
              </AnimatedPressable>
            ))}
            {visibleMatches.length === 0 ? (
              <Text style={styles.item}>試合がありません。</Text>
            ) : null}
          </View>

          <View style={styles.card}>
            <Text style={styles.heading}>スコア入力</Text>
            <View style={styles.row}>
              <Text style={styles.item}>1セット目</Text>
              <ScoreInput inputRef={set1HomeRef} value={set1Home} onChange={setSet1Home} />
              <Text style={styles.item}>:</Text>
              <ScoreInput inputRef={set1AwayRef} value={set1Away} onChange={setSet1Away} />
            </View>
            <View style={styles.row}>
              <Text style={styles.item}>2セット目</Text>
              <ScoreInput inputRef={set2HomeRef} value={set2Home} onChange={setSet2Home} />
              <Text style={styles.item}>:</Text>
              <ScoreInput inputRef={set2AwayRef} value={set2Away} onChange={setSet2Away} />
            </View>
            <Text style={styles.item}>- 15点先取、デュース時は17点上限</Text>
            <Text style={styles.item}>- 2セット固定（フルセットなし）</Text>
            <Text style={styles.item}>
              - 入力済み試合の閲覧・上書き修正は管理者ログイン時のみ可能
            </Text>
            <Text style={styles.item}>- 判定結果: {isValid ? `有効 (${outcome})` : '無効'}</Text>
            <AnimatedPressable style={styles.button} onPress={handleSave}>
              <Text style={styles.buttonText}>結果を保存</Text>
            </AnimatedPressable>
          </View>
        </>
      ) : null}
    </ScreenContainer>
  );
}

function ScoreInput({
  inputRef,
  value,
  onChange,
}: {
  inputRef: React.RefObject<TextInput | null>;
  value: string;
  onChange: (text: string) => void;
}) {
  return (
    <TextInput
      ref={inputRef}
      value={value}
      onChangeText={onChange}
      keyboardType="numeric"
      placeholder="-"
      style={styles.scoreInput}
    />
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    gap: 8,
  },
  heading: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1a202c',
  },
  item: {
    fontSize: 14,
    color: '#2d3748',
  },
  subItem: {
    fontSize: 12,
    color: '#4a5568',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  scoreInput: {
    width: 56,
    borderWidth: 1,
    borderColor: '#cbd5e0',
    borderRadius: 8,
    textAlign: 'center',
    paddingVertical: 6,
    backgroundColor: '#fff',
  },
  matchButton: {
    borderWidth: 1,
    borderColor: '#cbd5e0',
    borderRadius: 8,
    padding: 10,
    backgroundColor: '#fff',
  },
  matchButtonSelected: {
    borderColor: '#1155cc',
    backgroundColor: '#e6efff',
  },
  button: {
    marginTop: 6,
    backgroundColor: '#1155cc',
    borderRadius: 8,
    paddingVertical: 10,
    alignItems: 'center',
  },
  buttonText: {
    color: '#fff',
    fontWeight: '700',
  },
});
