import React, { useEffect, useState } from 'react';
import { TouchableOpacity, Text, StyleSheet, Platform } from 'react-native';
import { useTranslation } from 'react-i18next';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useTheme } from '../app/context/ThemeContext';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export default function LanguageToggleButton() {
  const { i18n } = useTranslation();
  const { colors } = useTheme();
  // Using a local state to rapidly force re-render across the component
  const [currentLang, setCurrentLang] = useState(i18n.language || 'en');
  const insets = useSafeAreaInsets();

  useEffect(() => {
    // When linguistic updates happen outside
    setCurrentLang(i18n.language);
  }, [i18n.language]);

  const toggleLanguage = async () => {
    const newLang = currentLang === 'en' ? 'am' : 'en';
    await i18n.changeLanguage(newLang);
    await AsyncStorage.setItem('@app_language', newLang);
    setCurrentLang(newLang);
  };

  // Add safe top margin ensuring it doesn't overlap statusbar
  const topPadding = Platform.OS === 'ios' ? Math.max(insets.top, 20) : insets.top + 10;

  return (
    <TouchableOpacity 
      style={[
        styles.button, 
        { 
          backgroundColor: colors.primary, 
          top: topPadding,
        }
      ]} 
      onPress={toggleLanguage}
    >
      <Text style={[styles.text, { color: '#FFF' }]}>
        {currentLang === 'en' ? 'አማ' : 'EN'}
      </Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  button: {
    position: 'absolute',
    right: 20,
    zIndex: 9999, // Ensure it floats on top of all screens
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
  },
  text: {
    fontWeight: 'bold',
    fontSize: 14,
  }
});
