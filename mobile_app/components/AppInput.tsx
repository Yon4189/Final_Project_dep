// components/AppInput.tsx
import React, { useState } from 'react';
import { StyleSheet, Text, TextInput, View, TouchableOpacity } from 'react-native';
import { Colors } from '@/app/constants/Colors';
import { Ionicons } from '@expo/vector-icons';
const styles = StyleSheet.create({
  container: {
    marginBottom: 20,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.text.primary,
    marginBottom: 8,
  },
  required: {
    color: Colors.error,
  },
  inputContainer: {
    position: 'relative',
    flexDirection: 'row',
    alignItems: 'center',
  },
  iconContainer: {
    position: 'absolute',
    left: 15,
    zIndex: 1,
  },
  rightIconContainer: {
    position: 'absolute',
    right: 15,
    zIndex: 1,
  },
  input: {
    backgroundColor: Colors.background,
    padding: 15,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: Colors.border,
    fontSize: 16,
    color: Colors.text.primary,
    width: '100%',
  },
  inputWithIcon: {
    paddingLeft: 45,
  },
  inputWithRightIcon: {
    paddingRight: 45,
  },
  inputError: {
    borderColor: Colors.error,
  },
  multilineInput: {
    minHeight: 80,
    textAlignVertical: 'top',
  },
  errorText: {
    color: Colors.error,
    fontSize: 12,
    marginTop: 5,
  },
});
interface AppInputProps {
  label?: string;
  value: string;
  onChangeText: (text: string) => void;
  placeholder?: string;
  secureTextEntry?: boolean;
  keyboardType?: 'default' | 'email-address' | 'numeric' | 'phone-pad';
  error?: string;
  required?: boolean;
  multiline?: boolean;
  style?: any;
  maxLength?: number;
  inputStyle?: any;
  leftIcon?: React.ReactNode;
  autoCapitalize?: 'none' | 'sentences' | 'words' | 'characters';
  autoCorrect?: boolean;
  showPasswordToggle?: boolean;
}
const AppInput: React.FC<AppInputProps> = ({
  label,
  value,
  onChangeText,
  placeholder,
  secureTextEntry = false,
  keyboardType = 'default',
  error,
  required = false,
  multiline = false,
  style,
  inputStyle,
  leftIcon,
  autoCapitalize = 'none',
  autoCorrect = false,
  maxLength,
  showPasswordToggle = false,
}) => {
  const [isPasswordVisible, setIsPasswordVisible] = useState(false);

  const isSecure = secureTextEntry && !isPasswordVisible;
  const showToggle = secureTextEntry && showPasswordToggle;
  return (
    <View style={[styles.container, style]}>
      {label ? (
        <Text style={styles.label}>
          <Text>{label}</Text>
          {required ? <Text style={styles.required}> *</Text> : null}
        </Text>
      ) : null}
      <View style={styles.inputContainer}>
        {leftIcon ? (
          <View style={styles.iconContainer}>
            {leftIcon}
          </View>
        ) : null}
        <TextInput
          value={value}
          onChangeText={onChangeText}
          placeholder={placeholder}
          secureTextEntry={isSecure}
          keyboardType={keyboardType}
          placeholderTextColor="#999"
          multiline={multiline}
          autoCapitalize={autoCapitalize}
          autoCorrect={autoCorrect}
          maxLength={maxLength}
          style={[
            styles.input,
            leftIcon && styles.inputWithIcon,
            showToggle && styles.inputWithRightIcon,
            error && styles.inputError,
            multiline && styles.multilineInput,
            inputStyle
          ]}
        />
        {showToggle ? (
          <TouchableOpacity 
            style={styles.rightIconContainer}
            onPress={() => setIsPasswordVisible(!isPasswordVisible)}
          >
            <Ionicons 
              name={isPasswordVisible ? "eye-off-outline" : "eye-outline"} 
              size={20} 
              color={Colors.text.secondary} 
            />
          </TouchableOpacity>
        ) : null}
      </View>
      {error ? (
        <Text style={styles.errorText}>
          <Text>{String(error)}</Text>
        </Text>
      ) : null}
    </View>
  );
};

export default AppInput;
