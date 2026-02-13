// components/AppButton.tsx - MINIMAL CHANGES
import React from 'react';
import { ActivityIndicator, StyleSheet, Text, TextStyle, TouchableOpacity, ViewStyle } from 'react-native';
import { Colors } from '@/app/constants/Colors';
interface AppButtonProps {
  title: string;
  onPress: () => void;
  variant?: 'primary' | 'secondary' | 'outline';
  size?: 'small' | 'medium' | 'large'; // ADD THIS LINE
  loading?: boolean;
  disabled?: boolean;
  fullWidth?: boolean;
  style?: ViewStyle;
}

const AppButton: React.FC<AppButtonProps> = ({
  title,
  onPress,
  variant = 'primary',
  size = 'medium', // ADD DEFAULT VALUE
  loading = false,
  disabled = false,
  fullWidth = false,
  style,
}) => {
  const getButtonStyle = (): ViewStyle => {
    // ADD SIZE LOGIC
    const getSizePadding = () => {
      switch (size) {
        case 'small': return { paddingVertical: 8, paddingHorizontal: 16 };
        case 'large': return { paddingVertical: 20, paddingHorizontal: 32 };
        default: return { paddingVertical: 16, paddingHorizontal: 24 };
      }
    };
    
    const getMinHeight = () => {
      switch (size) {
        case 'small': return 36;
        case 'large': return 56;
        default: return 50;
      }
    };

    const sizePadding = getSizePadding();
    const minHeight = getMinHeight();

    switch (variant) {
      case 'primary':
        return {
          backgroundColor: Colors.primary,
          ...sizePadding,
          borderRadius: 10,
          alignItems: 'center',
          justifyContent: 'center',
          elevation: 3,
          shadowColor: '#000',
          shadowOffset: { width: 0, height: 2 },
          shadowOpacity: 0.1,
          shadowRadius: 4,
          minHeight: minHeight,
        };
      case 'secondary':
        return {
          backgroundColor: Colors.secondary,
          ...sizePadding,
          borderRadius: 10,
          alignItems: 'center',
          justifyContent: 'center',
          elevation: 3,
          shadowColor: '#000',
          shadowOffset: { width: 0, height: 2 },
          shadowOpacity: 0.1,
          shadowRadius: 4,
          minHeight: minHeight,
        };
      case 'outline':
        return {
          backgroundColor: 'transparent',
          ...sizePadding,
          borderRadius: 10,
          alignItems: 'center',
          justifyContent: 'center',
          borderWidth: 2,
          borderColor: Colors.primary,
          minHeight: minHeight,
        };
      default:
        return {
          backgroundColor: Colors.primary,
          ...sizePadding,
          borderRadius: 10,
          alignItems: 'center',
          justifyContent: 'center',
          elevation: 3,
          shadowColor: '#000',
          shadowOffset: { width: 0, height: 2 },
          shadowOpacity: 0.1,
          shadowRadius: 4,
          minHeight: minHeight,
        };
    }
  };

  const getTextStyle = (): TextStyle => {
    // ADD TEXT SIZE LOGIC
    const getFontSize = () => {
      switch (size) {
        case 'small': return 14;
        case 'large': return 18;
        default: return 16;
      }
    };

    const fontSize = getFontSize();

    switch (variant) {
      case 'primary':
        return {
          color: Colors.text.light,
          fontSize: fontSize,
          fontWeight: 'bold',
          textAlign: 'center',
        };
      case 'secondary':
        return {
          color: Colors.text.light,
          fontSize: fontSize,
          fontWeight: 'bold',
          textAlign: 'center',
        };
      case 'outline':
        return {
          color: Colors.primary,
          fontSize: fontSize,
          fontWeight: 'bold',
          textAlign: 'center',
        };
      default:
        return {
          color: Colors.text.light,
          fontSize: fontSize,
          fontWeight: 'bold',
          textAlign: 'center',
        };
    }
  };

  return (
    <TouchableOpacity
      style={[
        getButtonStyle(),
        (disabled || loading) && styles.disabledButton,
        fullWidth && styles.fullWidth,
        style,
      ]}
      onPress={onPress}
      disabled={disabled || loading}
      activeOpacity={0.8}
    >
      {loading ? (
        <ActivityIndicator color={variant === 'outline' ? Colors.primary : '#fff'} />
      ) : (
        <Text style={getTextStyle()}>{title}</Text>
      )}
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  disabledButton: {
    opacity: 0.6,
  },
  fullWidth: {
    width: '100%',
  },
});

export default AppButton;