import { useEffect, useMemo, useRef, useState } from 'react';
import {
  Alert,
  Keyboard,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { onAuthStateChanged, User } from 'firebase/auth';
import { MaterialIcons } from '@expo/vector-icons';
import AnimatedPressable from '../components/AnimatedPressable';
import MatchupLabel from '../components/MatchupLabel';
import ScreenContainer from '../components/ScreenContainer';
import TournamentSelector from '../components/TournamentSelector';
import { auth } from '../firebase/config';
import { useDelayedLoading } from '../hooks/useDelayedLoading';
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
    isInitialLoading,
  } = useTournamentData();
  const [user, setUser] = useState<User | null>(null);
  const [authResolved, setAuthResolved] = useState(!auth);
  const [matchId, setMatchId] = useState('');
  const [set1Home, setSet1Home] = useState('');
  const [set1Away, setSet1Away] = useState('');
  const [set2Home, setSet2Home] = useState('');
  const [set2Away, setSet2Away] = useState('');
  const [showMatchPicker, setShowMatchPicker] = useState(false);
  const set1HomeRef = useRef<TextInput | null>(null);
  const set1AwayRef = useRef<TextInput | null>(null);
  const set2HomeRef = useRef<TextInput | null>(null);
  const set2AwayRef = useRef<TextInput | null>(null);

  useEffect(() => {
    if (!auth) return;
    const unsub = onAuthStateChanged(auth, (value) => {
      setUser(value);
      setAuthResolved(true);
    });
    return () => unsub();
  }, []);

  const isScreenLoading = isInitialLoading || !authResolved;
  const showLoadingText = useDelayedLoading(isScreenLoading);
  const canViewCompleted = Boolean(user);
  const hasTournament = Boolean(currentTournament);
  const visibleMatches = useMemo(
    () =>
      hasTournament && !isScreenLoading
        ? canViewCompleted
          ? matches
          : matches.filter((item) => item.status !== 'completed')
        : [],
    [canViewCompleted, hasTournament, isScreenLoading, matches],
  );

  const selectedMatch = useMemo(
    () => visibleMatches.find((item) => item.id === matchId) ?? null,
    [visibleMatches, matchId],
  );
  const selectorSubText = useMemo(() => {
    if (!selectedMatch) {
      return `${visibleMatches.length} 試合から選択（タップして選択）`;
    }
    if (selectedMatch.status === 'completed') {
      return '入力済み（再入力で上書き）';
    }
    return '';
  }, [selectedMatch, visibleMatches.length]);

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
    >
      <TournamentSelector
        tournaments={tournaments}
        selectedTournamentId={selectedTournamentId}
        onSelect={setSelectedTournamentId}
      />

      {!isScreenLoading && !hasTournament ? (
        <View style={styles.card}>
          <Text style={styles.item}>
            大会データがありません。管理者画面で大会を作成してから結果入力をご利用ください。
          </Text>
        </View>
      ) : null}

      {isScreenLoading && showLoadingText ? (
        <View style={styles.card}>
          <Text style={styles.item}>データを読み込み中です...</Text>
        </View>
      ) : null}

      {!isScreenLoading && hasTournament ? (
        <>
          <View style={styles.card}>
            <Text style={styles.heading}>対象試合を選択</Text>
            <AnimatedPressable
              style={styles.selectorTrigger}
              onPress={() => {
                Keyboard.dismiss();
                setShowMatchPicker(true);
              }}
            >
              <View style={styles.selectorContent}>
                <View style={styles.selectorTextWrap}>
                  {selectedMatch ? (
                    <MatchupLabel
                      home={teamNameMap[selectedMatch.homeTeamId] ?? '未設定'}
                      away={teamNameMap[selectedMatch.awayTeamId] ?? '未設定'}
                      textStyle={styles.item}
                    />
                  ) : (
                    <Text style={styles.item}>試合を選択してください</Text>
                  )}
                </View>
                <MaterialIcons name="keyboard-arrow-down" size={22} color="#4a5568" />
              </View>
            </AnimatedPressable>
            {selectorSubText ? <Text style={styles.subItem}>{selectorSubText}</Text> : null}
            {visibleMatches.length === 0 ? <Text style={styles.item}>試合がありません。</Text> : null}
          </View>

          <View style={styles.card}>
            <Text style={styles.heading}>スコア入力</Text>
            <View style={styles.row}>
              <Text style={styles.setLabel}>1セット目</Text>
              <ScoreInput inputRef={set1HomeRef} value={set1Home} onChange={setSet1Home} />
              <Text style={styles.colon}>:</Text>
              <ScoreInput inputRef={set1AwayRef} value={set1Away} onChange={setSet1Away} />
            </View>
            <View style={styles.row}>
              <Text style={styles.setLabel}>2セット目</Text>
              <ScoreInput inputRef={set2HomeRef} value={set2Home} onChange={setSet2Home} />
              <Text style={styles.colon}>:</Text>
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

      <Modal
        visible={showMatchPicker}
        transparent
        animationType="fade"
        onRequestClose={() => setShowMatchPicker(false)}
      >
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <Text style={styles.heading}>試合を選択</Text>
            <View style={styles.modalDivider} />
            <ScrollView
              style={styles.modalList}
              contentContainerStyle={styles.modalListContent}
              showsVerticalScrollIndicator
              indicatorStyle="black"
              persistentScrollbar
            >
              {visibleMatches.map((match) => (
                <AnimatedPressable
                  key={match.id}
                  style={[
                    styles.selectorTrigger,
                    styles.modalSelectorItem,
                    match.id === matchId && styles.modalItemSelected,
                  ]}
                  onPress={() => {
                    setMatchId(match.id);
                    setShowMatchPicker(false);
                  }}
                >
                  <View style={styles.selectorContent}>
                    <View style={styles.selectorTextWrap}>
                      <MatchupLabel
                        home={teamNameMap[match.homeTeamId] ?? '未設定'}
                        away={teamNameMap[match.awayTeamId] ?? '未設定'}
                        textStyle={styles.modalMatchText}
                      />
                    </View>
                  </View>
                </AnimatedPressable>
              ))}
            </ScrollView>
            <AnimatedPressable style={[styles.button, styles.closeButton]} onPress={() => setShowMatchPicker(false)}>
              <Text style={styles.buttonText}>閉じる</Text>
            </AnimatedPressable>
          </View>
        </View>
      </Modal>
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
    backgroundColor: '#f6f9ff',
    borderRadius: 28,
    padding: 20,
    borderWidth: 1,
    borderTopColor: '#ffffff',
    borderLeftColor: '#ffffff',
    borderRightColor: '#d8e3f5',
    borderBottomColor: '#d8e3f5',
    gap: 12,
    shadowColor: '#8ba4cc',
    shadowOffset: { width: 0, height: 14 },
    shadowOpacity: 0.26,
    shadowRadius: 20,
    elevation: 10,
  },
  heading: {
    fontSize: 16,
    fontWeight: '700',
    color: '#24324b',
  },
  item: {
    fontSize: 14,
    color: '#465777',
  },
  subItem: {
    fontSize: 12,
    color: '#6b7a99',
    minHeight: 16,
    lineHeight: 16,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  setLabel: {
    width: 64,
    fontSize: 14,
    color: '#465777',
  },
  colon: {
    width: 10,
    textAlign: 'center',
    fontSize: 14,
    color: '#465777',
  },
  scoreInput: {
    width: 56,
    borderWidth: 1,
    borderTopColor: '#ffffff',
    borderLeftColor: '#ffffff',
    borderRightColor: '#d9e4f7',
    borderBottomColor: '#d9e4f7',
    borderRadius: 24,
    textAlign: 'center',
    paddingVertical: 11,
    backgroundColor: '#f6f9ff',
    color: '#24324b',
    shadowColor: '#9eb5d9',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.2,
    shadowRadius: 14,
    elevation: 8,
  },
  selectorTrigger: {
    borderWidth: 1,
    borderTopColor: '#ffffff',
    borderLeftColor: '#ffffff',
    borderRightColor: '#d9e4f7',
    borderBottomColor: '#d9e4f7',
    borderRadius: 24,
    minHeight: 50,
    paddingHorizontal: 16,
    justifyContent: 'center',
    backgroundColor: '#f6f9ff',
    shadowColor: '#9eb5d9',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.2,
    shadowRadius: 14,
    elevation: 8,
  },
  modalSelectorItem: {
    minHeight: 48,
    borderRadius: 20,
    paddingHorizontal: 14,
    backgroundColor: '#f6f9ff',
    borderTopColor: '#ffffff',
    borderLeftColor: '#ffffff',
    borderRightColor: '#c7d7ef',
    borderBottomColor: '#c7d7ef',
    shadowOpacity: 0,
    elevation: 0,
  },
  selectorContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  selectorTextWrap: {
    flex: 1,
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(170, 195, 220, 0.92)',
    justifyContent: 'center',
    padding: 16,
  },
  modalCard: {
    backgroundColor: '#dde8f6',
    borderRadius: 28,
    padding: 18,
    maxHeight: '70%',
    gap: 12,
    borderWidth: 1,
    borderTopColor: '#ffffff',
    borderLeftColor: '#ffffff',
    borderRightColor: '#c8d6ed',
    borderBottomColor: '#c8d6ed',
    shadowColor: '#8ba4cc',
    shadowOffset: { width: 0, height: 16 },
    shadowOpacity: 0.32,
    shadowRadius: 22,
    elevation: 13,
  },
  modalDivider: {
    height: 1,
    marginTop: -2,
    backgroundColor: '#e3ebf8',
  },
  modalList: {
    maxHeight: 360,
    backgroundColor: 'transparent',
  },
  modalListContent: {
    gap: 6,
    paddingVertical: 2,
  },
  modalItemSelected: {
    borderTopColor: '#f4f9ff',
    borderLeftColor: '#f4f9ff',
    borderRightColor: '#8fb2e6',
    borderBottomColor: '#8fb2e6',
    backgroundColor: '#dfeeff',
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  },
  modalMatchText: {
    fontSize: 14,
    color: '#2f486f',
    fontWeight: '600',
  },
  button: {
    marginTop: 8,
    backgroundColor: '#5a9ef2',
    borderRadius: 24,
    paddingVertical: 13,
    alignItems: 'center',
    shadowColor: '#2f7fe6',
    shadowOffset: { width: 0, height: 9 },
    shadowOpacity: 0.24,
    shadowRadius: 14,
    elevation: 8,
  },
  buttonText: {
    color: '#fff',
    fontWeight: '700',
  },
  closeButton: {
    backgroundColor: '#6b7a99',
  },
});
