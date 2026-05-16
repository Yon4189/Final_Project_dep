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
  Platform,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { Colors } from '@/app/constants/Colors';
import { providerService } from '@/app/services/provider.service';

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
  const { t } = useTranslation();
  const [schedule, setSchedule] = useState<ScheduleDay[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    fetchSchedule();
  }, []);

  const fetchSchedule = async () => {
    try {
      const response = await providerService.getSchedule();
      if (response.success && response.data) {
        setSchedule(response.data);
      } else {
        Alert.alert(t('common.error', 'Error'), response.message || t('profile.scheduleLoadError', 'Failed to load schedule'));
      }
    } catch (error: any) {
      Alert.alert(t('common.error', 'Error'), error.message || t('login.networkError', 'Network error'));
    } finally {
      setIsLoading(false);
    }
  };

  const saveSchedule = async () => {
    setIsSaving(true);
    try {
      const response = await providerService.updateSchedule(schedule);
      if (response.success) {
        Alert.alert(t('common.success', 'Success'), t('profile.scheduleUpdated', 'Working hours updated successfully'), [
          { text: t('common.ok', 'OK'), onPress: () => router.back() }
        ]);
      } else {
        Alert.alert(t('common.error', 'Validation Error'), response.message || t('profile.timeFormatAdvice', 'Check your times (HH:MM format). End time must be after start time.'));
      }
    } catch (error: any) {
      Alert.alert(t('common.error', 'Error'), error.message || t('profile.saveError', 'Network error while saving'));
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
          <Text style={styles.headerTitle}>{t('profile.configureScheduleTitle', 'Configure Standard Schedule')}</Text>
          <View style={{ width: 24 }} />
        </View>
      </View>

      <ScrollView style={styles.scrollContent}>
        <Text style={styles.subtitle}>
          {t('profile.scheduleSubtitle', 'Set your standard weekly working hours. Our system will generate 1-hour slots inside these ranges for customers to book!')}
        </Text>

        {WEEKDAYS.map((dayName, index) => {
          const dayData = schedule.find(s => s.day_of_week === index);
          if (!dayData) return null;

          return (
            <View key={index} style={[styles.dayCard, !dayData.is_active && styles.dayCardInactive]}>
              <View style={styles.dayHeader}>
                <Text style={styles.dayTitle}>{t(`profile.weekdays.${dayName.toLowerCase()}`, dayName)}</Text>
                <Switch
                  value={dayData.is_active}
                  onValueChange={(val) => updateDay(index, 'is_active', val)}
                  trackColor={{ false: Colors.border, true: Colors.primary }}
                />
              </View>

              {dayData.is_active && (
                <View style={styles.inputsRow}>
                  <View style={styles.inputGroup}>
                    <Text style={styles.inputLabel}>{t('profile.startTimeLabel', 'Start Time')}</Text>
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
                    <Text style={styles.inputLabel}>{t('profile.endTimeLabel', 'End Time')}</Text>
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
            <Text style={styles.saveButtonText}>{t('profile.saveSchedule', 'Save Schedule')}</Text>
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
