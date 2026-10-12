import { useMemo, useState } from "react";
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
} from "react-native";
import DateTimePicker, {
  DateTimePickerEvent,
} from "@react-native-community/datetimepicker";
import {
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signOut,
  User,
} from "firebase/auth";
import { useEffect } from "react";
import ScreenContainer from "../components/ScreenContainer";
import AnimatedPressable from "../components/AnimatedPressable";
import MatchupLabel from "../components/MatchupLabel";
import TournamentSelector from "../components/TournamentSelector";
import {
  DEFAULT_POINT_RULES,
  normalizePointRules,
} from "../constants/defaultRules";
import { auth, firebaseConfigReady } from "../firebase/config";
import {
  clearTournamentResults,
  createMatch,
  createTeam,
  createTournament,
  deleteMatch,
  deleteTeam,
  deleteTournament,
  replaceWithGeneratedMatches,
  updateTeamDrawNumbers,
  updateTournamentPointRules,
} from "../firebase/repositories";
import { useTournamentData } from "../hooks/useTournamentData";
import { PointRules } from "../types/models";
import {
  buildTriangleMatches,
  checkDrawAssignments,
  TRIANGLE_TEAM_COUNT,
} from "../utils/triangleSchedule";

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
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [tournamentName, setTournamentName] = useState("");
  const [tournamentDate, setTournamentDate] = useState("");
  const [tournamentDateValue, setTournamentDateValue] = useState<Date>(
    new Date(),
  );
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [teamName, setTeamName] = useState("");
  const [homeTeamId, setHomeTeamId] = useState("");
  const [awayTeamId, setAwayTeamId] = useState("");
  const [saving, setSaving] = useState(false);
  // くじ番号の入力欄（チームID → 入力文字列）。保存ボタンで一括保存する
  const [drawInputs, setDrawInputs] = useState<Record<string, string>>({});
  const [sectionOpen, setSectionOpen] = useState({
    connection: false,
    session: false,
    tournament: false,
    rules: false,
    teams: false,
    triangle: false,
    matches: false,
  });

  useEffect(() => {
    if (
      Platform.OS === "android" &&
      UIManager.setLayoutAnimationEnabledExperimental
    ) {
      UIManager.setLayoutAnimationEnabledExperimental(true);
    }
  }, []);

  const [rules, setRules] = useState<PointRules>(
    normalizePointRules(
      currentTournament?.pointRules ?? { ...DEFAULT_POINT_RULES },
    ),
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

  // 大会を切り替えたら入力欄を捨てる
  useEffect(() => {
    setDrawInputs({});
  }, [currentTournament?.id]);

  // 保存済みのくじ番号を入力欄に反映（編集中の欄は上書きしない）
  useEffect(() => {
    setDrawInputs((prev) => {
      const next: Record<string, string> = {};
      teams.forEach((team) => {
        next[team.id] = prev[team.id] ?? savedDrawText(team.drawNumber);
      });
      return next;
    });
  }, [teams]);

  const hasUnsavedDrawNumbers = teams.some(
    (team) =>
      normalizeDrawText(drawInputs[team.id]) !== savedDrawText(team.drawNumber),
  );

  const drawCheck = useMemo(() => checkDrawAssignments(teams), [teams]);
  const completedMatchCount = matches.filter(
    (match) => match.status === "completed",
  ).length;
  const canGenerateTriangle =
    drawCheck.canGenerate &&
    !hasUnsavedDrawNumbers &&
    completedMatchCount === 0;

  const handleAdminLogin = async () => {
    Keyboard.dismiss();
    if (!auth) {
      Alert.alert("未設定", "Firebase設定が不足しています。");
      return;
    }
    if (!email.trim() || !password.trim()) {
      Alert.alert("入力不足", "メールアドレスとパスワードを入力してください。");
      return;
    }

    try {
      setSaving(true);
      await signInWithEmailAndPassword(auth, email.trim(), password);
      Alert.alert("ログイン成功", "管理者モードを有効化しました。");
    } catch (error) {
      Alert.alert("ログイン失敗", "認証情報を確認してください。");
    } finally {
      setSaving(false);
    }
  };

  const handleCreateTournament = async () => {
    Keyboard.dismiss();
    if (!tournamentName.trim() || !tournamentDate.trim()) {
      Alert.alert("入力不足", "大会名と日付を入力してください。");
      return;
    }

    try {
      setSaving(true);
      const createdTournamentId = await createTournament(
        tournamentName.trim(),
        tournamentDate.trim(),
      );
      setSelectedTournamentId(createdTournamentId);
      setTournamentName("");
      setTournamentDate("");
      Alert.alert("保存完了", "大会を登録しました。");
    } catch (error) {
      Alert.alert(
        "保存失敗",
        error instanceof Error ? error.message : "大会の登録に失敗しました。",
      );
    } finally {
      setSaving(false);
    }
  };

  const handleDateChange = (
    event: DateTimePickerEvent,
    selectedDate?: Date,
  ) => {
    if (Platform.OS === "android") {
      setShowDatePicker(false);
    }
    if (event.type === "dismissed" || !selectedDate) {
      return;
    }
    setTournamentDateValue(selectedDate);
    setTournamentDate(formatDate(selectedDate));
  };

  const handleUpdateRules = async () => {
    Keyboard.dismiss();
    if (!currentTournament) {
      Alert.alert("対象なし", "先に大会を作成してください。");
      return;
    }

    try {
      setSaving(true);
      await updateTournamentPointRules(currentTournament.id, {
        ...rules,
        straightLoss: DEFAULT_POINT_RULES.straightLoss,
      });
      Alert.alert("更新完了", "勝ち点ルールを更新しました。");
    } catch (error) {
      Alert.alert(
        "更新失敗",
        error instanceof Error
          ? error.message
          : "勝ち点ルールの更新に失敗しました。",
      );
    } finally {
      setSaving(false);
    }
  };

  const handleCreateTeam = async () => {
    Keyboard.dismiss();
    if (!currentTournament) {
      Alert.alert("対象なし", "先に大会を作成してください。");
      return;
    }
    if (!teamName.trim()) {
      Alert.alert("入力不足", "チーム名を入力してください。");
      return;
    }

    try {
      setSaving(true);
      await createTeam(currentTournament.id, teamName.trim());
      setTeamName("");
      Alert.alert("保存完了", "チームを登録しました。");
    } catch (error) {
      Alert.alert(
        "保存失敗",
        error instanceof Error ? error.message : "チーム登録に失敗しました。",
      );
    } finally {
      setSaving(false);
    }
  };

  const handleCreateMatch = async () => {
    Keyboard.dismiss();
    if (!currentTournament) {
      Alert.alert("対象なし", "先に大会を作成してください。");
      return;
    }
    if (!homeTeamId || !awayTeamId || homeTeamId === awayTeamId) {
      Alert.alert("入力不足", "異なる2チームを選択してください。");
      return;
    }

    try {
      setSaving(true);
      await createMatch(currentTournament.id, homeTeamId, awayTeamId);
      Alert.alert("保存完了", "対戦カードを作成しました。");
    } catch (error) {
      Alert.alert(
        "保存失敗",
        error instanceof Error
          ? error.message
          : "対戦カード作成に失敗しました。",
      );
    } finally {
      setSaving(false);
    }
  };

  const handleSaveDrawNumbers = async () => {
    Keyboard.dismiss();
    if (!currentTournament) {
      Alert.alert("対象なし", "先に大会を作成してください。");
      return;
    }

    const updates: { teamId: string; drawNumber: number | null }[] = [];
    teams.forEach((team) => {
      const text = normalizeDrawText(drawInputs[team.id]);
      if (text === savedDrawText(team.drawNumber)) return;
      updates.push({
        teamId: team.id,
        drawNumber: text === "" ? null : Number(text),
      });
    });

    if (updates.length === 0) {
      Alert.alert("変更なし", "保存するくじ番号の変更はありません。");
      return;
    }

    try {
      setSaving(true);
      await updateTeamDrawNumbers(updates);
      Alert.alert("保存完了", `くじ番号を保存しました（${updates.length}件）。`);
    } catch (error) {
      Alert.alert(
        "保存失敗",
        error instanceof Error ? error.message : "くじ番号の保存に失敗しました。",
      );
    } finally {
      setSaving(false);
    }
  };

  const runGenerateTriangle = async (tournamentId: string) => {
    try {
      setSaving(true);
      const specs = buildTriangleMatches(teams);
      await replaceWithGeneratedMatches(tournamentId, specs);
      setHomeTeamId("");
      setAwayTeamId("");
      Alert.alert("生成完了", `${specs.length}試合を生成しました。`);
    } catch (error) {
      Alert.alert(
        "生成失敗",
        error instanceof Error
          ? error.message
          : "組み合わせの生成に失敗しました。",
      );
    } finally {
      setSaving(false);
    }
  };

  const handleGenerateTriangle = () => {
    Keyboard.dismiss();
    if (!currentTournament) {
      Alert.alert("対象なし", "先に大会を作成してください。");
      return;
    }
    if (completedMatchCount > 0) {
      Alert.alert(
        "生成できません",
        `結果入力済みの試合が ${completedMatchCount} 件あります。\n作り直す場合は先に「試合結果をクリア」してください。`,
      );
      return;
    }
    if (!canGenerateTriangle) {
      Alert.alert("入力不足", "生成の条件を満たしていません。");
      return;
    }

    const tournamentId = currentTournament.id;
    if (matches.length === 0) {
      runGenerateTriangle(tournamentId);
      return;
    }
    Alert.alert(
      "組み合わせ生成確認",
      `既存の対戦カード ${matches.length} 件を削除して生成します。`,
      [
        { text: "キャンセル", style: "cancel" },
        {
          text: "削除して生成",
          style: "destructive",
          onPress: () => runGenerateTriangle(tournamentId),
        },
      ],
    );
  };

  const handleDeleteTeam = async (teamId: string, teamName: string) => {
    if (!currentTournament) return;
    Keyboard.dismiss();
    Alert.alert(
      "チーム削除確認",
      `${teamName} を削除します。関連する対戦カードも削除されます。`,
      [
        { text: "キャンセル", style: "cancel" },
        {
          text: "削除",
          style: "destructive",
          onPress: async () => {
            try {
              setSaving(true);
              await deleteTeam(teamId, currentTournament.id);
              if (homeTeamId === teamId) setHomeTeamId("");
              if (awayTeamId === teamId) setAwayTeamId("");
              Alert.alert("削除完了", "チームを削除しました。");
            } catch (error) {
              Alert.alert(
                "削除失敗",
                error instanceof Error
                  ? error.message
                  : "チーム削除に失敗しました。",
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
    Alert.alert("対戦カード削除確認", "この対戦カードを削除します。", [
      { text: "キャンセル", style: "cancel" },
      {
        text: "削除",
        style: "destructive",
        onPress: async () => {
          try {
            setSaving(true);
            await deleteMatch(matchId);
            Alert.alert("削除完了", "対戦カードを削除しました。");
          } catch (error) {
            Alert.alert(
              "削除失敗",
              error instanceof Error
                ? error.message
                : "対戦カード削除に失敗しました。",
            );
          } finally {
            setSaving(false);
          }
        },
      },
    ]);
  };

  const handleClearResults = async () => {
    if (!currentTournament) {
      Alert.alert("対象なし", "大会を選択してください。");
      return;
    }
    Keyboard.dismiss();
    Alert.alert(
      "結果クリア確認",
      `「${currentTournament.name}」の全試合結果をクリアします。\n対戦カードは残ります。`,
      [
        { text: "キャンセル", style: "cancel" },
        {
          text: "クリア",
          style: "destructive",
          onPress: async () => {
            try {
              setSaving(true);
              await clearTournamentResults(currentTournament.id);
              Alert.alert("完了", "全試合の結果をクリアしました。");
            } catch (error) {
              Alert.alert(
                "失敗",
                error instanceof Error ? error.message : "結果クリアに失敗しました。",
              );
            } finally {
              setSaving(false);
            }
          },
        },
      ],
    );
  };

  const handleDeleteTournament = async () => {
    if (!currentTournament) {
      Alert.alert("対象なし", "削除対象の大会がありません。");
      return;
    }

    Keyboard.dismiss();
    Alert.alert(
      "大会削除確認",
      `「${currentTournament.name}」を削除します。\nこの大会のチーム・対戦カード・結果もすべて削除されます。`,
      [
        { text: "キャンセル", style: "cancel" },
        {
          text: "削除",
          style: "destructive",
          onPress: async () => {
            try {
              setSaving(true);
              const deletingTournamentId = currentTournament.id;
              await deleteTournament(deletingTournamentId);
              if (selectedTournamentId === deletingTournamentId) {
                setSelectedTournamentId(null);
              }
              setHomeTeamId("");
              setAwayTeamId("");
              Alert.alert("削除完了", "大会と関連データを削除しました。");
            } catch (error) {
              Alert.alert(
                "削除失敗",
                error instanceof Error
                  ? error.message
                  : "大会削除に失敗しました。",
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
          <AnimatedPressable
            style={styles.button}
            onPress={handleAdminLogin}
            disabled={saving}
          >
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
              onPress={() => toggleSection("connection")}
            >
              <Text style={styles.heading}>接続状態</Text>
              <Text style={styles.toggleIcon}>
                {sectionOpen.connection ? "▲" : "▼"}
              </Text>
            </AnimatedPressable>
            {sectionOpen.connection ? (
              <>
                <Text style={styles.status}>
                  Firebase接続:{" "}
                  {firebaseReady
                    ? "利用可能（設定済み）"
                    : "利用不可（設定未完了）"}
                </Text>
                <Text style={styles.item}>
                  選択中の大会:{" "}
                  {currentTournament ? currentTournament.name : "未作成"}
                </Text>
                <Text style={styles.item}>
                  ※ 利用不可の場合は `.env` の Firebase 設定を確認してください
                </Text>
              </>
            ) : null}
          </View>

          <View style={styles.card}>
            <AnimatedPressable
              style={styles.toggleHeader}
              onPress={() => toggleSection("session")}
            >
              <Text style={styles.heading}>ログイン情報</Text>
              <Text style={styles.toggleIcon}>
                {sectionOpen.session ? "▲" : "▼"}
              </Text>
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
              onPress={() => toggleSection("tournament")}
            >
              <Text style={styles.heading}>大会登録</Text>
              <Text style={styles.toggleIcon}>
                {sectionOpen.tournament ? "▲" : "▼"}
              </Text>
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
                  <Text
                    style={
                      tournamentDate ? styles.inputText : styles.placeholderText
                    }
                  >
                    {tournamentDate || "日付をカレンダーから選択"}
                  </Text>
                </Pressable>
                {showDatePicker ? (
                  <DateTimePicker
                    value={tournamentDateValue}
                    mode="date"
                    display={Platform.OS === "ios" ? "inline" : "default"}
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
                  style={[styles.button, styles.warningButton]}
                  onPress={handleClearResults}
                  disabled={saving || !currentTournament}
                >
                  <Text style={styles.buttonText}>試合結果をクリア</Text>
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
            <AnimatedPressable
              style={styles.toggleHeader}
              onPress={() => toggleSection("rules")}
            >
              <Text style={styles.heading}>勝ち点ルール設定</Text>
              <Text style={styles.toggleIcon}>
                {sectionOpen.rules ? "▲" : "▼"}
              </Text>
            </AnimatedPressable>
            {sectionOpen.rules ? (
              <>
                <RuleInput
                  label="2-0勝ち"
                  value={rules.straightWin}
                  onChange={(value) =>
                    setRules((prev) => ({ ...prev, straightWin: value }))
                  }
                />
                <RuleInput
                  label="1-1（得点多い）"
                  value={rules.drawHigherScore}
                  onChange={(value) =>
                    setRules((prev) => ({ ...prev, drawHigherScore: value }))
                  }
                />
                <RuleInput
                  label="1-1（得点少ない）"
                  value={rules.drawLowerScore}
                  onChange={(value) =>
                    setRules((prev) => ({ ...prev, drawLowerScore: value }))
                  }
                />
                <RuleInput
                  label="1-1（得点同じ）"
                  value={rules.drawEqualScore}
                  onChange={(value) =>
                    setRules((prev) => ({ ...prev, drawEqualScore: value }))
                  }
                />
                <AnimatedPressable
                  style={styles.button}
                  onPress={handleUpdateRules}
                  disabled={saving}
                >
                  <Text style={styles.buttonText}>ルールを保存</Text>
                </AnimatedPressable>
              </>
            ) : null}
          </View>

          <View style={styles.card}>
            <AnimatedPressable
              style={styles.toggleHeader}
              onPress={() => toggleSection("teams")}
            >
              <Text style={styles.heading}>チーム登録</Text>
              <Text style={styles.toggleIcon}>
                {sectionOpen.teams ? "▲" : "▼"}
              </Text>
            </AnimatedPressable>
            {sectionOpen.teams ? (
              <>
                <TextInput
                  value={teamName}
                  onChangeText={setTeamName}
                  style={styles.input}
                  placeholder="チーム名"
                />
                <AnimatedPressable
                  style={styles.button}
                  onPress={handleCreateTeam}
                  disabled={saving}
                >
                  <Text style={styles.buttonText}>チームを保存</Text>
                </AnimatedPressable>
                {teams.length > 0 ? (
                  <Text style={styles.subItem}>
                    右の欄にくじ番号（空欄可）を入力し、「くじ番号を保存」でまとめて保存します。
                  </Text>
                ) : null}
                {teams.map((team) => {
                  const drawText = drawInputs[team.id] ?? "";
                  return (
                    <View key={team.id} style={styles.rowBetween}>
                      <Text
                        style={[styles.item, styles.rowText]}
                        numberOfLines={1}
                      >
                        - {team.name}
                      </Text>
                      <TextInput
                        value={drawText}
                        onChangeText={(text) =>
                          setDrawInputs((prev) => ({
                            ...prev,
                            [team.id]: text.replace(/[^0-9]/g, ""),
                          }))
                        }
                        keyboardType="number-pad"
                        maxLength={2}
                        placeholder="番号"
                        placeholderTextColor="#8ba0c3"
                        style={[
                          styles.drawInput,
                          normalizeDrawText(drawText) !== savedDrawText(team.drawNumber) &&
                            styles.drawInputDirty,
                        ]}
                      />
                      <AnimatedPressable
                        style={styles.deleteButton}
                        onPress={() => handleDeleteTeam(team.id, team.name)}
                        disabled={saving}
                      >
                        <Text style={styles.deleteButtonText}>削除</Text>
                      </AnimatedPressable>
                    </View>
                  );
                })}
                {teams.length > 0 ? (
                  <AnimatedPressable
                    style={styles.button}
                    onPress={handleSaveDrawNumbers}
                    disabled={saving}
                  >
                    <Text style={styles.buttonText}>くじ番号を保存</Text>
                  </AnimatedPressable>
                ) : null}
              </>
            ) : null}
          </View>

          <View style={styles.card}>
            <AnimatedPressable
              style={styles.toggleHeader}
              onPress={() => toggleSection("triangle")}
            >
              <Text style={styles.heading}>三角形予選の生成</Text>
              <Text style={styles.toggleIcon}>
                {sectionOpen.triangle ? "▲" : "▼"}
              </Text>
            </AnimatedPressable>
            {sectionOpen.triangle ? (
              <>
                <Text style={styles.subItem}>
                  くじ番号から{TRIANGLE_TEAM_COUNT}チーム・A〜Iの9コート・3ラウンド（各チーム6試合）の対戦カードを一括作成します。
                </Text>
                <Text style={styles.item}>
                  登録チーム数: {drawCheck.teamCount} / {TRIANGLE_TEAM_COUNT}
                </Text>
                <Text style={styles.item}>
                  くじ番号入力済み: {drawCheck.assignedCount} /{" "}
                  {drawCheck.teamCount}
                </Text>
                {drawCheck.teamCount !== TRIANGLE_TEAM_COUNT ? (
                  <Text style={styles.warningText}>
                    この機能は{TRIANGLE_TEAM_COUNT}チーム専用です。
                  </Text>
                ) : null}
                {drawCheck.duplicates.length > 0 ? (
                  <Text style={styles.warningText}>
                    重複している番号: {drawCheck.duplicates.join("、")}
                  </Text>
                ) : null}
                {drawCheck.outOfRange.length > 0 ? (
                  <Text style={styles.warningText}>
                    範囲外（1〜{TRIANGLE_TEAM_COUNT}以外）の番号:{" "}
                    {drawCheck.outOfRange.join("、")}
                  </Text>
                ) : null}
                {drawCheck.teamCount === TRIANGLE_TEAM_COUNT &&
                drawCheck.missing.length > 0 ? (
                  <Text style={styles.warningText}>
                    未使用の番号: {drawCheck.missing.join("、")}
                  </Text>
                ) : null}
                {hasUnsavedDrawNumbers ? (
                  <Text style={styles.warningText}>
                    未保存のくじ番号があります。先に「くじ番号を保存」を押してください。
                  </Text>
                ) : null}
                {completedMatchCount > 0 ? (
                  <Text style={styles.warningText}>
                    結果入力済みの試合が {completedMatchCount}{" "}
                    件あるため生成できません。作り直す場合は先に「試合結果をクリア」してください。
                  </Text>
                ) : matches.length > 0 ? (
                  <Text style={styles.item}>
                    既存の対戦カード {matches.length} 件は生成時に削除されます。
                  </Text>
                ) : null}
                <AnimatedPressable
                  style={[
                    styles.button,
                    !canGenerateTriangle && styles.disabledButton,
                  ]}
                  onPress={handleGenerateTriangle}
                  disabled={saving || !canGenerateTriangle}
                >
                  <Text style={styles.buttonText}>組み合わせを生成</Text>
                </AnimatedPressable>
              </>
            ) : null}
          </View>

          <View style={styles.card}>
            <AnimatedPressable
              style={styles.toggleHeader}
              onPress={() => toggleSection("matches")}
            >
              <Text style={styles.heading}>対戦カード作成</Text>
              <Text style={styles.toggleIcon}>
                {sectionOpen.matches ? "▲" : "▼"}
              </Text>
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
                <AnimatedPressable
                  style={styles.button}
                  onPress={handleCreateMatch}
                  disabled={saving}
                >
                  <Text style={styles.buttonText}>対戦カードを保存</Text>
                </AnimatedPressable>
                {matches.map((match) => (
                  <View key={match.id} style={styles.rowBetween}>
                    <View style={styles.rowText}>
                      <MatchupLabel
                        home={teamNameMap[match.homeTeamId] ?? "未設定"}
                        away={teamNameMap[match.awayTeamId] ?? "未設定"}
                        textStyle={styles.item}
                      />
                    </View>
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
        onChangeText={(text) => onChange(Number(text || "0"))}
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

function savedDrawText(drawNumber?: number): string {
  return typeof drawNumber === "number" ? String(drawNumber) : "";
}

// 入力欄の文字列を保存値と比べられる形に（"05" → "5"、空欄は ""）
function normalizeDrawText(text?: string): string {
  const trimmed = (text ?? "").trim();
  return trimmed === "" ? "" : String(Number(trimmed));
}

function formatDate(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: "#f6f9ff",
    borderRadius: 28,
    padding: 20,
    borderWidth: 1,
    borderTopColor: "#ffffff",
    borderLeftColor: "#ffffff",
    borderRightColor: "#d8e3f5",
    borderBottomColor: "#d8e3f5",
    gap: 12,
    shadowColor: "#8ba4cc",
    shadowOffset: { width: 0, height: 14 },
    shadowOpacity: 0.26,
    shadowRadius: 20,
    elevation: 10,
  },
  heading: {
    fontSize: 16,
    fontWeight: "700",
    color: "#24324b",
  },
  item: {
    fontSize: 14,
    color: "#465777",
  },
  subItem: {
    fontSize: 12,
    color: "#6b7a99",
  },
  warningText: {
    fontSize: 13,
    color: "#ba5067",
  },
  drawInput: {
    width: 56,
    flexShrink: 0,
    borderWidth: 1,
    borderTopColor: "#ffffff",
    borderLeftColor: "#ffffff",
    borderRightColor: "#d9e4f7",
    borderBottomColor: "#d9e4f7",
    borderRadius: 16,
    paddingHorizontal: 6,
    paddingVertical: 6,
    textAlign: "center",
    fontSize: 14,
    backgroundColor: "#f2f7ff",
    color: "#24324b",
    shadowColor: "#9eb5d9",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 4,
  },
  drawInputDirty: {
    borderColor: "#e8924a",
    backgroundColor: "#fff6ec",
  },
  status: {
    fontSize: 13,
    color: "#4a90e2",
    marginTop: 4,
  },
  input: {
    borderWidth: 1,
    borderTopColor: "#ffffff",
    borderLeftColor: "#ffffff",
    borderRightColor: "#d9e4f7",
    borderBottomColor: "#d9e4f7",
    borderRadius: 24,
    paddingHorizontal: 16,
    paddingVertical: 11,
    backgroundColor: "#f2f7ff",
    justifyContent: "center",
    color: "#24324b",
    shadowColor: "#9eb5d9",
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.2,
    shadowRadius: 14,
    elevation: 8,
  },
  inputText: {
    fontSize: 14,
    color: "#24324b",
  },
  placeholderText: {
    fontSize: 14,
    color: "#8ba0c3",
  },
  button: {
    marginTop: 6,
    backgroundColor: "#5a9ef2",
    borderRadius: 24,
    paddingVertical: 13,
    alignItems: "center",
    shadowColor: "#2f7fe6",
    shadowOffset: { width: 0, height: 9 },
    shadowOpacity: 0.24,
    shadowRadius: 14,
    elevation: 8,
  },
  secondaryButton: {
    backgroundColor: "#6b7a99",
  },
  dangerButton: {
    backgroundColor: "#d85e78",
  },
  warningButton: {
    backgroundColor: "#e8924a",
  },
  disabledButton: {
    backgroundColor: "#a9b8d3",
    shadowOpacity: 0.1,
  },
  buttonText: {
    color: "#fff",
    fontWeight: "700",
  },
  ruleRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 10,
  },
  ruleLabel: {
    flex: 1,
    fontSize: 14,
    color: "#465777",
  },
  ruleInput: {
    width: 80,
    borderWidth: 1,
    borderTopColor: "#ffffff",
    borderLeftColor: "#ffffff",
    borderRightColor: "#d9e4f7",
    borderBottomColor: "#d9e4f7",
    borderRadius: 18,
    paddingHorizontal: 8,
    paddingVertical: 8,
    textAlign: "center",
    backgroundColor: "#f2f7ff",
    color: "#24324b",
    shadowColor: "#9eb5d9",
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.15,
    shadowRadius: 10,
    elevation: 5,
  },
  teamWrap: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  teamButton: {
    borderWidth: 1,
    borderTopColor: "#ffffff",
    borderLeftColor: "#ffffff",
    borderRightColor: "#d9e4f7",
    borderBottomColor: "#d9e4f7",
    borderRadius: 24,
    paddingHorizontal: 14,
    paddingVertical: 10,
    backgroundColor: "#f2f7ff",
    shadowColor: "#9eb5d9",
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.2,
    shadowRadius: 14,
    elevation: 8,
  },
  teamSelected: {
    borderColor: "#4a90e2",
    backgroundColor: "#dcecff",
    shadowColor: "#4a90e2",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.22,
    shadowRadius: 12,
    elevation: 7,
  },
  teamButtonText: {
    color: "#465777",
    fontSize: 13,
  },
  rowBetween: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 8,
  },
  rowText: {
    flex: 1,
  },
  deleteButton: {
    flexShrink: 0,
    borderWidth: 1,
    borderColor: "#f3a4b4",
    borderRadius: 20,
    paddingHorizontal: 10,
    paddingVertical: 7,
    backgroundColor: "#fff1f5",
    shadowColor: "#eab6c3",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.12,
    shadowRadius: 10,
    elevation: 4,
  },
  deleteButtonText: {
    color: "#ba5067",
    fontSize: 12,
    fontWeight: "700",
  },
  toggleHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  toggleIcon: {
    fontSize: 12,
    color: "#6b7a99",
  },
});
