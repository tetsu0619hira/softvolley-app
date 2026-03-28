import { useCallback, ReactNode, useRef } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import {
  Animated,
  KeyboardAvoidingView,
  Platform,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';

interface ScreenContainerProps {
  title: string;
  subtitle?: string;
  children: ReactNode;
}

export default function ScreenContainer({
  title,
  subtitle,
  children,
}: ScreenContainerProps) {
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(8)).current;

  useFocusEffect(
    useCallback(() => {
      fadeAnim.setValue(0);
      slideAnim.setValue(8);
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 180,
          useNativeDriver: true,
        }),
        Animated.timing(slideAnim, {
          toValue: 0,
          duration: 180,
          useNativeDriver: true,
        }),
      ]).start();
    }, [fadeAnim, slideAnim]),
  );

  return (
    <SafeAreaView style={styles.safeArea}>
      <KeyboardAvoidingView
        style={styles.keyboardWrap}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <ScrollView
          contentContainerStyle={styles.content}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="on-drag"
        >
          <Animated.View
            style={{
              opacity: fadeAnim,
              transform: [{ translateY: slideAnim }],
            }}
          >
            <Text style={styles.title}>{title}</Text>
            {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
            <View style={styles.body}>{children}</View>
          </Animated.View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#f7f9fc',
  },
  keyboardWrap: {
    flex: 1,
  },
  content: {
    padding: 16,
    paddingBottom: 40,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: '#1a202c',
  },
  subtitle: {
    marginTop: 6,
    fontSize: 14,
    color: '#4a5568',
  },
  body: {
    marginTop: 16,
    gap: 12,
  },
});
