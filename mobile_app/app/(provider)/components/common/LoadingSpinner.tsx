// components/common/LoadingSpinner.tsx
import React from 'react';
import {
  View,
  ActivityIndicator,
  Text,
  StyleSheet,
  Modal,
  Dimensions,
} from 'react-native';
import { Colors } from '@/app/constants/Colors';
import { BlurView } from 'expo-blur';

const { width, height } = Dimensions.get('window');

interface LoadingSpinnerProps {
  visible?: boolean;
  text?: string;
  fullScreen?: boolean;
  size?: 'small' | 'large';
  overlay?: boolean;
  transparent?: boolean;
  blurIntensity?: number;
  backgroundColor?: string;
}

export const LoadingSpinner: React.FC<LoadingSpinnerProps> = ({
  visible = true,
  text,
  fullScreen = false,
  size = 'large',
  overlay = false,
  transparent = false,
  blurIntensity = 50,
  backgroundColor,
}) => {
  if (!visible) return null;

  const SpinnerContent = (
    <View style={[
      styles.container,
      fullScreen && styles.fullScreen,
      transparent && styles.transparent,
      backgroundColor && { backgroundColor },
    ]}>
      {overlay ? (
        <BlurView intensity={blurIntensity} tint="dark" style={styles.blurContainer}>
          <View style={styles.spinnerBox}>
            <ActivityIndicator size={size} color={Colors.primary} />
            {text && <Text style={styles.text}>{text}</Text>}
          </View>
        </BlurView>
      ) : (
        <View style={[styles.spinnerBox, !fullScreen && styles.inlineSpinnerBox]}>
          <ActivityIndicator size={size} color={Colors.primary} />
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
  style?: any;
  animate?: boolean;
}

export const Skeleton: React.FC<SkeletonProps> = ({
  width = '100%',
  height = 20,
  borderRadius = 4,
  style,
  animate = true,
}) => {
  return (
    <View
      style={[
        styles.skeleton,
        {
          width,
          height,
          borderRadius,
        },
        animate && styles.skeletonPulse,
        style,
      ]}
    />
  );
};

export const SkeletonCircle: React.FC<{ size?: number; style?: any }> = ({
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

// Specialized skeleton loaders
export const SkeletonProfile: React.FC = () => (
  <View style={styles.skeletonProfile}>
    <View style={styles.skeletonProfileHeader}>
      <SkeletonCircle size={80} />
      <View style={styles.skeletonProfileHeaderText}>
        <Skeleton width={200} height={24} />
        <Skeleton width={150} height={18} style={{ marginTop: 8 }} />
      </View>
    </View>
    <View style={styles.skeletonProfileBody}>
      <Skeleton width="100%" height={50} borderRadius={8} />
      <Skeleton width="100%" height={100} borderRadius={8} style={{ marginTop: 12 }} />
    </View>
  </View>
);

export const SkeletonRequestCard: React.FC = () => (
  <View style={styles.skeletonRequestCard}>
    <View style={styles.skeletonRequestHeader}>
      <SkeletonCircle size={40} />
      <View style={styles.skeletonRequestHeaderText}>
        <Skeleton width={120} height={16} />
        <Skeleton width={80} height={14} style={{ marginTop: 4 }} />
      </View>
    </View>
    <Skeleton width="100%" height={60} borderRadius={8} style={{ marginTop: 12 }} />
    <View style={styles.skeletonRequestFooter}>
      <Skeleton width={60} height={24} borderRadius={12} />
      <Skeleton width={80} height={24} borderRadius={12} />
    </View>
  </View>
);

export const SkeletonChart: React.FC = () => (
  <View style={styles.skeletonChart}>
    <Skeleton width="100%" height={200} borderRadius={8} />
  </View>
);

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: Colors.surface,
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
    backgroundColor: Colors.surface,
    borderRadius: 16,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 5,
  },
  inlineSpinnerBox: {
    padding: 20,
    backgroundColor: Colors.surface,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  text: {
    marginTop: 12,
    fontSize: 14,
    color: Colors.text.secondary,
    textAlign: 'center',
  },
  // Skeleton Styles
  skeleton: {
    backgroundColor: Colors.skeleton,
    overflow: 'hidden',
  },
  skeletonPulse: {
    opacity: 0.7,
  },
  skeletonCard: {
    backgroundColor: Colors.surface,
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: Colors.border,
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
  skeletonProfile: {
    padding: 20,
  },
  skeletonProfileHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
  },
  skeletonProfileHeaderText: {
    flex: 1,
    marginLeft: 16,
  },
  skeletonProfileBody: {
    marginTop: 20,
  },
  skeletonRequestCard: {
    backgroundColor: Colors.surface,
    borderRadius: 12,
    padding: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  skeletonRequestHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  skeletonRequestHeaderText: {
    marginLeft: 12,
  },
  skeletonRequestFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 12,
  },
  skeletonChart: {
    padding: 16,
  },
});