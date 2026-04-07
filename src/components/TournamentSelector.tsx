import { useEffect, useRef } from 'react';
import { Animated, Keyboard, StyleSheet, Text, View } from 'react-native';
import AnimatedPressable from './AnimatedPressable';
import { Tournament } from '../types/models';

interface TournamentSelectorProps {
  tournaments: Tournament[];
  selectedTournamentId: string | null;
  onSelect: (id: string) => void;
  footerText?: string;
}

export default function TournamentSelector({
  tournaments,
  selectedTournamentId,
  onSelect,
  footerText,
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
      {footerText ? <Text style={styles.footerText}>{footerText}</Text> : null}
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
        <Text style={[styles.chipText, selected && styles.chipTextSelected]}>{name}</Text>
        <Text style={[styles.chipSubText, selected && styles.chipSubTextSelected]}>{date}</Text>
      </AnimatedPressable>
    </Animated.View>
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
    shadowOpacity: 0.34,
    shadowRadius: 20,
    elevation: 12,
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
  wrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  chip: {
    borderWidth: 1,
    borderTopColor: '#ffffff',
    borderLeftColor: '#ffffff',
    borderRightColor: '#d9e4f7',
    borderBottomColor: '#d9e4f7',
    borderRadius: 24,
    paddingHorizontal: 14,
    paddingVertical: 12,
    backgroundColor: '#f7faff',
    minWidth: 120,
    shadowColor: '#9eb5d9',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.2,
    shadowRadius: 12,
    elevation: 7,
  },
  chipSelected: {
    borderTopColor: '#f2f8ff',
    borderLeftColor: '#f2f8ff',
    borderRightColor: '#6b9fe2',
    borderBottomColor: '#6b9fe2',
    backgroundColor: '#d7e9ff',
    shadowColor: '#4a90e2',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.44,
    shadowRadius: 16,
    elevation: 11,
  },
  chipText: {
    fontSize: 13,
    color: '#6d7f9f',
    fontWeight: '700',
  },
  chipTextSelected: {
    color: '#1d4f90',
  },
  chipSubText: {
    fontSize: 11,
    color: '#8ea0bf',
    marginTop: 3,
  },
  chipSubTextSelected: {
    color: '#356eb8',
    fontWeight: '600',
  },
  footerText: {
    marginTop: 2,
    fontSize: 12,
    color: '#415a85',
    fontWeight: '600',
  },
});
