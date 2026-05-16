// app/(provider)/requests/components/ScheduleModal.tsx
import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  ScrollView,
  Alert,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import DateTimePicker from '@react-native-community/datetimepicker';
import { Colors } from '../../constants/Colors';
import type { ServiceRequest } from '../../types/provider.types';

interface ScheduleModalProps {
  visible: boolean;
  onClose: () => void;
  onConfirm: (date: string, time: string, reason?: string) => void;
  request: ServiceRequest | null;
  type: 'reschedule' | 'reject';
  isLoading?: boolean;
}

const TIME_SLOTS = [
  '08:00', '09:00', '10:00', '11:00', '12:00',
  '13:00', '14:00', '15:00', '16:00', '17:00',
  '18:00', '19:00', '20:00',
];

const REJECT_REASONS = [
  'Schedule conflict',
  'Too far away',
  'Out of service area',
  'Not available on requested date',
  'Service not offered',
  'Emergency situation',
  'Other',
];

export const ScheduleModal: React.FC<ScheduleModalProps> = ({
  visible,
  onClose,
  onConfirm,
  request,
  type,
  isLoading = false,
}) => {
  const [step, setStep] = useState(1);
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [selectedTime, setSelectedTime] = useState('');
  const [selectedReason, setSelectedReason] = useState('');
  const [customReason, setCustomReason] = useState('');
  const [showDatePicker, setShowDatePicker] = useState(false);

  const handleDateChange = (event: any, date?: Date) => {
    setShowDatePicker(Platform.OS === 'ios');
    if (date) {
      setSelectedDate(date);
    }
  };

  const handleTimeSelect = (time: string) => {
    setSelectedTime(time);
  };

  const handleReasonSelect = (reason: string) => {
    setSelectedReason(reason);
  };

  const handleNext = () => {
    if (type === 'reject' && !selectedReason) {
      Alert.alert('Error', 'Please select a reason');
      return;
    }
    if (type === 'reschedule' && (!selectedDate || !selectedTime)) {
      Alert.alert('Error', 'Please select date and time');
      return;
    }
    setStep(2);
  };

  const handleBack = () => {
    setStep(1);
  };

  const handleConfirm = () => {
    if (type === 'reject') {
      const reason = selectedReason === 'Other' ? customReason : selectedReason;
      onConfirm('', '', reason);
    } else {
      const dateStr = selectedDate.toISOString().split('T')[0];
      onConfirm(dateStr, selectedTime);
    }
  };

  const handleClose = () => {
    setStep(1);
    setSelectedDate(new Date());
    setSelectedTime('');
    setSelectedReason('');
    setCustomReason('');
    onClose();
  };

  const formatDate = (date: Date) => {
    return date.toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  const renderStep1 = () => {
    if (type === 'reject') {
      return (
        <View style={styles.stepContainer}>
          <Text style={styles.stepTitle}>Why are you rejecting this request?</Text>
          <Text style={styles.stepSubtitle}>
            This helps us improve our service matching
          </Text>

          <ScrollView style={styles.reasonsList} showsVerticalScrollIndicator={false}>
            {REJECT_REASONS.map((reason) => (
              <TouchableOpacity
                key={reason}
                style={[
                  styles.reasonCard,
                  selectedReason === reason && styles.reasonCardSelected,
                ]}
                onPress={() => handleReasonSelect(reason)}
              >
                <View style={styles.reasonLeft}>
                  <Text style={styles.reasonText}>{reason}</Text>
                </View>
                <View style={styles.radioButton}>
                  {selectedReason === reason && <View style={styles.radioSelected} />}
                </View>
              </TouchableOpacity>
            ))}
          </ScrollView>

          {selectedReason === 'Other' && (
            <View style={styles.customReasonContainer}>
              <Text style={styles.customReasonLabel}>Please specify:</Text>
              <TextInput
                style={styles.customReasonInput}
                placeholder="Enter reason..."
                placeholderTextColor={Colors.text.secondary}
                value={customReason}
                onChangeText={setCustomReason}
                multiline
                numberOfLines={3}
              />
            </View>
          )}
        </View>
      );
    }

    return (
      <View style={styles.stepContainer}>
        <Text style={styles.stepTitle}>Reschedule Service</Text>
        <Text style={styles.stepSubtitle}>
          Select new date and time for this service
        </Text>

        {/* Date Selection */}
        <View style={styles.formGroup}>
          <Text style={styles.formLabel}>Date</Text>
          <TouchableOpacity
            style={styles.datePickerButton}
            onPress={() => setShowDatePicker(true)}
          >
            <Ionicons name="calendar-outline" size={20} color={Colors.primary} />
            <Text style={styles.dateText}>{formatDate(selectedDate)}</Text>
          </TouchableOpacity>
          {showDatePicker && (
            <DateTimePicker
              value={selectedDate}
              mode="date"
              display={Platform.OS === 'ios' ? 'spinner' : 'default'}
              onChange={handleDateChange}
              minimumDate={new Date()}
            />
          )}
        </View>

        {/* Time Selection */}
        <View style={styles.formGroup}>
          <Text style={styles.formLabel}>Time</Text>
          <ScrollView 
            horizontal 
            showsHorizontalScrollIndicator={false}
            style={styles.timeSlotsContainer}
          >
            {TIME_SLOTS.map((time) => (
              <TouchableOpacity
                key={time}
                style={[
                  styles.timeSlot,
                  selectedTime === time && styles.timeSlotSelected,
                ]}
                onPress={() => handleTimeSelect(time)}
              >
                <Text
                  style={[
                    styles.timeSlotText,
                    selectedTime === time && styles.timeSlotTextSelected,
                  ]}
                >
                  {time}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>

        {/* Current Schedule Info */}
        {request && (
          <View style={styles.currentSchedule}>
            <Text style={styles.currentScheduleTitle}>Currently scheduled:</Text>
            <Text style={styles.currentScheduleText}>
              {request.scheduledDate} at {request.scheduledTime}
            </Text>
          </View>
        )}
      </View>
    );
  };

  const renderStep2 = () => {
    if (type === 'reject') {
      const reason = selectedReason === 'Other' ? customReason : selectedReason;
      
      return (
        <View style={styles.stepContainer}>
          <View style={styles.successIcon}>
            <Ionicons name="alert-circle" size={60} color={Colors.error} />
          </View>
          
          <Text style={styles.confirmTitle}>Reject Request</Text>
          <Text style={styles.confirmSubtitle}>
            Are you sure you want to reject this request?
          </Text>

          <View style={styles.summaryCard}>
            <Text style={styles.summaryLabel}>Reason:</Text>
            <Text style={styles.summaryValue}>{reason}</Text>
          </View>

          <Text style={styles.warningText}>
            This action cannot be undone. The customer will be notified immediately.
          </Text>
        </View>
      );
    }

    return (
      <View style={styles.stepContainer}>
        <View style={styles.successIcon}>
          <Ionicons name="calendar" size={60} color={Colors.warning} />
        </View>
        
        <Text style={styles.confirmTitle}>Confirm Reschedule</Text>
        <Text style={styles.confirmSubtitle}>
          Please review the new schedule
        </Text>

        <View style={styles.summaryCard}>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>New Date:</Text>
            <Text style={styles.summaryValue}>
              {selectedDate.toLocaleDateString()}
            </Text>
          </View>
          
          <View style={styles.summaryDivider} />
          
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>New Time:</Text>
            <Text style={styles.summaryValue}>{selectedTime}</Text>
          </View>
          
          {request && (
            <>
              <View style={styles.summaryDivider} />
              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>Previous:</Text>
                <Text style={styles.summaryValue}>
                  {request.scheduledDate} at {request.scheduledTime}
                </Text>
              </View>
            </>
          )}
        </View>

        <Text style={styles.infoText}>
          The customer will be notified of this change and may need to confirm.
        </Text>
      </View>
    );
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent
      onRequestClose={handleClose}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          {/* Header */}
          <View style={styles.modalHeader}>
            <TouchableOpacity onPress={step === 1 ? handleClose : handleBack}>
              <Ionicons 
                name={step === 1 ? 'close' : 'arrow-back'} 
                size={24} 
                color={Colors.text.primary} 
              />
            </TouchableOpacity>
            <Text style={styles.modalTitle}>
              {type === 'reject' ? 'Reject Request' : 'Reschedule Service'}
            </Text>
            <View style={{ width: 24 }} />
          </View>

          {/* Progress Indicator */}
          <View style={styles.progressContainer}>
            <View style={[styles.progressStep, step >= 1 && styles.progressStepActive]}>
              <Text style={[styles.progressStepText, step >= 1 && styles.progressStepTextActive]}>
                1
              </Text>
            </View>
            <View style={[styles.progressLine, step >= 2 && styles.progressLineActive]} />
            <View style={[styles.progressStep, step >= 2 && styles.progressStepActive]}>
              <Text style={[styles.progressStepText, step >= 2 && styles.progressStepTextActive]}>
                2
              </Text>
            </View>
          </View>

          {/* Step Content */}
          <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
            {step === 1 ? renderStep1() : renderStep2()}
          </ScrollView>

          {/* Footer */}
          <View style={styles.modalFooter}>
            {step === 1 ? (
              <TouchableOpacity style={styles.nextButton} onPress={handleNext}>
                <Text style={styles.nextButtonText}>Continue</Text>
                <Ionicons name="arrow-forward" size={20} color={Colors.surface} />
              </TouchableOpacity>
            ) : (
              <View style={styles.footerButtons}>
                <TouchableOpacity
                  style={styles.cancelButton}
                  onPress={handleClose}
                >
                  <Text style={styles.cancelButtonText}>Cancel</Text>
                </TouchableOpacity>
                
                <TouchableOpacity
                  style={[
                    styles.confirmButton,
                    (type === 'reject' ? styles.rejectConfirmButton : styles.rescheduleConfirmButton),
                    isLoading && styles.confirmButtonDisabled,
                  ]}
                  onPress={handleConfirm}
                  disabled={isLoading}
                >
                  {isLoading ? (
                    <ActivityIndicator size="small" color={Colors.surface} />
                  ) : (
                    <>
                      <Text style={styles.confirmButtonText}>
                        {type === 'reject' ? 'Confirm Reject' : 'Confirm Reschedule'}
                      </Text>
                      <Ionicons 
                        name={type === 'reject' ? 'close-circle' : 'checkmark-circle'} 
                        size={20} 
                        color={Colors.surface} 
                      />
                    </>
                  )}
                </TouchableOpacity>
              </View>
            )}
          </View>
        </View>
      </View>
    </Modal>
  );
};

// Add missing TextInput import
import { TextInput, ActivityIndicator } from 'react-native';

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: Colors.surface,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    height: '90%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 10,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: Colors.text.primary,
  },
  progressContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 40,
    paddingVertical: 15,
  },
  progressStep: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: Colors.background,
    borderWidth: 2,
    borderColor: Colors.border,
    justifyContent: 'center',
    alignItems: 'center',
  },
  progressStepActive: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  progressStepText: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.text.secondary,
  },
  progressStepTextActive: {
    color: Colors.surface,
  },
  progressLine: {
    flex: 1,
    height: 2,
    backgroundColor: Colors.border,
    marginHorizontal: 8,
  },
  progressLineActive: {
    backgroundColor: Colors.primary,
  },
  content: {
    flex: 1,
    padding: 20,
  },
  stepContainer: {
    flex: 1,
  },
  stepTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: Colors.text.primary,
    marginBottom: 8,
  },
  stepSubtitle: {
    fontSize: 14,
    color: Colors.text.secondary,
    marginBottom: 20,
  },
  reasonsList: {
    maxHeight: 400,
  },
  reasonCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: Colors.background,
    borderRadius: 12,
    padding: 16,
    marginBottom: 8,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  reasonCardSelected: {
    borderColor: Colors.primary,
    backgroundColor: Colors.primary + '10',
  },
  reasonLeft: {
    flex: 1,
  },
  reasonText: {
    fontSize: 14,
    color: Colors.text.primary,
  },
  radioButton: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: Colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  radioSelected: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: Colors.primary,
  },
  customReasonContainer: {
    marginTop: 20,
  },
  customReasonLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: Colors.text.primary,
    marginBottom: 8,
  },
  customReasonInput: {
    backgroundColor: Colors.background,
    borderRadius: 12,
    padding: 12,
    fontSize: 14,
    color: Colors.text.primary,
    minHeight: 80,
    borderWidth: 1,
    borderColor: Colors.border,
    textAlignVertical: 'top',
  },
  formGroup: {
    marginBottom: 20,
  },
  formLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: Colors.text.primary,
    marginBottom: 8,
  },
  datePickerButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.background,
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: Colors.border,
    gap: 12,
  },
  dateText: {
    fontSize: 14,
    color: Colors.text.primary,
  },
  timeSlotsContainer: {
    flexDirection: 'row',
  },
  timeSlot: {
    paddingHorizontal: 20,
    paddingVertical: 12,
    backgroundColor: Colors.background,
    borderRadius: 20,
    marginRight: 8,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  timeSlotSelected: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  timeSlotText: {
    fontSize: 14,
    color: Colors.text.secondary,
  },
  timeSlotTextSelected: {
    color: Colors.surface,
  },
  currentSchedule: {
    backgroundColor: Colors.info + '10',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: Colors.info + '20',
  },
  currentScheduleTitle: {
    fontSize: 12,
    color: Colors.text.secondary,
    marginBottom: 4,
  },
  currentScheduleText: {
    fontSize: 14,
    fontWeight: '500',
    color: Colors.text.primary,
  },
  successIcon: {
    alignItems: 'center',
    marginVertical: 20,
  },
  confirmTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: Colors.text.primary,
    textAlign: 'center',
    marginBottom: 8,
  },
  confirmSubtitle: {
    fontSize: 14,
    color: Colors.text.secondary,
    textAlign: 'center',
    marginBottom: 24,
  },
  summaryCard: {
    backgroundColor: Colors.background,
    borderRadius: 16,
    padding: 16,
    marginBottom: 20,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  summaryLabel: {
    fontSize: 13,
    color: Colors.text.secondary,
  },
  summaryValue: {
    fontSize: 14,
    color: Colors.text.primary,
    fontWeight: '500',
  },
  summaryDivider: {
    height: 1,
    backgroundColor: Colors.border,
    marginVertical: 12,
  },
  warningText: {
    fontSize: 13,
    color: Colors.error,
    textAlign: 'center',
    marginTop: 16,
    fontStyle: 'italic',
  },
  infoText: {
    fontSize: 13,
    color: Colors.info,
    textAlign: 'center',
    marginTop: 16,
  },
  modalFooter: {
    padding: 20,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
  },
  nextButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.primary,
    paddingVertical: 16,
    borderRadius: 12,
    gap: 8,
  },
  nextButtonText: {
    fontSize: 16,
    color: Colors.surface,
    fontWeight: '600',
  },
  footerButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  cancelButton: {
    flex: 1,
    paddingVertical: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.border,
    alignItems: 'center',
  },
  cancelButtonText: {
    fontSize: 16,
    color: Colors.text.secondary,
  },
  confirmButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    borderRadius: 12,
    gap: 8,
  },
  rejectConfirmButton: {
    backgroundColor: Colors.error,
  },
  rescheduleConfirmButton: {
    backgroundColor: Colors.warning,
  },
  confirmButtonDisabled: {
    opacity: 0.5,
  },
  confirmButtonText: {
    fontSize: 16,
    color: Colors.surface,
    fontWeight: '600',
  },
});