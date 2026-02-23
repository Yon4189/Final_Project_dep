// components/common/LoadingSpinner.tsx
import React from 'react';
import {
  View,
  ActivityIndicator,
  Text,
  StyleSheet,
  Modal,
  Dimensions,
  ViewStyle,
} from 'react-native';
import { BlurView } from 'expo-blur';

// Define local colors to avoid import issues
const LOCAL_COLORS = {
  primary: '#4F46E5',
  surface: '#FFFFFF',
  text: {
    secondary: '#6B7280',
  },
  border: '#E5E7EB',
  skeleton: '#E1E9EE',
};

// Try to import Colors, but use local fallback if it fails
let Colors: any;
try {
  Colors = require('@/app/constants/Colors').Colors;
} catch (e) {
  Colors = LOCAL_COLORS;
}

const { width: screenWidth, height: screenHeight } = Dimensions.get('window');

interface LoadingSpinnerProps {
  visible?: boolean;
  text?: string;
  fullScreen?: boolean;
  size?: 'small' | 'large';
  overlay?: boolean;
  transparent?: boolean;
  blurIntensity?: number;
}

export const LoadingSpinner: React.FC<LoadingSpinnerProps> = ({
  visible = true,
  text,
  fullScreen = false,
  size = 'large',
  overlay = false,
  transparent = false,
  blurIntensity = 50,
}) => {
  if (!visible) return null;

  const SpinnerContent = (
    <View style={[
      styles.container,
      fullScreen && styles.fullScreen,
      transparent && styles.transparent,
    ]}>
      {overlay ? (
        <BlurView intensity={blurIntensity} tint="dark" style={styles.blurContainer}>
          <View style={styles.spinnerBox}>
            <ActivityIndicator size={size} color={Colors?.primary || LOCAL_COLORS.primary} />
            {text && <Text style={styles.text}>{text}</Text>}
          </View>
        </BlurView>
      ) : (
        <View style={styles.spinnerBox}>
          <ActivityIndicator size={size} color={Colors?.primary || LOCAL_COLORS.primary} />
          {text && <Text style={styles.text}>{text}</Text>}
        </View>
      )}
    </View>
  );

  if (fullScreen) {
    return (
      <Modal
        visible={visible}
        transparent
        animationType="fade"
        statusBarTranslucent
      >
        {SpinnerContent}
      </Modal>
    );
  }

  return SpinnerContent;
};

// Skeleton Loader Components
interface SkeletonProps {
  width?: number | string;
  height?: number;
  borderRadius?: number;
  style?: ViewStyle;
}

export const Skeleton: React.FC<SkeletonProps> = ({
  width = '100%',
  height = 20,
  borderRadius = 4,
  style,
}) => {
  return (
    <View
      style={[
        styles.skeleton,
        {
          width: width as any,
          height,
          borderRadius,
        },
        style,
      ]}
    />
  );
};

export const SkeletonCircle: React.FC<{ size?: number; style?: ViewStyle }> = ({
  size = 40,
  style,
}) => (
  <Skeleton width={size} height={size} borderRadius={size / 2} style={style} />
);

export const SkeletonCard: React.FC = () => (
  <View style={styles.skeletonCard}>
    <View style={styles.skeletonCardHeader}>
      <SkeletonCircle size={50} />
      <View style={styles.skeletonCardHeaderText}>
        <Skeleton width={150} height={18} />
        <Skeleton width={100} height={14} style={{ marginTop: 8 }} />
      </View>
    </View>
    <View style={styles.skeletonCardBody}>
      <Skeleton width="100%" height={16} />
      <Skeleton width="90%" height={16} style={{ marginTop: 8 }} />
      <Skeleton width="80%" height={16} style={{ marginTop: 8 }} />
    </View>
    <View style={styles.skeletonCardFooter}>
      <Skeleton width={120} height={36} borderRadius={18} />
      <Skeleton width={80} height={36} borderRadius={18} />
    </View>
  </View>
);

export const SkeletonList: React.FC<{ count?: number }> = ({ count = 3 }) => (
  <View style={styles.skeletonList}>
    {Array.from({ length: count }).map((_, index) => (
      <SkeletonCard key={index} />
    ))}
  </View>
);

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: LOCAL_COLORS.surface,
  },
  fullScreen: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 9999,
  },
  transparent: {
    backgroundColor: 'transparent',
  },
  blurContainer: {
    flex: 1,
    width: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  spinnerBox: {
    padding: 24,
    backgroundColor: LOCAL_COLORS.surface,
    borderRadius: 16,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 5,
  },
  text: {
    marginTop: 12,
    fontSize: 14,
    color: LOCAL_COLORS.text.secondary,
    textAlign: 'center',
  },
  // Skeleton Styles
  skeleton: {
    backgroundColor: LOCAL_COLORS.skeleton,
    overflow: 'hidden',
  },
  skeletonCard: {
    backgroundColor: LOCAL_COLORS.surface,
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: LOCAL_COLORS.border,
  },
  skeletonCardHeader: {
    flexDirection: 'row',
    marginBottom: 16,
  },
  skeletonCardHeaderText: {
    flex: 1,
    marginLeft: 12,
    justifyContent: 'center',
  },
  skeletonCardBody: {
    marginBottom: 16,
  },
  skeletonCardFooter: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 12,
  },
  skeletonList: {
    padding: 20,
  },
});