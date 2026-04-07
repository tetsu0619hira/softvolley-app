import { ReactNode } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

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
  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
      <KeyboardAvoidingView
        style={styles.keyboardWrap}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <ScrollView
          contentContainerStyle={styles.content}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="on-drag"
        >
          <Text style={styles.title}>{title}</Text>
          {subtitle && false ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
          <View style={styles.body}>{children}</View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#eef3fb',
  },
  keyboardWrap: {
    flex: 1,
  },
  content: {
    padding: 16,
    paddingBottom: 40,
  },
  title: {
    fontSize: 26,
    fontWeight: '700',
    color: '#21314d',
  },
  subtitle: {
    marginTop: 10,
    fontSize: 14,
    color: '#6279a3',
  },
  body: {
    marginTop: 10,
    gap: 16,
  },
});
