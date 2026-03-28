import { useEffect, useRef } from 'react';
import { NavigationContainer, DefaultTheme } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { StatusBar } from 'expo-status-bar';
import { MaterialIcons } from '@expo/vector-icons';
import { Animated } from 'react-native';
import MatchesListScreen from './src/screens/MatchesListScreen';
import MatchResultInputScreen from './src/screens/MatchResultInputScreen';
import StandingsScreen from './src/screens/StandingsScreen';
import AdminScreen from './src/screens/AdminScreen';
import { TournamentSelectionProvider } from './src/context/TournamentSelectionContext';

const Tab = createBottomTabNavigator();

const appTheme = {
  ...DefaultTheme,
  colors: {
    ...DefaultTheme.colors,
    background: '#f7f9fc',
  },
};

export default function App() {
  return (
    <TournamentSelectionProvider>
      <NavigationContainer theme={appTheme}>
        <StatusBar style="dark" />
        <Tab.Navigator
          screenOptions={({ route }) => ({
            headerTitleAlign: 'center',
            tabBarActiveTintColor: '#1155cc',
            tabBarInactiveTintColor: '#718096',
            tabBarIcon: ({ color, size, focused }) => {
              const iconName =
                route.name === '試合一覧'
                  ? 'format-list-bulleted'
                  : route.name === '結果入力'
                    ? 'edit-note'
                    : route.name === '順位表'
                      ? 'leaderboard'
                      : 'admin-panel-settings';

              return (
                <AnimatedTabIcon name={iconName} color={color} size={size} focused={focused} />
              );
            },
          })}
        >
          <Tab.Screen name="試合一覧" component={MatchesListScreen} />
          <Tab.Screen name="結果入力" component={MatchResultInputScreen} />
          <Tab.Screen name="順位表" component={StandingsScreen} />
          <Tab.Screen name="管理者" component={AdminScreen} />
        </Tab.Navigator>
      </NavigationContainer>
    </TournamentSelectionProvider>
  );
}

function AnimatedTabIcon({
  name,
  color,
  size,
  focused,
}: {
  name: React.ComponentProps<typeof MaterialIcons>['name'];
  color: string;
  size: number;
  focused: boolean;
}) {
  const opacityAnim = useRef(new Animated.Value(focused ? 1 : 0.85)).current;
  const scaleAnim = useRef(new Animated.Value(focused ? 1.12 : 1)).current;

  useEffect(() => {
    Animated.sequence([
      Animated.parallel([
        Animated.timing(opacityAnim, {
          toValue: 0.2,
          duration: 70,
          useNativeDriver: true,
        }),
        Animated.timing(scaleAnim, {
          toValue: 0.92,
          duration: 70,
          useNativeDriver: true,
        }),
      ]),
      Animated.parallel([
        Animated.spring(scaleAnim, {
          toValue: focused ? 1.12 : 1,
          useNativeDriver: true,
          speed: 18,
          bounciness: 8,
        }),
        Animated.timing(opacityAnim, {
          toValue: focused ? 1 : 0.85,
          duration: 150,
          useNativeDriver: true,
        }),
      ]),
    ]).start();
  }, [focused, opacityAnim, scaleAnim]);

  return (
    <Animated.View
      style={{
        transform: [{ scale: scaleAnim }],
        opacity: opacityAnim,
      }}
    >
      <MaterialIcons name={name} size={size} color={color} />
    </Animated.View>
  );
}
