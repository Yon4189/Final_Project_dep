import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Switch,
  TextInput,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '@/app/constants/Colors';
import * as SecureStore from 'expo-secure-store';
import Constants from 'expo-constants';
import { Platform } from 'react-native';

const getApiUrl = (): string => {
  if (process.env.EXPO_PUBLIC_API_URL) return process.env.EXPO_PUBLIC_API_URL;
  if (__DEV__) {
    const hostUri = Constants.expoConfig?.hostUri;
    if (hostUri) {
      return `http://${hostUri.split(':')[0]}:8000/api`;
    }
    if (Platform.OS === 'android') return 'http://10.0.2.2:8000/api';
  }
  return 'http://127.0.0.1:8000/api';
};

const API_URL = getApiUrl();

const WEEKDAYS = [
  'Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'
];

interface ScheduleDay {
  day_of_week: number;
  start_time: string;
  end_time: string;
  is_active: boolean;
}

export default function ManageScheduleScreen() {
  const router = useRouter();
  const [schedule, setSchedule] = useState<ScheduleDay[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    fetchSchedule();
  }, []);

  const fetchSchedule = async () => {
    try {
      const token = await SecureStore.getItemAsync('user_token');
      const response = await fetch(`${API_URL}/provider/schedule`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Accept': 'application/json'
        }
      });
      const json = await response.json();
      if (json.success) {
        setSchedule(json.data);
      } else {
        Alert.alert('Error', json.message || 'Failed to load schedule');
      }
    } catch (error) {
      Alert.alert('Error', 'Network error');
    } finally {
      setIsLoading(false);
    }
  };

  const saveSchedule = async () => {
    setIsSaving(true);
    try {
      const token = await SecureStore.getItemAsync('user_token');
      const response = await fetch(`${API_URL}/provider/schedule`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
          'Accept': 'application/json'
        },
        body: JSON.stringify({ schedule })
      });
      const json = await response.json();
      if (json.success) {
        Alert.alert('Success', 'Working hours updated successfully', [
          { text: 'OK', onPress: () => router.back() }
        ]);
      } else {
        Alert.alert('Validation Error', json.message || 'Check your times (HH:MM format). End time must be after start time.');
      }
    } catch (error) {
      Alert.alert('Error', 'Network error while saving');
    } finally {
      setIsSaving(false);
    }
  };

  const updateDay = (dayIndex: number, field: keyof ScheduleDay, value: any) => {
    setSchedule(prev => prev.map((day) => {
      if (day.day_of_week === dayIndex) {
        return { ...day, [field]: value };
      }
      return day;
    }));
  };

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={Colors.primary} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerTop}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color={Colors.text.primary} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Configure Standard Schedule</Text>
          <View style={{ width: 24 }} />
        </View>
      </View>

      <ScrollView style={styles.scrollContent}>
        <Text style={styles.subtitle}>
          Set your standard weekly working hours. Our system will generate 1-hour slots inside these ranges for customers to book!
        </Text>

        {WEEKDAYS.map((dayName, index) => {
          const dayData = schedule.find(s => s.day_of_week === index);
          if (!dayData) return null;

          return (
            <View key={index} style={[styles.dayCard, !dayData.is_active && styles.dayCardInactive]}>
              <View style={styles.dayHeader}>
                <Text style={styles.dayTitle}>{dayName}</Text>
                <Switch
                  value={dayData.is_active}
                  onValueChange={(val) => updateDay(index, 'is_active', val)}
                  trackColor={{ false: Colors.border, true: Colors.primary }}
                />
              </View>

              {dayData.is_active && (
                <View style={styles.inputsRow}>
                  <View style={styles.inputGroup}>
                    <Text style={styles.inputLabel}>Start Time</Text>
                    <TextInput
                      style={styles.timeInput}
                      value={dayData.start_time}
                      onChangeText={(val) => updateDay(index, 'start_time', val)}
                      placeholder="08:00"
                      maxLength={5}
                      keyboardType="numbers-and-punctuation"
                    />
                  </View>
                  <Ionicons name="arrow-forward" size={20} color={Colors.text.secondary} style={{ marginTop: 24 }} />
                  <View style={styles.inputGroup}>
                    <Text style={styles.inputLabel}>End Time</Text>
                    <TextInput
                      style={styles.timeInput}
                      value={dayData.end_time}
                      onChangeText={(val) => updateDay(index, 'end_time', val)}
                      placeholder="17:00"
                      maxLength={5}
                      keyboardType="numbers-and-punctuation"
                    />
                  </View>
                </View>
              )}
            </View>
          );
        })}
      </ScrollView>

      <View style={styles.footer}>
        <TouchableOpacity 
          style={styles.saveButton} 
          onPress={saveSchedule}
          disabled={isSaving}
        >
          {isSaving ? (
            <ActivityIndicator color={Colors.surface} />
          ) : (
            <Text style={styles.saveButtonText}>Save Schedule</Text>
          )}
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center'
  },
  header: {
    paddingTop: Platform.OS === 'ios' ? 50 : 30,
    backgroundColor: Colors.surface,
    paddingBottom: 15,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  headerTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
  },
  backButton: {
    padding: 5,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: Colors.text.primary,
  },
  scrollContent: {
    padding: 20,
  },
  subtitle: {
    fontSize: 14,
    color: Colors.text.secondary,
    marginBottom: 20,
    lineHeight: 20,
  },
  dayCard: {
    backgroundColor: Colors.surface,
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  dayCardInactive: {
    opacity: 0.6,
    backgroundColor: Colors.background,
  },
  dayHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  dayTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.text.primary,
  },
  inputsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
  },
  inputGroup: {
    flex: 1,
  },
  inputLabel: {
    fontSize: 12,
    color: Colors.text.secondary,
    marginBottom: 8,
  },
  timeInput: {
    backgroundColor: Colors.background,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    color: Colors.text.primary,
    textAlign: 'center',
  },
  footer: {
    padding: 20,
    backgroundColor: Colors.surface,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
  },
  saveButton: {
    backgroundColor: Colors.primary,
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  saveButtonText: {
    color: Colors.surface,
    fontSize: 16,
    fontWeight: 'bold',
  },
});
