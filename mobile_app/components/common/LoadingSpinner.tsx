// components/common/LoadingSpinner.tsx
import React, { useMemo } from 'react';
import {
  View,
  ActivityIndicator,
  Text,
  StyleSheet,
  ViewStyle,
} from 'react-native';
import { useTheme } from '@/app/context/ThemeContext';
import { ThemeColors } from '@/app/constants/Colors';

interface LoadingSpinnerProps {
  size?: 'small' | 'large';
  color?: string;
  text?: string;
  fullScreen?: boolean;
  style?: ViewStyle;
}

export const LoadingSpinner: React.FC<LoadingSpinnerProps> = ({
  size = 'large',
  color,
  text,
  fullScreen = false,
  style,
}) => {
  const { colors } = useTheme();
  const styles = useMemo(() => getStyles(colors), [colors]);
  const spinnerColor = color || colors.primary;

  if (fullScreen) {
    return (
      <View style={[styles.fullScreenContainer, style]}>
        <ActivityIndicator size={size} color={spinnerColor} />
        {text && <Text style={styles.text}>{text}</Text>}
      </View>
    );
  }

  return (
    <View style={[styles.container, style]}>
      <ActivityIndicator size={size} color={spinnerColor} />
      {text && <Text style={styles.text}>{text}</Text>}
    </View>
  );
};

const getStyles = (colors: ThemeColors) => StyleSheet.create({
  container: {
    padding: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  fullScreenContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.background,
  },
  text: {
    marginTop: 12,
    fontSize: 14,
    color: colors.text.secondary,
    textAlign: 'center',
  },
});