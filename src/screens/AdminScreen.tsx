import { useMemo, useState } from 'react';
import {
  Alert,
  Keyboard,
  LayoutAnimation,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  UIManager,
  View,
} from 'react-native';
import DateTimePicker, {
  DateTimePickerEvent,
} from '@react-native-community/datetimepicker';
import {
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signOut,
  User,
} from 'firebase/auth';
import { useEffect } from 'react';
import ScreenContainer from '../components/ScreenContainer';
import AnimatedPressable from '../components/AnimatedPressable';
import TournamentSelector from '../components/TournamentSelector';
import { DEFAULT_POINT_RULES, normalizePointRules } from '../constants/defaultRules';
import { auth, firebaseConfigReady } from '../firebase/config';
import {
  createMatch,
  createTeam,
  createTournament,
  deleteMatch,
  deleteTeam,
  deleteTournament,
  updateTournamentPointRules,
} from '../firebase/repositories';
import { useTournamentData } from '../hooks/useTournamentData';
import { PointRules } from '../types/models';

export default function AdminScreen() {
  const firebaseReady = useMemo(() => firebaseConfigReady, []);
  const {
    tournaments,
    selectedTournamentId,
    setSelectedTournamentId,
    currentTournament,
    teams,
    matches,
    teamNameMap,
  } = useTournamentData();
  const [user, setUser] = useState<User | null>(null);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [tournamentName, setTournamentName] = useState('');
  const [tournamentDate, setTournamentDate] = useState('');
  const [tournamentDateValue, setTournamentDateValue] = useState<Date>(new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [teamName, setTeamName] = useState('');
  const [homeTeamId, setHomeTeamId] = useState('');
  const [awayTeamId, setAwayTeamId] = useState('');
  const [saving, setSaving] = useState(false);
  const [sectionOpen, setSectionOpen] = useState({
    connection: false,
    session: false,
    tournament: false,
    rules: false,
    teams: false,
    matches: false,
  });

  useEffect(() => {
    if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
      UIManager.setLayoutAnimationEnabledExperimental(true);
    }
  }, []);

  const [rules, setRules] = useState<PointRules>(
    normalizePointRules(currentTournament?.pointRules ?? { ...DEFAULT_POINT_RULES }),
  );

  useEffect(() => {
    if (!auth) return;
    const unsub = onAuthStateChanged(auth, (value) => setUser(value));
    return () => unsub();
  }, []);

  useEffect(() => {
    if (currentTournament) {
      setRules(normalizePointRules(currentTournament.pointRules));
    }
  }, [currentTournament]);

  const handleAdminLogin = async () => {
    Keyboard.dismiss();
    if (!auth) {
      Alert.alert('未設定', 'Firebase設定が不足しています。');
      return;
    }
    if (!email.trim() || !password.trim()) {
      Alert.alert('入力不足', 'メールアドレスとパスワードを入力してください。');
      return;
    }

    try {
      setSaving(true);
      await signInWithEmailAndPassword(auth, email.trim(), password);
      Alert.alert('ログイン成功', '管理者モードを有効化しました。');
    } catch (error) {
      Alert.alert('ログイン失敗', '認証情報を確認してください。');
    } finally {
      setSaving(false);
    }
  };

  const handleCreateTournament = async () => {
    Keyboard.dismiss();
    if (!tournamentName.trim() || !tournamentDate.trim()) {
      Alert.alert('入力不足', '大会名と日付を入力してください。');
      return;
    }

    try {
      setSaving(true);
      const createdTournamentId = await createTournament(
        tournamentName.trim(),
        tournamentDate.trim(),
      );
      setSelectedTournamentId(createdTournamentId);
      setTournamentName('');
      setTournamentDate('');
      Alert.alert('保存完了', '大会を登録しました。');
    } catch (error) {
      Alert.alert(
        '保存失敗',
        error instanceof Error ? error.message : '大会の登録に失敗しました。',
      );
    } finally {
      setSaving(false);
    }
  };

  const handleDateChange = (event: DateTimePickerEvent, selectedDate?: Date) => {
    if (Platform.OS === 'android') {
      setShowDatePicker(false);
    }
    if (event.type === 'dismissed' || !selectedDate) {
      return;
    }
    setTournamentDateValue(selectedDate);
    setTournamentDate(formatDate(selectedDate));
  };

  const handleUpdateRules = async () => {
    Keyboard.dismiss();
    if (!currentTournament) {
      Alert.alert('対象なし', '先に大会を作成してください。');
      return;
    }

    try {
      setSaving(true);
      await updateTournamentPointRules(currentTournament.id, {
        ...rules,
        straightLoss: DEFAULT_POINT_RULES.straightLoss,
      });
      Alert.alert('更新完了', '勝ち点ルールを更新しました。');
    } catch (error) {
      Alert.alert(
        '更新失敗',
        error instanceof Error ? error.message : '勝ち点ルールの更新に失敗しました。',
      );
    } finally {
      setSaving(false);
    }
  };

  const handleCreateTeam = async () => {
    Keyboard.dismiss();
    if (!currentTournament) {
      Alert.alert('対象なし', '先に大会を作成してください。');
      return;
    }
    if (!teamName.trim()) {
      Alert.alert('入力不足', 'チーム名を入力してください。');
      return;
    }

    try {
      setSaving(true);
      await createTeam(currentTournament.id, teamName.trim());
      setTeamName('');
      Alert.alert('保存完了', 'チームを登録しました。');
    } catch (error) {
      Alert.alert(
        '保存失敗',
        error instanceof Error ? error.message : 'チーム登録に失敗しました。',
      );
    } finally {
      setSaving(false);
    }
  };

  const handleCreateMatch = async () => {
    Keyboard.dismiss();
    if (!currentTournament) {
      Alert.alert('対象なし', '先に大会を作成してください。');
      return;
    }
    if (!homeTeamId || !awayTeamId || homeTeamId === awayTeamId) {
      Alert.alert('入力不足', '異なる2チームを選択してください。');
      return;
    }

    try {
      setSaving(true);
      await createMatch(currentTournament.id, homeTeamId, awayTeamId);
      Alert.alert('保存完了', '対戦カードを作成しました。');
    } catch (error) {
      Alert.alert(
        '保存失敗',
        error instanceof Error ? error.message : '対戦カード作成に失敗しました。',
      );
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteTeam = async (teamId: string, teamName: string) => {
    if (!currentTournament) return;
    Keyboard.dismiss();
    Alert.alert(
      'チーム削除確認',
      `${teamName} を削除します。関連する対戦カードも削除されます。`,
      [
        { text: 'キャンセル', style: 'cancel' },
        {
          text: '削除',
          style: 'destructive',
          onPress: async () => {
            try {
              setSaving(true);
              await deleteTeam(teamId, currentTournament.id);
              if (homeTeamId === teamId) setHomeTeamId('');
              if (awayTeamId === teamId) setAwayTeamId('');
              Alert.alert('削除完了', 'チームを削除しました。');
            } catch (error) {
              Alert.alert(
                '削除失敗',
                error instanceof Error ? error.message : 'チーム削除に失敗しました。',
              );
            } finally {
              setSaving(false);
            }
          },
        },
      ],
    );
  };

  const handleDeleteMatch = async (matchId: string) => {
    Keyboard.dismiss();
    Alert.alert('対戦カード削除確認', 'この対戦カードを削除します。', [
      { text: 'キャンセル', style: 'cancel' },
      {
        text: '削除',
        style: 'destructive',
        onPress: async () => {
          try {
            setSaving(true);
            await deleteMatch(matchId);
            Alert.alert('削除完了', '対戦カードを削除しました。');
          } catch (error) {
            Alert.alert(
              '削除失敗',
              error instanceof Error ? error.message : '対戦カード削除に失敗しました。',
            );
          } finally {
            setSaving(false);
          }
        },
      },
    ]);
  };

  const handleDeleteTournament = async () => {
    if (!currentTournament) {
      Alert.alert('対象なし', '削除対象の大会がありません。');
      return;
    }

    Keyboard.dismiss();
    Alert.alert(
      '大会削除確認',
      `「${currentTournament.name}」を削除します。\nこの大会のチーム・対戦カード・結果もすべて削除されます。`,
      [
        { text: 'キャンセル', style: 'cancel' },
        {
          text: '削除',
          style: 'destructive',
          onPress: async () => {
            try {
              setSaving(true);
              const deletingTournamentId = currentTournament.id;
              await deleteTournament(deletingTournamentId);
              if (selectedTournamentId === deletingTournamentId) {
                setSelectedTournamentId(null);
              }
              setHomeTeamId('');
              setAwayTeamId('');
              Alert.alert('削除完了', '大会と関連データを削除しました。');
            } catch (error) {
              Alert.alert(
                '削除失敗',
                error instanceof Error ? error.message : '大会削除に失敗しました。',
              );
            } finally {
              setSaving(false);
            }
          },
        },
      ],
    );
  };

  const toggleSection = (key: keyof typeof sectionOpen) => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setSectionOpen((prev) => ({
      ...prev,
      [key]: !prev[key],
    }));
  };

  return (
    <ScreenContainer
      title="管理者"
      subtitle="管理者ログイン後に大会・チーム・勝ち点ルールを編集"
    >
      {!user ? (
        <View style={styles.card}>
          <Text style={styles.heading}>管理者ログイン</Text>
          <TextInput
            value={email}
            onChangeText={setEmail}
            style={styles.input}
            autoCapitalize="none"
            placeholder="メールアドレス"
            keyboardType="email-address"
          />
          <TextInput
            value={password}
            onChangeText={setPassword}
            style={styles.input}
            secureTextEntry
            placeholder="パスワード"
          />
          <AnimatedPressable style={styles.button} onPress={handleAdminLogin} disabled={saving}>
            <Text style={styles.buttonText}>ログイン</Text>
          </AnimatedPressable>
        </View>
      ) : (
        <>
          <TournamentSelector
            tournaments={tournaments}
            selectedTournamentId={selectedTournamentId}
            onSelect={setSelectedTournamentId}
          />

          <View style={styles.card}>
            <AnimatedPressable
              style={styles.toggleHeader}
              onPress={() => toggleSection('connection')}
            >
              <Text style={styles.heading}>接続状態</Text>
              <Text style={styles.toggleIcon}>{sectionOpen.connection ? '▲' : '▼'}</Text>
            </AnimatedPressable>
            {sectionOpen.connection ? (
              <>
                <Text style={styles.status}>
                  Firebase接続: {firebaseReady ? '利用可能（設定済み）' : '利用不可（設定未完了）'}
                </Text>
                <Text style={styles.item}>
                  選択中の大会: {currentTournament ? currentTournament.name : '未作成'}
                </Text>
                <Text style={styles.item}>
                  ※ 利用不可の場合は `.env` の Firebase 設定を確認してください
                </Text>
              </>
            ) : null}
          </View>

          <View style={styles.card}>
            <AnimatedPressable style={styles.toggleHeader} onPress={() => toggleSection('session')}>
              <Text style={styles.heading}>ログイン情報</Text>
              <Text style={styles.toggleIcon}>{sectionOpen.session ? '▲' : '▼'}</Text>
            </AnimatedPressable>
            {sectionOpen.session ? (
              <>
                <Text style={styles.item}>ログイン中: {user.email}</Text>
                <AnimatedPressable
                  style={[styles.button, styles.secondaryButton]}
                  onPress={() => {
                    Keyboard.dismiss();
                    if (auth) signOut(auth);
                  }}
                >
                  <Text style={styles.buttonText}>ログアウト</Text>
                </AnimatedPressable>
              </>
            ) : null}
          </View>

          <View style={styles.card}>
            <AnimatedPressable
              style={styles.toggleHeader}
              onPress={() => toggleSection('tournament')}
            >
              <Text style={styles.heading}>大会登録</Text>
              <Text style={styles.toggleIcon}>{sectionOpen.tournament ? '▲' : '▼'}</Text>
            </AnimatedPressable>
            {sectionOpen.tournament ? (
              <>
                <TextInput
                  value={tournamentName}
                  onChangeText={setTournamentName}
                  style={styles.input}
                  placeholder="大会名"
                />
                <Pressable
                  style={styles.input}
                  onPress={() => {
                    Keyboard.dismiss();
                    setShowDatePicker(true);
                  }}
                >
                  <Text style={tournamentDate ? styles.inputText : styles.placeholderText}>
                    {tournamentDate || '日付をカレンダーから選択'}
                  </Text>
                </Pressable>
                {showDatePicker ? (
                  <DateTimePicker
                    value={tournamentDateValue}
                    mode="date"
                    display={Platform.OS === 'ios' ? 'inline' : 'default'}
                    locale="ja-JP"
                    onChange={handleDateChange}
                  />
                ) : null}
                <AnimatedPressable
                  style={styles.button}
                  onPress={handleCreateTournament}
                  disabled={saving}
                >
                  <Text style={styles.buttonText}>大会を保存</Text>
                </AnimatedPressable>
                <AnimatedPressable
                  style={[styles.button, styles.dangerButton]}
                  onPress={handleDeleteTournament}
                  disabled={saving || !currentTournament}
                >
                  <Text style={styles.buttonText}>選択中の大会を削除</Text>
                </AnimatedPressable>
              </>
            ) : null}
          </View>

          <View style={styles.card}>
            <AnimatedPressable style={styles.toggleHeader} onPress={() => toggleSection('rules')}>
              <Text style={styles.heading}>勝ち点ルール設定</Text>
              <Text style={styles.toggleIcon}>{sectionOpen.rules ? '▲' : '▼'}</Text>
            </AnimatedPressable>
            {sectionOpen.rules ? (
              <>
                <RuleInput
                  label="2-0勝ち"
                  value={rules.straightWin}
                  onChange={(value) => setRules((prev) => ({ ...prev, straightWin: value }))}
                />
                <RuleInput
                  label="1-1（得点多い）"
                  value={rules.drawHigherScore}
                  onChange={(value) => setRules((prev) => ({ ...prev, drawHigherScore: value }))}
                />
                <RuleInput
                  label="1-1（得点少ない）"
                  value={rules.drawLowerScore}
                  onChange={(value) => setRules((prev) => ({ ...prev, drawLowerScore: value }))}
                />
                <RuleInput
                  label="1-1（得点同じ）"
                  value={rules.drawEqualScore}
                  onChange={(value) => setRules((prev) => ({ ...prev, drawEqualScore: value }))}
                />
                <AnimatedPressable style={styles.button} onPress={handleUpdateRules} disabled={saving}>
                  <Text style={styles.buttonText}>ルールを保存</Text>
                </AnimatedPressable>
              </>
            ) : null}
          </View>

          <View style={styles.card}>
            <AnimatedPressable style={styles.toggleHeader} onPress={() => toggleSection('teams')}>
              <Text style={styles.heading}>チーム登録</Text>
              <Text style={styles.toggleIcon}>{sectionOpen.teams ? '▲' : '▼'}</Text>
            </AnimatedPressable>
            {sectionOpen.teams ? (
              <>
                <TextInput
                  value={teamName}
                  onChangeText={setTeamName}
                  style={styles.input}
                  placeholder="チーム名"
                />
                <AnimatedPressable style={styles.button} onPress={handleCreateTeam} disabled={saving}>
                  <Text style={styles.buttonText}>チームを保存</Text>
                </AnimatedPressable>
                {teams.map((team) => (
                  <View key={team.id} style={styles.rowBetween}>
                    <Text style={styles.item}>- {team.name}</Text>
                    <AnimatedPressable
                      style={styles.deleteButton}
                      onPress={() => handleDeleteTeam(team.id, team.name)}
                      disabled={saving}
                    >
                      <Text style={styles.deleteButtonText}>削除</Text>
                    </AnimatedPressable>
                  </View>
                ))}
              </>
            ) : null}
          </View>

          <View style={styles.card}>
            <AnimatedPressable style={styles.toggleHeader} onPress={() => toggleSection('matches')}>
              <Text style={styles.heading}>対戦カード作成</Text>
              <Text style={styles.toggleIcon}>{sectionOpen.matches ? '▲' : '▼'}</Text>
            </AnimatedPressable>
            {sectionOpen.matches ? (
              <>
                <Text style={styles.item}>ホームチーム</Text>
                <View style={styles.teamWrap}>
                  {teams.map((team) => (
                    <TeamButton
                      key={`home-${team.id}`}
                      selected={homeTeamId === team.id}
                      onPress={() => {
                        Keyboard.dismiss();
                        setHomeTeamId(team.id);
                      }}
                      label={team.name}
                    />
                  ))}
                </View>
                <Text style={styles.item}>アウェイチーム</Text>
                <View style={styles.teamWrap}>
                  {teams.map((team) => (
                    <TeamButton
                      key={`away-${team.id}`}
                      selected={awayTeamId === team.id}
                      onPress={() => {
                        Keyboard.dismiss();
                        setAwayTeamId(team.id);
                      }}
                      label={team.name}
                    />
                  ))}
                </View>
                <AnimatedPressable style={styles.button} onPress={handleCreateMatch} disabled={saving}>
                  <Text style={styles.buttonText}>対戦カードを保存</Text>
                </AnimatedPressable>
                {matches.map((match) => (
                  <View key={match.id} style={styles.rowBetween}>
                    <Text style={styles.rowText} numberOfLines={1} ellipsizeMode="tail">
                      {teamNameMap[match.homeTeamId] ?? '未設定'} vs{' '}
                      {teamNameMap[match.awayTeamId] ?? '未設定'}
                    </Text>
                    <AnimatedPressable
                      style={styles.deleteButton}
                      onPress={() => handleDeleteMatch(match.id)}
                      disabled={saving}
                    >
                      <Text style={styles.deleteButtonText}>削除</Text>
                    </AnimatedPressable>
                  </View>
                ))}
              </>
            ) : null}
          </View>
        </>
      )}
    </ScreenContainer>
  );
}

function RuleInput({
  label,
  value,
  onChange,
}: {
  label: string;
  value: number;
  onChange: (value: number) => void;
}) {
  return (
    <View style={styles.ruleRow}>
      <Text style={styles.ruleLabel}>{label}</Text>
      <TextInput
        value={String(value)}
        onChangeText={(text) => onChange(Number(text || '0'))}
        keyboardType="numeric"
        style={styles.ruleInput}
      />
    </View>
  );
}

function TeamButton({
  selected,
  onPress,
  label,
}: {
  selected: boolean;
  onPress: () => void;
  label: string;
}) {
  return (
    <AnimatedPressable
      style={[styles.teamButton, selected && styles.teamSelected]}
      onPress={() => {
        Keyboard.dismiss();
        onPress();
      }}
    >
      <Text style={styles.teamButtonText}>{label}</Text>
    </AnimatedPressable>
  );
}

function formatDate(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
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
  status: {
    fontSize: 13,
    color: '#1155cc',
    marginTop: 4,
  },
  input: {
    borderWidth: 1,
    borderColor: '#cbd5e0',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 8,
    backgroundColor: '#fff',
    justifyContent: 'center',
  },
  inputText: {
    fontSize: 14,
    color: '#1a202c',
  },
  placeholderText: {
    fontSize: 14,
    color: '#718096',
  },
  button: {
    marginTop: 4,
    backgroundColor: '#1155cc',
    borderRadius: 8,
    paddingVertical: 10,
    alignItems: 'center',
  },
  secondaryButton: {
    backgroundColor: '#4a5568',
  },
  dangerButton: {
    backgroundColor: '#c53030',
  },
  buttonText: {
    color: '#fff',
    fontWeight: '700',
  },
  ruleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
  },
  ruleLabel: {
    flex: 1,
    fontSize: 14,
    color: '#2d3748',
  },
  ruleInput: {
    width: 80,
    borderWidth: 1,
    borderColor: '#cbd5e0',
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 6,
    textAlign: 'center',
    backgroundColor: '#fff',
  },
  teamWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  teamButton: {
    borderWidth: 1,
    borderColor: '#cbd5e0',
    borderRadius: 20,
    paddingHorizontal: 10,
    paddingVertical: 6,
    backgroundColor: '#fff',
  },
  teamSelected: {
    borderColor: '#1155cc',
    backgroundColor: '#e6efff',
  },
  teamButtonText: {
    color: '#2d3748',
    fontSize: 13,
  },
  rowBetween: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  rowText: {
    flex: 1,
    fontSize: 14,
    color: '#2d3748',
  },
  deleteButton: {
    flexShrink: 0,
    borderWidth: 1,
    borderColor: '#f56565',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 5,
    backgroundColor: '#fff5f5',
  },
  deleteButtonText: {
    color: '#c53030',
    fontSize: 12,
    fontWeight: '700',
  },
  toggleHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  toggleIcon: {
    fontSize: 12,
    color: '#4a5568',
  },
});
