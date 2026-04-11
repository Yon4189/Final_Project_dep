import 'intl-pluralrules';
import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import * as Localization from 'expo-localization';
import AsyncStorage from '@react-native-async-storage/async-storage';
import en from './locales/en.json';
import am from './locales/am.json';

const LANGUAGE_STORE_KEY = '@app_language';

const resources = {
  en: { translation: en },
  am: { translation: am },
};

// Function to initialize i18n async
const initI18n = async () => {
  let savedLanguage = await AsyncStorage.getItem(LANGUAGE_STORE_KEY);
  
  if (!savedLanguage) {
    // Wait, the user asked for a manual toggle. We can still try to detect first.
    // getLocales() returns an array, the first one is the best match.
    const deviceLocales = Localization.getLocales();
    const deviceLanguage = deviceLocales[0]?.languageCode;
    
    // Default to 'am' if device is Amharic, otherwise 'en'
    savedLanguage = deviceLanguage === 'am' ? 'am' : 'en';
  }

  i18n
    .use(initReactI18next)
    .init({
      resources,
      lng: savedLanguage,
      fallbackLng: 'en',
      interpolation: {
        escapeValue: false, // react already safes from xss
      },
    });
};

initI18n();

export default i18n;
