import { useState, useCallback } from 'react';
import { 
  ExpoSpeechRecognitionModule, 
  useSpeechRecognitionEvent 
} from 'expo-speech-recognition';

export const useVoiceRecognition = () => {
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [error, setError] = useState<string | null>(null);

  useSpeechRecognitionEvent('start', () => {
    setIsListening(true);
    setError(null);
  });
  
  useSpeechRecognitionEvent('end', () => {
    setIsListening(false);
  });
  
  useSpeechRecognitionEvent('result', (event) => {
    if (event.results && event.results.length > 0) {
      setTranscript(event.results[0].transcript);
    }
  });
  
  useSpeechRecognitionEvent('error', (event) => {
    console.error('Speech recognition error:', event);
    setError(event.error || 'Speech recognition error');
    setIsListening(false);
  });

  const startListening = useCallback(async (lang: string = 'en-US') => {
    try {
      if (!ExpoSpeechRecognitionModule) {
        console.warn('Speech recognition is not supported in this environment (likely Expo Go). Please use a development build.');
        setError('Speech recognition is not supported in Expo Go. Use a development build.');
        return false;
      }

      const result = await ExpoSpeechRecognitionModule.requestPermissionsAsync();
      if (!result.granted) {
        setError('Microphone permission denied');
        return false;
      }
      
      setTranscript('');
      await ExpoSpeechRecognitionModule.start({
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
      await ExpoSpeechRecognitionModule.stop();
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
