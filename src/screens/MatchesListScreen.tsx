import { useEffect, useMemo, useState } from "react";
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

      <View style={styles.tableCardShadow}>
        <View style={styles.tableCard}>
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
              長押しで掴んだまま並び替えできます
              {savingOrder ? "（保存中...）" : ""}
            </Text>
          ) : null}

          {localMatches.length > 0 && isAdmin ? (
            <DragList
              style={styles.dragList}
              data={localMatches}
              keyExtractor={(item) => item.id}
              renderItem={({
                item,
                onDragStart,
                onDragEnd,
                isActive,
              }: DragListRenderItemInfo<Match>) => (
                <Pressable
                  style={[
                    styles.tableRow,
                    styles.bodyRow,
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
                  delayLongPress={180}
                  disabled={!isAdmin}
                >
                  <View style={styles.colTeams}>
                    <MatchupLabel
                      home={teamNameMap[item.homeTeamId] ?? "未設定"}
                      away={teamNameMap[item.awayTeamId] ?? "未設定"}
                      textStyle={styles.teamNameText}
                    />
                  </View>
                  <Text style={styles.colSets}>
                    {item.status === "completed"
                      ? `${item.setScores[0]?.home}-${item.setScores[0]?.away} / ${item.setScores[1]?.home}-${item.setScores[1]?.away}`
                      : "-"}
                  </Text>
                </Pressable>
              )}
              onReordered={handleReordered}
              scrollEnabled
            />
          ) : null}
          {localMatches.length > 0 && !isAdmin ? (
            <>
              {localMatches.map((item) => (
                <View key={item.id} style={[styles.tableRow, styles.bodyRow]}>
                  <View style={styles.colTeams}>
                    <MatchupLabel
                      home={teamNameMap[item.homeTeamId] ?? "未設定"}
                      away={teamNameMap[item.awayTeamId] ?? "未設定"}
                      textStyle={styles.teamNameText}
                    />
                  </View>
                  <Text style={styles.colSets}>
                    {item.status === "completed"
                      ? `${item.setScores[0]?.home}-${item.setScores[0]?.away} / ${item.setScores[1]?.home}-${item.setScores[1]?.away}`
                      : "-"}
                  </Text>
                </View>
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

const styles = StyleSheet.create({
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
  emptyText: {
    flex: 1,
    fontSize: 14,
    textAlign: "center",
    color: "#5a6c90",
  },
});
