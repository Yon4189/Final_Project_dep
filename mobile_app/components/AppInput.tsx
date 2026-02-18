// components/AppInput.tsx
import React from 'react';
import { StyleSheet, Text, TextInput, View } from 'react-native';
import { Colors } from '@/app/constants/Colors';
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
                  multiline = false, // Add default
                  style, // Add this
                  inputStyle, // Add this
                  leftIcon, // Add this
                  autoCapitalize = 'none',
                  autoCorrect = false,
                  maxLength, // Add this
                }) => {
                  return (
                    <View style={[styles.container, style]}>
                      {label && (
                        <Text style={styles.label}>
                          {label}
                          {required && <Text style={styles.required}> *</Text>}
                        </Text>
                      )}
                      <View style={styles.inputContainer}>
                        {leftIcon && <View style={styles.iconContainer}>{leftIcon}</View>}
                        <TextInput
                          style={[
                            styles.input, 
                            leftIcon && styles.inputWithIcon,
                            error && styles.inputError,
                            multiline && styles.multilineInput,
                            inputStyle
                            
                          ]}
                          value={value}
                          onChangeText={onChangeText}
                          placeholder={placeholder}
                          secureTextEntry={secureTextEntry}
                          keyboardType={keyboardType}
                          placeholderTextColor="#999"
                          multiline={multiline}
                          autoCapitalize={autoCapitalize}
                          autoCorrect={autoCorrect}
                          maxLength={maxLength}
                        />
                      </View>
                        {error && <Text style={styles.errorText}>{error}</Text>}
                      </View>
                    );
                  };
export default AppInput;