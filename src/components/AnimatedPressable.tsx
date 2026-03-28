import { ReactNode, useRef } from 'react';
import {
  Animated,
  Pressable,
  PressableProps,
  StyleProp,
  ViewStyle,
} from 'react-native';

interface AnimatedPressableProps extends Omit<PressableProps, 'style'> {
  children: ReactNode;
  style?: StyleProp<ViewStyle>;
}

export default function AnimatedPressable({
  children,
  style,
  onPressIn,
  onPressOut,
  ...props
}: AnimatedPressableProps) {
  const opacityAnim = useRef(new Animated.Value(1)).current;
  const scaleAnim = useRef(new Animated.Value(1)).current;

  const animateIn = () => {
    Animated.parallel([
      Animated.timing(opacityAnim, {
        toValue: 0.28,
        duration: 80,
        useNativeDriver: true,
      }),
      Animated.timing(scaleAnim, {
        toValue: 0.96,
        duration: 80,
        useNativeDriver: true,
      }),
    ]).start();
  };

  const animateOut = () => {
    Animated.parallel([
      Animated.timing(opacityAnim, {
        toValue: 1,
        duration: 150,
        useNativeDriver: true,
      }),
      Animated.spring(scaleAnim, {
        toValue: 1,
        speed: 18,
        bounciness: 8,
        useNativeDriver: true,
      }),
    ]).start();
  };

  return (
    <Animated.View style={{ opacity: opacityAnim, transform: [{ scale: scaleAnim }] }}>
      <Pressable
        {...props}
        style={style}
        onPressIn={(event) => {
          animateIn();
          onPressIn?.(event);
        }}
        onPressOut={(event) => {
          animateOut();
          onPressOut?.(event);
        }}
      >
        {children}
      </Pressable>
    </Animated.View>
  );
}
