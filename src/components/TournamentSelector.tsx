import { useEffect, useRef } from 'react';
import { Animated, Keyboard, StyleSheet, Text, View } from 'react-native';
import AnimatedPressable from './AnimatedPressable';
import { Tournament } from '../types/models';

interface TournamentSelectorProps {
  tournaments: Tournament[];
  selectedTournamentId: string | null;
  onSelect: (id: string) => void;
}

export default function TournamentSelector({
  tournaments,
  selectedTournamentId,
  onSelect,
}: TournamentSelectorProps) {
  return (
    <View style={styles.card}>
      <Text style={styles.heading}>大会選択</Text>
      {tournaments.length === 0 ? (
        <Text style={styles.item}>大会がありません（管理者画面で作成）</Text>
      ) : (
        <View style={styles.wrap}>
          {tournaments.map((item) => (
            <AnimatedTournamentChip
              key={item.id}
              selected={selectedTournamentId === item.id}
              name={item.name}
              date={item.date}
              onPress={() => {
                Keyboard.dismiss();
                onSelect(item.id);
              }}
            />
          ))}
        </View>
      )}
    </View>
  );
}

function AnimatedTournamentChip({
  selected,
  name,
  date,
  onPress,
}: {
  selected: boolean;
  name: string;
  date: string;
  onPress: () => void;
}) {
  const opacityAnim = useRef(new Animated.Value(selected ? 1 : 0.9)).current;
  const scaleAnim = useRef(new Animated.Value(selected ? 1.04 : 1)).current;

  useEffect(() => {
    Animated.sequence([
      Animated.parallel([
        Animated.timing(opacityAnim, {
          toValue: 0.25,
          duration: 70,
          useNativeDriver: true,
        }),
        Animated.timing(scaleAnim, {
          toValue: 0.96,
          duration: 70,
          useNativeDriver: true,
        }),
      ]),
      Animated.parallel([
        Animated.spring(scaleAnim, {
          toValue: selected ? 1.04 : 1,
          useNativeDriver: true,
          speed: 18,
          bounciness: 8,
        }),
        Animated.timing(opacityAnim, {
          toValue: selected ? 1 : 0.9,
          duration: 150,
          useNativeDriver: true,
        }),
      ]),
    ]).start();
  }, [opacityAnim, scaleAnim, selected]);

  return (
    <Animated.View
      style={{
        transform: [{ scale: scaleAnim }],
        opacity: opacityAnim,
      }}
    >
      <AnimatedPressable style={[styles.chip, selected && styles.chipSelected]} onPress={onPress}>
        <Text style={styles.chipText}>{name}</Text>
        <Text style={styles.chipSubText}>{date}</Text>
      </AnimatedPressable>
    </Animated.View>
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
  wrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  chip: {
    borderWidth: 1,
    borderColor: '#cbd5e0',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 8,
    backgroundColor: '#fff',
    minWidth: 120,
  },
  chipSelected: {
    borderColor: '#1155cc',
    backgroundColor: '#e6efff',
  },
  chipText: {
    fontSize: 13,
    color: '#1a202c',
    fontWeight: '700',
  },
  chipSubText: {
    fontSize: 11,
    color: '#4a5568',
    marginTop: 2,
  },
});
