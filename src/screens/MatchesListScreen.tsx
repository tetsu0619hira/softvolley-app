import { Fragment, useEffect, useMemo, useState } from "react";
import { Alert, Pressable, StyleSheet, Text, View } from "react-native";
import { useNavigation } from "@react-navigation/native";
import { onAuthStateChanged, User } from "firebase/auth";
import DragList, { DragListRenderItemInfo } from "react-native-draglist";
import MatchupLabel from "../components/MatchupLabel";
import ScreenContainer from "../components/ScreenContainer";
import TournamentSelector from "../components/TournamentSelector";
import { auth } from "../firebase/config";
import { reorderMatches } from "../firebase/repositories";
import { useDelayedLoading } from "../hooks/useDelayedLoading";
import { useTournamentData } from "../hooks/useTournamentData";
import { Match } from "../types/models";
import { courtGameLabel } from "../utils/triangleSchedule";

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
  const [user, setUser] = useState<User | null>(null);
  const [localMatches, setLocalMatches] = useState<Match[]>([]);
  const [savingOrder, setSavingOrder] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [orderVersion, setOrderVersion] = useState(0);
  const isAdmin = useMemo(() => !!user, [user]);
  const navigation = useNavigation();

  useEffect(() => {
    if (!auth) return;
    const unsub = onAuthStateChanged(auth, (nextUser) => setUser(nextUser));
    return () => unsub();
  }, []);

  useEffect(() => {
    setLocalMatches(matches);
  }, [matches]);

  useEffect(() => {
    setOrderVersion(currentTournament?.matchesOrderVersion ?? 0);
  }, [currentTournament?.id, currentTournament?.matchesOrderVersion]);

  useEffect(() => {
    navigation.setOptions({ swipeEnabled: !isDragging });
  }, [isDragging, navigation]);

  const handleReordered = async (fromIndex: number, toIndex: number) => {
    if (!currentTournament || !isAdmin) return;

    const nextMatches = [...localMatches];
    const [moved] = nextMatches.splice(fromIndex, 1);
    const boundedIndex = Math.max(0, Math.min(toIndex, nextMatches.length));
    nextMatches.splice(boundedIndex, 0, moved);

    setLocalMatches(nextMatches);
    const nextIds = nextMatches.map((item) => item.id);
    const currentIds = matches.map((item) => item.id);
    const orderChanged =
      nextIds.length !== currentIds.length ||
      nextIds.some((id, index) => id !== currentIds[index]);
    if (!orderChanged) return;

    try {
      setSavingOrder(true);
      const nextVersion = await reorderMatches(
        currentTournament.id,
        nextIds,
        orderVersion,
      );
      setOrderVersion(nextVersion);
    } catch (error) {
      setLocalMatches(matches);
      setOrderVersion(currentTournament.matchesOrderVersion ?? 0);
      Alert.alert(
        "並び替え競合",
        error instanceof Error ? error.message : "試合順の保存に失敗しました。",
      );
    } finally {
      setIsDragging(false);
      setSavingOrder(false);
    }
  };

  return (
    <ScreenContainer
      title="試合一覧"
      scrollEnabled={!isDragging}
      useScrollView={!isAdmin}
    >
      <TournamentSelector
        tournaments={tournaments}
        selectedTournamentId={selectedTournamentId}
        onSelect={setSelectedTournamentId}
      />

      <View style={[styles.tableCardShadow, isAdmin && styles.fill]}>
        <View style={[styles.tableCard, isAdmin && styles.fill]}>
          <View style={[styles.tableRow, styles.headerRow]}>
            <Text
              style={[
                styles.colTeams,
                styles.headerCell,
                styles.headerCellTeams,
                styles.headerText,
                styles.headerTextTeams,
              ]}
            >
              対戦カード
            </Text>
            <Text
              style={[
                styles.colSets,
                styles.headerCell,
                styles.headerCellSets,
                styles.headerText,
                styles.headerTextSets,
              ]}
            >
              セット
            </Text>
          </View>

          {isAdmin && matches.length > 1 ? (
            <Text style={styles.reorderHint}>
              タップで結果を入力・修正／長押しで掴んだまま並び替え
              {savingOrder ? "（保存中...）" : ""}
            </Text>
          ) : null}

          {!isAdmin && localMatches.some((item) => item.status !== "completed") ? (
            <Text style={styles.reorderHint}>未入力の試合をタップすると結果を入力できます</Text>
          ) : null}

          {localMatches.length > 0 && isAdmin ? (
            <DragList
              style={styles.dragList}
              containerStyle={styles.fill}
              contentContainerStyle={styles.dragListContent}
              data={localMatches}
              keyExtractor={(item) => item.id}
              renderItem={({
                item,
                index,
                onDragStart,
                onDragEnd,
                isActive,
              }: DragListRenderItemInfo<Match>) => (
                <View>
                  <RoundDivider round={roundStartAt(localMatches, index)} />
                  <Pressable
                    style={[
                      styles.tableRow,
                      styles.bodyRow,
                      item.status === "completed" && styles.bodyRowCompleted,
                      isActive && styles.draggingRow,
                    ]}
                    onLongPress={() => {
                      if (!isAdmin || savingOrder) return;
                      setIsDragging(true);
                      onDragStart();
                    }}
                    onPressOut={() => {
                      if (isAdmin) {
                        onDragEnd();
                        setIsDragging(false);
                      }
                    }}
                    onPress={() => {
                      // 長押し（並び替え）が成立したときは呼ばれない。タップだけ＝その試合の結果入力を開く
                      if (!isAdmin || savingOrder) return;
                      navigation.navigate({
                        name: "結果入力",
                        params: { matchId: item.id },
                      } as never);
                    }}
                    delayLongPress={180}
                    disabled={!isAdmin}
                  >
                    <MatchTeamsCell
                      match={item}
                      home={teamNameMap[item.homeTeamId] ?? "未設定"}
                      away={teamNameMap[item.awayTeamId] ?? "未設定"}
                    />
                    <Text style={styles.colSets}>
                      {item.status === "completed"
                        ? `${item.setScores[0]?.home}-${item.setScores[0]?.away} / ${item.setScores[1]?.home}-${item.setScores[1]?.away}`
                        : "-"}
                    </Text>
                  </Pressable>
                </View>
              )}
              onReordered={handleReordered}
              scrollEnabled
            />
          ) : null}
          {localMatches.length > 0 && !isAdmin ? (
            <>
              {localMatches.map((item, index) => (
                <Fragment key={item.id}>
                  <RoundDivider round={roundStartAt(localMatches, index)} />
                  <Pressable
                    style={[styles.tableRow, styles.bodyRow, item.status === "completed" && styles.bodyRowCompleted]}
                    // 未ログインは未入力の試合だけ入力できる（入力済みの閲覧・修正は管理者のみ）
                    disabled={item.status === "completed"}
                    onPress={() =>
                      navigation.navigate({
                        name: "結果入力",
                        params: { matchId: item.id },
                      } as never)
                    }
                  >
                    <MatchTeamsCell
                      match={item}
                      home={teamNameMap[item.homeTeamId] ?? "未設定"}
                      away={teamNameMap[item.awayTeamId] ?? "未設定"}
                    />
                    <Text style={styles.colSets}>
                      {item.status === "completed"
                        ? `${item.setScores[0]?.home}-${item.setScores[0]?.away} / ${item.setScores[1]?.home}-${item.setScores[1]?.away}`
                        : "-"}
                    </Text>
                  </Pressable>
                </Fragment>
              ))}
            </>
          ) : null}

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

// ラウンドが切り替わる行ならそのラウンド番号（三角形予選の自動生成分のみ。手動作成の試合は null）
function roundStartAt(items: Match[], index: number): number | null {
  const round = items[index]?.round;
  if (typeof round !== "number") return null;
  return items[index - 1]?.round === round ? null : round;
}

function RoundDivider({ round }: { round: number | null }) {
  if (round === null) return null;
  return (
    <View style={styles.roundDivider}>
      <View style={styles.roundDividerLine} />
      <Text style={styles.roundDividerText}>第{round}ラウンド</Text>
      <View style={styles.roundDividerLine} />
    </View>
  );
}

function MatchTeamsCell({
  match,
  home,
  away,
}: {
  match: Match;
  home: string;
  away: string;
}) {
  const hasSlot =
    typeof match.court === "number" && typeof match.gameNo === "number";
  return (
    <View style={[styles.colTeams, styles.teamsCell]}>
      {hasSlot ? (
        <View style={styles.slotBadge}>
          <Text style={styles.slotBadgeText}>
            {courtGameLabel(match.court as number, match.gameNo as number)}
          </Text>
        </View>
      ) : null}
      <View style={styles.fill}>
        <MatchupLabel home={home} away={away} textStyle={styles.teamNameText} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  teamsCell: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  slotBadge: {
    flexShrink: 0,
    borderRadius: 8,
    paddingHorizontal: 5,
    paddingVertical: 2,
    backgroundColor: "#e2eeff",
  },
  slotBadgeText: {
    fontSize: 10,
    fontWeight: "700",
    color: "#2b5fa5",
  },
  roundDivider: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginHorizontal: 16,
    marginTop: 6,
    marginBottom: 6,
  },
  roundDividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: "#d3dff2",
  },
  roundDividerText: {
    fontSize: 11,
    fontWeight: "700",
    color: "#5a6c90",
  },
  tableCardShadow: {
    backgroundColor: "#f6f9ff",
    borderRadius: 28,
    borderWidth: 1,
    borderTopColor: "#ffffff",
    borderLeftColor: "#ffffff",
    borderRightColor: "#cedcf1",
    borderBottomWidth: 0,
    shadowColor: "#8ba4cc",
    shadowOffset: { width: 0, height: 14 },
    shadowOpacity: 0.3,
    shadowRadius: 20,
    elevation: 10,
  },
  tableCard: {
    borderRadius: 28,
    overflow: "hidden",
    backgroundColor: "#f6f9ff",
    paddingTop: 4,
    paddingBottom: 8,
  },
  tableRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 9,
  },
  bodyRow: {
    marginHorizontal: 12,
    marginBottom: 4,
    borderRadius: 16,
    borderWidth: 1,
    borderTopColor: "#ffffff",
    borderLeftColor: "#ffffff",
    borderRightColor: "#cfdcf0",
    borderBottomColor: "#cfdcf0",
    backgroundColor: "#f6f9ff",
    shadowColor: "#9eb5d9",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.18,
    shadowRadius: 10,
    elevation: 5,
  },
  bodyRowCompleted: {
    backgroundColor: '#edf7ee',
    borderRightColor: '#b8d9bf',
    borderBottomColor: '#b8d9bf',
    shadowColor: '#8ec4a0',
  },
  draggingRow: {
    opacity: 0.86,
    shadowOpacity: 0.22,
    shadowRadius: 12,
    elevation: 7,
  },
  headerRow: {
    backgroundColor: "transparent",
    gap: 6,
    marginHorizontal: 12,
    marginBottom: 4,
  },
  headerText: {
    fontSize: 12,
    fontWeight: "700",
    color: "#3f5b8b",
    textAlign: "center",
  },
  headerCell: {
    borderWidth: 1,
    borderTopColor: "#ffffff",
    borderLeftColor: "#ffffff",
    borderRightColor: "#cfdcf0",
    borderBottomColor: "#cfdcf0",
    backgroundColor: "#f6f9ff",
    borderRadius: 12,
    paddingVertical: 4,
    shadowColor: "#9eb5d9",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.17,
    shadowRadius: 10,
    elevation: 4,
  },
  headerCellTeams: {
    backgroundColor: "#e2eeff",
    borderRightColor: "#c6d9f7",
    borderBottomColor: "#c6d9f7",
  },
  headerCellSets: {
    backgroundColor: "#fff2e6",
    borderRightColor: "#f0d4b8",
    borderBottomColor: "#f0d4b8",
  },
  headerTextTeams: {
    color: "#2b5fa5",
  },
  headerTextSets: {
    color: "#9a5b2a",
  },
  reorderHint: {
    marginHorizontal: 12,
    marginBottom: 6,
    fontSize: 11,
    color: "#5a6c90",
  },
  colTeams: {
    flex: 1,
    paddingRight: 0,
  },
  teamNameText: {
    fontSize: 14,
    color: "#465777",
  },
  colSets: {
    width: 108,
    fontSize: 14,
    textAlign: "center",
    color: "#465777",
  },
  dragList: {
    backgroundColor: "transparent",
  },
  // 管理者表示ではリスト自身がスクロールするため、枠を画面の残り高さに収める
  fill: {
    flex: 1,
  },
  dragListContent: {
    paddingBottom: 24,
  },
  emptyText: {
    flex: 1,
    fontSize: 14,
    textAlign: "center",
    color: "#5a6c90",
  },
});
