import { useState, useCallback } from 'react';

// Safely try to import the native module to prevent crashes in Expo Go
let SpeechModule: any = null;
let useSpeechEvent: any = (event: string, callback: Function) => {};

try {
  const SpeechLib = require('expo-speech-recognition');
  SpeechModule = SpeechLib.ExpoSpeechRecognitionModule;
  useSpeechEvent = SpeechLib.useSpeechRecognitionEvent;
} catch (e) {
  // Module not found, likely running in Expo Go
}

export const useVoiceRecognition = () => {
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [error, setError] = useState<string | null>(null);

  // Use the event hook only if it's valid
  if (SpeechModule) {
    useSpeechEvent('start', () => {
      setIsListening(true);
      setError(null);
    });
    
    useSpeechEvent('end', () => {
      setIsListening(false);
    });
    
    useSpeechEvent('result', (event: any) => {
      if (event.results && event.results.length > 0) {
        setTranscript(event.results[0].transcript);
      }
    });
    
    useSpeechEvent('error', (event: any) => {
      console.error('Speech recognition error:', event);
      setError(event.error || 'Speech recognition error');
      setIsListening(false);
    });
  }

  const startListening = useCallback(async (lang: string = 'en-US') => {
    try {
      if (!SpeechModule) {
        console.warn('Speech recognition is not supported in this environment (likely Expo Go). Please use a development build.');
        setError('Speech recognition is not supported in Expo Go. Use a development build.');
        return false;
      }

      const result = await SpeechModule.requestPermissionsAsync();
      if (!result.granted) {
        setError('Microphone permission denied');
        return false;
      }
      
      setTranscript('');
      await SpeechModule.start({
        lang,
        interimResults: true,
      });
      return true;
    } catch (err: any) {
      console.error('Failed to start speech recognition:', err);
      setError(err.message || 'Failed to start speech recognition');
      return false;
    }
  }, []);

  const stopListening = useCallback(async () => {
    try {
      if (SpeechModule) {
        await SpeechModule.stop();
      }
    } catch (err: any) {
      console.error('Failed to stop speech recognition:', err);
      setError(err.message || 'Failed to stop speech recognition');
    }
  }, []);

  return {
    isListening,
    transcript,
    error,
    startListening,
    stopListening,
  };
};
