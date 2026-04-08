import { useEffect, useMemo, useState } from 'react';
import { NavigationContainer, DefaultTheme } from '@react-navigation/native';
import {
  createMaterialTopTabNavigator,
  MaterialTopTabBarProps,
} from '@react-navigation/material-top-tabs';
import { StatusBar } from 'expo-status-bar';
import * as SplashScreen from 'expo-splash-screen';
import { MaterialIcons } from '@expo/vector-icons';
import { Animated, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaProvider, useSafeAreaInsets } from 'react-native-safe-area-context';
import { onAuthStateChanged } from 'firebase/auth';
import { useFonts } from 'expo-font';
import MatchesListScreen from './src/screens/MatchesListScreen';
import MatchResultInputScreen from './src/screens/MatchResultInputScreen';
import StandingsScreen from './src/screens/StandingsScreen';
import AdminScreen from './src/screens/AdminScreen';
import { TournamentSelectionProvider } from './src/context/TournamentSelectionContext';
import { auth } from './src/firebase/config';

const Tab = createMaterialTopTabNavigator();

const appTheme = {
  ...DefaultTheme,
  colors: {
    ...DefaultTheme.colors,
    background: '#eef3fb',
  },
};

void SplashScreen.preventAutoHideAsync().catch(() => undefined);

export default function App() {
  const [appReady, setAppReady] = useState(false);
  const [fontsLoaded] = useFonts({
    KiwiMaru_300Light: require('@expo-google-fonts/kiwi-maru/300Light/KiwiMaru_300Light.ttf'),
    KiwiMaru_400Regular: require('@expo-google-fonts/kiwi-maru/400Regular/KiwiMaru_400Regular.ttf'),
    KiwiMaru_500Medium: require('@expo-google-fonts/kiwi-maru/500Medium/KiwiMaru_500Medium.ttf'),
  });

  useEffect(() => {
    if (!fontsLoaded) return;

    const textComponent = Text as typeof Text & {
      defaultProps?: { style?: unknown };
    };
    const inputComponent = TextInput as typeof TextInput & {
      defaultProps?: { style?: unknown };
    };
    const baseStyle = { fontFamily: 'KiwiMaru_400Regular' };

    textComponent.defaultProps = {
      ...(textComponent.defaultProps ?? {}),
      style: [textComponent.defaultProps?.style, baseStyle],
    };
    inputComponent.defaultProps = {
      ...(inputComponent.defaultProps ?? {}),
      style: [inputComponent.defaultProps?.style, baseStyle],
    };
  }, [fontsLoaded]);

  useEffect(() => {
    let mounted = true;

    const prepareApp = async () => {
      const authRef = auth;
      if (authRef) {
        await new Promise<void>((resolve) => {
          const unsub = onAuthStateChanged(authRef, () => {
            unsub();
            resolve();
          });
        });
      }

      // 初期表示のチラつきを抑えるため、短時間だけスプラッシュを維持する。
      await new Promise((resolve) => setTimeout(resolve, 250));
      if (mounted) {
        setAppReady(true);
      }
    };

    void prepareApp();
    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    if (!appReady || !fontsLoaded) return;
    void SplashScreen.hideAsync().catch(() => undefined);
  }, [appReady, fontsLoaded]);

  if (!appReady || !fontsLoaded) {
    return null;
  }

  return (
    <SafeAreaProvider>
      <TournamentSelectionProvider>
        <NavigationContainer theme={appTheme}>
          <StatusBar style="dark" />
          <Tab.Navigator
            tabBarPosition="bottom"
            tabBar={(props) => <SwipeBottomTabBar {...props} />}
            screenOptions={() => ({
              swipeEnabled: true,
              lazy: true,
              animationEnabled: true,
            })}
          >
            <Tab.Screen name="試合一覧" component={MatchesListScreen} />
            <Tab.Screen name="結果入力" component={MatchResultInputScreen} />
            <Tab.Screen name="順位表" component={StandingsScreen} />
            <Tab.Screen name="管理者" component={AdminScreen} />
          </Tab.Navigator>
        </NavigationContainer>
      </TournamentSelectionProvider>
    </SafeAreaProvider>
  );
}

function SwipeBottomTabBar({
  state,
  descriptors,
  navigation,
  position,
}: MaterialTopTabBarProps) {
  const insets = useSafeAreaInsets();
  const [rowWidth, setRowWidth] = useState(0);
  const tabWidth = useMemo(
    () => (state.routes.length > 0 ? rowWidth / state.routes.length : 0),
    [rowWidth, state.routes.length],
  );

  const indicatorTranslateX =
    tabWidth > 0
      ? Animated.add(Animated.multiply(position, tabWidth), new Animated.Value(3))
      : new Animated.Value(0);

  return (
    <View style={[styles.tabContainer, { paddingBottom: Math.max(14, insets.bottom) }]}>
      <View
        style={styles.tabRow}
        onLayout={(event) => setRowWidth(event.nativeEvent.layout.width)}
      >
        {tabWidth > 0 ? (
          <Animated.View
            pointerEvents="none"
            style={[
              styles.tabIndicator,
              {
                width: Math.max(tabWidth - 6, 0),
                transform: [{ translateX: indicatorTranslateX }],
              },
            ]}
          />
        ) : null}
        {state.routes.map((route, index) => {
          const focused = state.index === index;
          const options = descriptors[route.key].options;
          const label =
            typeof options.tabBarLabel === 'string'
              ? options.tabBarLabel
              : typeof options.title === 'string'
                ? options.title
                : route.name;
          const color = focused ? '#1155cc' : '#718096';
          const iconName =
            route.name === '試合一覧'
              ? 'format-list-bulleted'
              : route.name === '結果入力'
                ? 'edit-note'
                : route.name === '順位表'
                  ? 'leaderboard'
                  : 'admin-panel-settings';

          const onPress = () => {
            const event = navigation.emit({
              type: 'tabPress',
              target: route.key,
              canPreventDefault: true,
            });
            if (!focused && !event.defaultPrevented) {
              navigation.navigate(route.name);
            }
          };

          const onLongPress = () => {
            navigation.emit({
              type: 'tabLongPress',
              target: route.key,
            });
          };

          return (
            <Pressable
              key={route.key}
              style={styles.tabButton}
              onPress={onPress}
              onLongPress={onLongPress}
            >
              <MaterialIcons name={iconName} color={color} size={20} />
              <Text style={[styles.tabLabel, focused && styles.tabLabelActive]}>{label}</Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  tabContainer: {
    backgroundColor: '#eef3fb',
    borderTopWidth: 0,
    paddingHorizontal: 12,
    paddingTop: 8,
    paddingBottom: 14,
  },
  tabRow: {
    position: 'relative',
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f7faff',
    borderRadius: 28,
    padding: 5,
    borderWidth: 1,
    borderColor: '#d8e4f8',
    shadowColor: '#8fa9d3',
    shadowOffset: { width: 0, height: 14 },
    shadowOpacity: 0.3,
    shadowRadius: 20,
    elevation: 11,
  },
  tabButton: {
    flex: 1,
    minHeight: 56,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tabIndicator: {
    position: 'absolute',
    top: 4,
    bottom: 4,
    backgroundColor: '#dce9ff',
    borderRadius: 24,
    shadowColor: '#4a90e2',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.32,
    shadowRadius: 16,
    elevation: 10,
  },
  tabLabel: {
    marginTop: 2,
    fontSize: 11,
    fontWeight: '600',
    color: '#6b7a99',
  },
  tabLabelActive: {
    color: '#2f6fb8',
  },
});
