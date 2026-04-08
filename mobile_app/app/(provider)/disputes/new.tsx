// app/(provider)/disputes/new.tsx
import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Image,
  Alert,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { Colors } from '@/app/constants/Colors';
import { LoadingSpinner } from '@/components/common/LoadingSpinner';
import { formatCurrency } from '@/app/utils/formatters';
import { useProviderQueries } from '@/hooks/useProviderQueries';
import { useCreateDispute } from '@/hooks/useProviderDisputes';
import type { DisputeReason } from '@/app/types/provider.types';

const DISPUTE_REASONS: { value: DisputeReason; label: string; icon: string; description: string }[] = [
  {
    value: 'non_payment',
    label: 'Non-Payment',
    icon: 'cash-outline',
    description: "Customer hasn't paid for completed service",
  },
  {
    value: 'customer_no_show',
    label: 'Customer No-Show',
    icon: 'person-outline',
    description: "Customer wasn't present at scheduled time",
  },
  {
    value: 'unreasonable_demands',
    label: 'Unreasonable Demands',
    icon: 'alert-circle-outline',
    description: 'Customer making unreasonable requests',
  },
  {
    value: 'harassment',
    label: 'Harassment',
    icon: 'hand-left-outline',
    description: 'Customer harassing or abusive behavior',
  },
  {
    value: 'property_issues',
    label: 'Property Issues',
    icon: 'home-outline',
    description: "Issues with customer's property affecting work",
  },
  {
    value: 'other',
    label: 'Other',
    icon: 'ellipsis-horizontal-outline',
    description: 'Other dispute reasons not listed',
  },
];

export default function NewDispute() {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [selectedBooking, setSelectedBooking] = useState<any>(null);
  const [selectedReason, setSelectedReason] = useState<DisputeReason | null>(null);
  const [description, setDescription] = useState('');
  const [attachments, setAttachments] = useState<string[]>([]);
  const [uploading, setUploading] = useState(false);
  const { pendingRequests, isLoading: loadingBookings } = useProviderQueries();
  const { createDispute, isPending } = useCreateDispute();
  const completedRequests = pendingRequests?.filter(r => r.status === 'completed') || [];
  const handleSelectBooking = (booking: any) => {
    setSelectedBooking(booking);
    setStep(2);
  };

  const handleSelectReason = (reason: DisputeReason) => {
    setSelectedReason(reason);
  };

  const handleNext = () => {
    if (step === 2 && !selectedReason) {
      Alert.alert('Error', 'Please select a reason');
      return;
    }
    if (step === 3 && !description.trim()) {
      Alert.alert('Error', 'Please describe the issue');
      return;
    }
    setStep(step + 1);
  };

  const handleBack = () => {
    setStep(step - 1);
  };

  const handlePickImage = async () => {
    const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
    
    if (permissionResult.granted === false) {
      Alert.alert('Permission Required', 'Please allow access to your photo library');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsMultipleSelection: true,
      quality: 0.8,
    });

    if (!result.canceled && result.assets) {
      setUploading(true);
      // Simulate upload - in production, upload to server
      setTimeout(() => {
        setAttachments([...attachments, ...result.assets.map(a => a.uri)]);
        setUploading(false);
      }, 500);
    }
  };

  const handleRemoveAttachment = (index: number) => {
    setAttachments(attachments.filter((_, i) => i !== index));
  };

  const handleSubmit = async () => {
    if (!selectedBooking || !selectedReason || !description.trim()) {
      Alert.alert('Error', 'Please complete all required fields');
      return;
    }

    try {
      await createDispute({
        bookingId: selectedBooking.id,
        reason: selectedReason,
        description: description.trim(),
        evidence: attachments,
      });

      Alert.alert(
        'Dispute Filed',
        'Your dispute has been submitted successfully. Our team will review it within 24-48 hours.',
        [
          {
            text: 'View Disputes',
            onPress: () => router.push('/(provider)/disputes'),
          },
        ]
      );
    } catch (error) {
      Alert.alert('Error', 'Failed to file dispute. Please try again.');
    }
  };

  const renderStepIndicator = () => (
    <View style={styles.progressContainer}>
      <View style={[styles.progressStep, step >= 1 && styles.progressStepActive]}>
        <Text style={[styles.progressStepText, step >= 1 && styles.progressStepTextActive]}>1</Text>
      </View>
      <View style={[styles.progressLine, step >= 2 && styles.progressLineActive]} />
      <View style={[styles.progressStep, step >= 2 && styles.progressStepActive]}>
        <Text style={[styles.progressStepText, step >= 2 && styles.progressStepTextActive]}>2</Text>
      </View>
      <View style={[styles.progressLine, step >= 3 && styles.progressLineActive]} />
      <View style={[styles.progressStep, step >= 3 && styles.progressStepActive]}>
        <Text style={[styles.progressStepText, step >= 3 && styles.progressStepTextActive]}>3</Text>
      </View>
      <View style={[styles.progressLine, step >= 4 && styles.progressLineActive]} />
      <View style={[styles.progressStep, step >= 4 && styles.progressStepActive]}>
        <Text style={[styles.progressStepText, step >= 4 && styles.progressStepTextActive]}>4</Text>
      </View>
    </View>
  );

  const renderStep1 = () => (
    <View style={styles.stepContainer}>
      <Text style={styles.stepTitle}>Select Booking</Text>
      <Text style={styles.stepSubtitle}>
        Choose the completed service you want to dispute
      </Text>

      {loadingBookings ? (
        <LoadingSpinner />
      ) : completedRequests.length === 0 ? (
        <View style={styles.noBookings}>
          <Ionicons name="calendar-outline" size={48} color={Colors.text.secondary} />
          <Text style={styles.noBookingsText}>No completed bookings</Text>
          <Text style={styles.noBookingsSubtext}>
            You can only dispute completed services
          </Text>
        </View>
      ) : (
        completedRequests.map((booking: any) => (
          <TouchableOpacity
            key={booking.id}
            style={[
              styles.bookingCard,
              selectedBooking?.id === booking.id && styles.bookingCardSelected,
            ]}
            onPress={() => handleSelectBooking(booking)}
          >
            <View style={styles.bookingInfo}>
              <Text style={styles.bookingService}>{booking.serviceName}</Text>
              <Text style={styles.bookingCustomer}>{booking.customerName}</Text>
              <Text style={styles.bookingDate}>
                {booking.scheduledDate} at {booking.scheduledTime}
              </Text>
              <Text style={styles.bookingAmount}>
                {formatCurrency(booking.finalPrice || booking.estimatedPrice || 0)}
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={24} color={Colors.text.secondary} />
          </TouchableOpacity>
        ))
      )}
    </View>
  );

  const renderStep2 = () => (
    <View style={styles.stepContainer}>
      <TouchableOpacity style={styles.backButton} onPress={handleBack}>
        <Ionicons name="arrow-back" size={20} color={Colors.text.secondary} />
        <Text style={styles.backButtonText}>Change Booking</Text>
      </TouchableOpacity>

      <Text style={styles.stepTitle}>Select Reason</Text>
      <Text style={styles.stepSubtitle}>
        What is the reason for this dispute?
      </Text>

      <ScrollView style={styles.reasonsList} showsVerticalScrollIndicator={false}>
        {DISPUTE_REASONS.map((reason) => (
          <TouchableOpacity
            key={reason.value}
            style={[
              styles.reasonCard,
              selectedReason === reason.value && styles.reasonCardSelected,
            ]}
            onPress={() => handleSelectReason(reason.value)}
          >
            <View style={styles.reasonLeft}>
              <View style={[styles.reasonIcon, { backgroundColor: Colors.primary + '20' }]}>
                <Ionicons name={reason.icon as keyof typeof Ionicons.glyphMap} size={24} color={Colors.primary} />
              </View>
              <View style={styles.reasonInfo}>
                <Text style={styles.reasonLabel}>{reason.label}</Text>
                <Text style={styles.reasonDescription}>{reason.description}</Text>
              </View>
            </View>
            <View style={styles.radioButton}>
              {selectedReason === reason.value && <View style={styles.radioSelected} />}
            </View>
          </TouchableOpacity>
        ))}
      </ScrollView>
    </View>
  );

  const renderStep3 = () => (
    <View style={styles.stepContainer}>
      <TouchableOpacity style={styles.backButton} onPress={handleBack}>
        <Ionicons name="arrow-back" size={20} color={Colors.text.secondary} />
        <Text style={styles.backButtonText}>Change Reason</Text>
      </TouchableOpacity>

      <Text style={styles.stepTitle}>Describe the Issue</Text>
      <Text style={styles.stepSubtitle}>
        Provide as much detail as possible to help us investigate
      </Text>

      <View style={styles.formGroup}>
        <Text style={styles.formLabel}>Description</Text>
        <TextInput
          style={[styles.input, styles.textArea]}
          placeholder="Describe what happened in detail..."
          placeholderTextColor={Colors.text.secondary}
          value={description}
          onChangeText={setDescription}
          multiline
          numberOfLines={8}
          textAlignVertical="top"
        />
      </View>

      <View style={styles.formGroup}>
        <Text style={styles.formLabel}>Evidence (Optional)</Text>
        <Text style={styles.attachmentHint}>
          Upload photos, screenshots, or messages as evidence
        </Text>

        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.attachmentsScroll}>
          {attachments.map((uri, index) => (
            <View key={index} style={styles.attachmentPreview}>
              <Image source={{ uri }} style={styles.attachmentImage} />
              <TouchableOpacity
                style={styles.removeAttachment}
                onPress={() => handleRemoveAttachment(index)}
              >
                <Ionicons name="close-circle" size={22} color={Colors.error} />
              </TouchableOpacity>
            </View>
          ))}

          <TouchableOpacity
            style={styles.addAttachment}
            onPress={handlePickImage}
            disabled={uploading}
          >
            {uploading ? (
              <ActivityIndicator size="large" color={Colors.primary} />
            ) : (
              <>
                <Ionicons name="camera-outline" size={32} color={Colors.primary} />
                <Text style={styles.addAttachmentText}>Add Photo</Text>
              </>
            )}
          </TouchableOpacity>
        </ScrollView>
      </View>

      <View style={styles.tipBox}>
        <Ionicons name="information-circle-outline" size={20} color={Colors.info} />
        <Text style={styles.tipText}>
          Include relevant details like dates, times, and any communication with the customer.
        </Text>
      </View>
    </View>
  );

  const renderStep4 = () => (
    <View style={styles.stepContainer}>
      <TouchableOpacity style={styles.backButton} onPress={handleBack}>
        <Ionicons name="arrow-back" size={20} color={Colors.text.secondary} />
        <Text style={styles.backButtonText}>Edit Details</Text>
      </TouchableOpacity>

      <View style={styles.successIcon}>
        <Ionicons name="alert-circle" size={60} color={Colors.warning} />
      </View>

      <Text style={styles.confirmTitle}>Review Dispute</Text>
      <Text style={styles.confirmSubtitle}>
        Please verify all information before submitting
      </Text>

      <View style={styles.summaryCard}>
        <View style={styles.summarySection}>
          <Text style={styles.summaryLabel}>Booking</Text>
          <Text style={styles.summaryValue}>{selectedBooking?.serviceName || 'N/A'}</Text>
          <Text style={styles.summaryDetail}>
            {selectedBooking?.customerName || 'Unknown'} • {selectedBooking?.scheduledDate || 'N/A'}
          </Text>
        </View>

        <View style={styles.summaryDivider} />

        <View style={styles.summarySection}>
          <Text style={styles.summaryLabel}>Reason</Text>
          <Text style={styles.summaryValue}>
            {DISPUTE_REASONS.find(r => r.value === selectedReason)?.label || 'N/A'}
          </Text>
        </View>

        <View style={styles.summaryDivider} />

        <View style={styles.summarySection}>
          <Text style={styles.summaryLabel}>Description</Text>
          <Text style={styles.summaryDescription}>{description || 'No description provided'}</Text>
        </View>

        {attachments.length > 0 && (
          <>
            <View style={styles.summaryDivider} />
            <View style={styles.summarySection}>
              <Text style={styles.summaryLabel}>Evidence ({attachments.length} files)</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                {attachments.map((uri, index) => (
                  <Image key={index} source={{ uri }} style={styles.summaryImage} />
                ))}
              </ScrollView>
            </View>
          </>
        )}
      </View>

      <View style={styles.warningBox}>
        <Ionicons name="alert-circle-outline" size={20} color={Colors.warning} />
        <Text style={styles.warningText}>
          Filing a false dispute may result in account suspension. Please ensure all information is accurate.
        </Text>
      </View>
    </View>
  );

  if (loadingBookings && step === 1) {
    return <LoadingSpinner fullScreen />;
  }

  return (
    <KeyboardAvoidingView 
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
    >
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity 
          onPress={step === 1 ? () => router.back() : handleBack}
          style={styles.headerBack}
        >
          <Ionicons name="arrow-back" size={24} color={Colors.text.primary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>File a Dispute</Text>
        <View style={{ width: 24 }} />
      </View>

      {renderStepIndicator()}

      {/* Step Content */}
      <ScrollView 
        style={styles.content} 
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {step === 1 && renderStep1()}
        {step === 2 && renderStep2()}
        {step === 3 && renderStep3()}
        {step === 4 && renderStep4()}
      </ScrollView>

      {/* Footer */}
      <View style={styles.footer}>
        {step < 4 ? (
          <TouchableOpacity 
            style={[
              styles.nextButton,
              ((step === 2 && !selectedReason) || (step === 3 && !description.trim())) 
                ? styles.nextButtonDisabled 
                : null
            ]}
            onPress={handleNext}
            disabled={(step === 2 && !selectedReason) || (step === 3 && !description.trim())}
          >
            <Text style={styles.nextButtonText}>Continue</Text>
            <Ionicons name="arrow-forward" size={20} color={Colors.surface} />
          </TouchableOpacity>
        ) : (
          <TouchableOpacity
            style={[styles.submitButton, isPending && styles.submitButtonDisabled]}
            onPress={handleSubmit}
            disabled={isPending}
          >
            {isPending ? (
              <ActivityIndicator size="small" color={Colors.surface} />
            ) : (
              <>
                <Text style={styles.submitButtonText}>Submit Dispute</Text>
                <Ionicons name="send" size={20} color={Colors.surface} />
              </>
            )}
          </TouchableOpacity>
        )}
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 100,
    paddingBottom: 20,
    backgroundColor: Colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  headerBack: {
    padding: 4,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: Colors.text.primary,
  },
  progressContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 40,
    paddingVertical: 20,
    backgroundColor: Colors.surface,
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
    fontSize: 22,
    fontWeight: 'bold',
    color: Colors.text.primary,
    marginBottom: 8,
  },
  stepSubtitle: {
    fontSize: 14,
    color: Colors.text.secondary,
    marginBottom: 20,
  },
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
    gap: 8,
  },
  backButtonText: {
    fontSize: 14,
    color: Colors.text.secondary,
  },
  noBookings: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 40,
  },
  noBookingsText: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.text.primary,
    marginTop: 16,
    marginBottom: 8,
  },
  noBookingsSubtext: {
    fontSize: 14,
    color: Colors.text.secondary,
    textAlign: 'center',
  },
  bookingCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: Colors.surface,
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  bookingCardSelected: {
    borderColor: Colors.primary,
    backgroundColor: Colors.primary + '10',
  },
  bookingInfo: {
    flex: 1,
  },
  bookingService: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.text.primary,
    marginBottom: 4,
  },
  bookingCustomer: {
    fontSize: 14,
    color: Colors.text.secondary,
    marginBottom: 4,
  },
  bookingDate: {
    fontSize: 12,
    color: Colors.text.secondary,
    marginBottom: 4,
  },
  bookingAmount: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.primary,
  },
  reasonsList: {
    maxHeight: 500,
  },
  reasonCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: Colors.surface,
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
    flexDirection: 'row',
    flex: 1,
  },
  reasonIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  reasonInfo: {
    flex: 1,
  },
  reasonLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.text.primary,
    marginBottom: 4,
  },
  reasonDescription: {
    fontSize: 12,
    color: Colors.text.secondary,
  },
  radioButton: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: Colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 12,
  },
  radioSelected: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: Colors.primary,
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
  input: {
    backgroundColor: Colors.surface,
    borderRadius: 12,
    padding: 16,
    fontSize: 14,
    color: Colors.text.primary,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  textArea: {
    minHeight: 150,
    textAlignVertical: 'top',
  },
  attachmentHint: {
    fontSize: 12,
    color: Colors.text.secondary,
    marginBottom: 12,
  },
  attachmentsScroll: {
    flexDirection: 'row',
  },
  attachmentPreview: {
    position: 'relative',
    marginRight: 12,
  },
  attachmentImage: {
    width: 100,
    height: 100,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: Colors.border,
  },
  removeAttachment: {
    position: 'absolute',
    top: -8,
    right: -8,
    backgroundColor: Colors.surface,
    borderRadius: 12,
  },
  addAttachment: {
    width: 100,
    height: 100,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: Colors.border,
    borderStyle: 'dashed',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: Colors.background,
  },
  addAttachmentText: {
    fontSize: 12,
    color: Colors.primary,
    marginTop: 4,
  },
  tipBox: {
    flexDirection: 'row',
    backgroundColor: Colors.info + '10',
    borderRadius: 12,
    padding: 16,
    gap: 12,
    borderWidth: 1,
    borderColor: Colors.info + '20',
  },
  tipText: {
    flex: 1,
    fontSize: 13,
    color: Colors.text.secondary,
    lineHeight: 18,
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
    backgroundColor: Colors.surface,
    borderRadius: 16,
    padding: 16,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  summarySection: {
    marginBottom: 12,
  },
  summaryLabel: {
    fontSize: 12,
    color: Colors.text.secondary,
    marginBottom: 4,
  },
  summaryValue: {
    fontSize: 16,
    fontWeight: '500',
    color: Colors.text.primary,
    marginBottom: 2,
  },
  summaryDetail: {
    fontSize: 13,
    color: Colors.text.secondary,
  },
  summaryDescription: {
    fontSize: 14,
    color: Colors.text.primary,
    lineHeight: 20,
  },
  summaryDivider: {
    height: 1,
    backgroundColor: Colors.border,
    marginVertical: 12,
  },
  summaryImage: {
    width: 60,
    height: 60,
    borderRadius: 8,
    marginRight: 8,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  warningBox: {
    flexDirection: 'row',
    backgroundColor: Colors.warning + '10',
    borderRadius: 12,
    padding: 16,
    gap: 12,
    borderWidth: 1,
    borderColor: Colors.warning + '20',
  },
  warningText: {
    flex: 1,
    fontSize: 13,
    color: Colors.warning,
    lineHeight: 18,
  },
  footer: {
    padding: 20,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
    backgroundColor: Colors.surface,
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
  nextButtonDisabled: {
    opacity: 0.5,
  },
  nextButtonText: {
    fontSize: 16,
    color: Colors.surface,
    fontWeight: '600',
  },
  submitButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.warning,
    paddingVertical: 16,
    borderRadius: 12,
    gap: 8,
  },
  submitButtonDisabled: {
    opacity: 0.5,
  },
  submitButtonText: {
    fontSize: 16,
    color: Colors.surface,
    fontWeight: '600',
  },
});