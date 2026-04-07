import { MaterialIcons } from '@expo/vector-icons';
import { StyleProp, StyleSheet, Text, TextStyle, View } from 'react-native';

interface MatchupLabelProps {
  home: string;
  away: string;
  textStyle?: StyleProp<TextStyle>;
}

export default function MatchupLabel({ home, away, textStyle }: MatchupLabelProps) {
  return (
    <View style={styles.row}>
      <Text style={[styles.teamText, styles.homeText, textStyle]} numberOfLines={1} ellipsizeMode="tail">
        {home}
      </Text>
      <View style={styles.iconWrap}>
        <MaterialIcons name="sports-volleyball" size={10} color="#a0aec0" />
      </View>
      <Text style={[styles.teamText, styles.awayText, textStyle]} numberOfLines={1} ellipsizeMode="tail">
        {away}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '100%',
    gap: 8,
  },
  teamText: {
    flex: 1,
    fontSize: 13,
    color: '#465777',
  },
  homeText: {
    textAlign: 'right',
  },
  awayText: {
    textAlign: 'left',
  },
  iconWrap: {
    width: 14,
    height: 14,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
});
