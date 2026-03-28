// app/(customer)/complaints/new.tsx
import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
  Image,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { Colors } from '@/app/constants/Colors';
import { useCreateComplaint, useServiceRequests } from '@/hooks/useCustomerQueries';
import type { ServiceRequest } from '@/app/types/customer.types';
// If the file does not exist, create 'useCustomerQueries.ts' in 'mobile_app/hooks' and export the hooks.

interface ComplaintForm {
  bookingId: string;
  providerId: string;
  subject: string;
  description: string;
  issueType: string;
  priority: 'low' | 'medium' | 'high';
  attachments: string[];
}

const ISSUE_TYPES = [
  { id: 'service_quality', label: 'Poor Service Quality', icon: 'construct-outline' },
  { id: 'professionalism', label: 'Unprofessional Behavior', icon: 'people-outline' },
  { id: 'late_arrival', label: 'Late Arrival / No Show', icon: 'time-outline' },
  { id: 'overcharging', label: 'Overcharging', icon: 'cash-outline' },
  { id: 'damage', label: 'Property Damage', icon: 'warning-outline' },
  { id: 'incomplete', label: 'Incomplete Work', icon: 'close-circle-outline' },
  { id: 'communication', label: 'Poor Communication', icon: 'chatbubble-outline' },
  { id: 'other', label: 'Other', icon: 'ellipsis-horizontal-outline' },
];

const PRIORITIES = [
  { value: 'low', label: 'Low', color: Colors.success },
  { value: 'medium', label: 'Medium', color: Colors.warning },
  { value: 'high', label: 'High', color: Colors.error },
];

export default function NewComplaint() {
  const router = useRouter();
  // Fetch completed service requests

  const { data: requests } = useServiceRequests('completed');
  const createComplaint = useCreateComplaint();

  const [form, setForm] = useState<ComplaintForm>({
    bookingId: '',
    providerId: '',
    subject: '',
    description: '',
    issueType: '',
    priority: 'medium',
    attachments: [],
  });
  const [uploading, setUploading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [step, setStep] = useState(1); // 1: Select Booking, 2: Complaint Details, 3: Review

  const handleSelectBooking = (bookingId: string, providerId: string) => {
    setForm({ ...form, bookingId, providerId });
    setStep(2);
  };

  const handleSelectIssueType = (typeId: string) => {
    setForm({ ...form, issueType: typeId });
  };

  const handleSelectPriority = (priority: 'low' | 'medium' | 'high') => {
    setForm({ ...form, priority });
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

    if (!result.canceled) {
      setUploading(true);
      // Simulate upload
      setTimeout(() => {
        setForm({
          ...form,
          attachments: [...form.attachments, ...result.assets.map(a => a.uri)]
        });
        setUploading(false);
      }, 1000);
    }
  };

  const handleRemoveAttachment = (index: number) => {
    setForm({
      ...form,
      attachments: form.attachments.filter((_, i) => i !== index)
    });
  };

  const validateStep2 = () => {
    if (!form.subject.trim()) {
      Alert.alert('Error', 'Please enter a subject');
      return false;
    }
    if (!form.description.trim()) {
      Alert.alert('Error', 'Please describe the issue');
      return false;
    }
    if (!form.issueType) {
      Alert.alert('Error', 'Please select an issue type');
      return false;
    }
    return true;
  };

  const handleSubmit = async () => {
    if (!validateStep2()) return;

    try {
      await createComplaint.mutateAsync({
        booking_id: form.bookingId,
        provider_id: form.providerId,
        type: form.issueType,
        subject: form.subject,
        description: form.description,
        priority: form.priority,
        attachments: form.attachments,
      });

      Alert.alert(
        'Complaint Submitted',
        'Your complaint has been submitted successfully. We will review it within 24-48 hours.',
        [
          {
            text: 'View Complaints',
            onPress: () => router.push('/(customer)/complaints'),
          },
        ]
      );
    } catch (error) {
      Alert.alert('Error', 'Failed to submit complaint');
    }
  };

  const renderStep1 = () => (
    <View style={styles.stepContainer}>
      <Text style={styles.stepTitle}>Select the service request</Text>
      <Text style={styles.stepSubtitle}>
        Choose the completed service you want to report an issue about
      </Text>

      {requests?.length === 0 ? (
        <View style={styles.noBookings}>
          <Ionicons name="calendar-outline" size={48} color={Colors.text.secondary} />
          <Text style={styles.noBookingsText}>No completed services found</Text>
          <Text style={styles.noBookingsSubtext}>
            You can only file complaints for completed services
          </Text>
        </View>
      ) : (
        requests?.map((request: ServiceRequest) => (
          <TouchableOpacity
            key={request.id}
            style={styles.bookingCard}
            onPress={() => handleSelectBooking(request.id, request.providerId)}
          >
            <View style={styles.bookingInfo}>
              <Text style={styles.bookingService}>{request.serviceName}</Text>
              <Text style={styles.bookingProvider}>{request.providerName}</Text>
              <Text style={styles.bookingDate}>
                {new Date(request.scheduledDate).toLocaleDateString()}
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={24} color={Colors.text.secondary} />
          </TouchableOpacity>
        ))
      )}
    </View>
  );

  const renderStep2 = () => (
    <ScrollView 
      style={styles.stepContainer}
      showsVerticalScrollIndicator={false}
      keyboardShouldPersistTaps="handled"
    >
      <TouchableOpacity 
        style={styles.backButton}
        onPress={() => setStep(1)}
      >
        <Ionicons name="arrow-back" size={20} color={Colors.text.secondary} />
        <Text style={styles.backButtonText}>Change Booking</Text>
      </TouchableOpacity>

      <Text style={styles.stepTitle}>Tell us what happened</Text>
      <Text style={styles.stepSubtitle}>
        Provide as much detail as possible to help us investigate
      </Text>

      {/* Issue Type Selection */}
      <Text style={styles.inputLabel}>Issue Type</Text>
      <View style={styles.issueTypesGrid}>
        {ISSUE_TYPES.map((type) => (
          <TouchableOpacity
            key={type.id}
            style={[
              styles.issueTypeCard,
              form.issueType === type.id && styles.issueTypeCardSelected,
            ]}
            onPress={() => handleSelectIssueType(type.id)}
          >
            <Ionicons 
              name={type.icon as any} 
              size={24} 
              color={form.issueType === type.id ? Colors.primary : Colors.text.secondary} 
            />
            <Text style={[
              styles.issueTypeLabel,
              form.issueType === type.id && styles.issueTypeLabelSelected,
            ]}>
              {type.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Subject */}
      <View style={styles.inputGroup}>
        <Text style={styles.inputLabel}>Subject</Text>
        <TextInput
          style={styles.input}
          placeholder="Brief summary of the issue"
          placeholderTextColor={Colors.text.secondary}
          value={form.subject}
          onChangeText={(text) => setForm({ ...form, subject: text })}
          maxLength={100}
        />
        <Text style={styles.charCount}>{form.subject.length}/100</Text>
      </View>

      {/* Description */}
      <View style={styles.inputGroup}>
        <Text style={styles.inputLabel}>Detailed Description</Text>
        <TextInput
          style={[styles.input, styles.textArea]}
          placeholder="Describe what happened in detail..."
          placeholderTextColor={Colors.text.secondary}
          value={form.description}
          onChangeText={(text) => setForm({ ...form, description: text })}
          multiline
          numberOfLines={6}
          textAlignVertical="top"
        />
      </View>

      {/* Priority */}
      <View style={styles.inputGroup}>
        <Text style={styles.inputLabel}>Priority</Text>
        <View style={styles.priorityContainer}>
          {PRIORITIES.map((priority) => (
            <TouchableOpacity
              key={priority.value}
              style={[
                styles.priorityButton,
                form.priority === priority.value && styles.priorityButtonSelected,
                { borderColor: priority.color + '40' }
              ]}
              onPress={() => handleSelectPriority(priority.value as any)}
            >
              <View style={[styles.priorityDot, { backgroundColor: priority.color }]} />
              <Text style={[
                styles.priorityText,
                form.priority === priority.value && { color: priority.color }
              ]}>
                {priority.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* Attachments */}
      <View style={styles.inputGroup}>
        <Text style={styles.inputLabel}>Attachments (Optional)</Text>
        <Text style={styles.attachmentHint}>
          Upload photos as evidence (screenshots, photos of damage, etc.)
        </Text>

        <ScrollView 
          horizontal 
          showsHorizontalScrollIndicator={false}
          style={styles.attachmentsScroll}
          keyboardShouldPersistTaps="handled"
        >
          {form.attachments.map((uri, index) => (
            <View key={index} style={styles.attachmentPreview}>
              <Image source={{ uri }} style={styles.attachmentImage} />
              <TouchableOpacity
                style={styles.removeAttachment}
                onPress={() => handleRemoveAttachment(index)}
              >
                <Ionicons name="close-circle" size={20} color={Colors.error} />
              </TouchableOpacity>
            </View>
          ))}

          <TouchableOpacity
            style={styles.addAttachment}
            onPress={handlePickImage}
            disabled={uploading}
          >
            {uploading ? (
              <ActivityIndicator size="small" color={Colors.primary} />
            ) : (
              <>
                <Ionicons name="camera-outline" size={24} color={Colors.primary} />
                <Text style={styles.addAttachmentText}>Add Photo</Text>
              </>
            )}
          </TouchableOpacity>
        </ScrollView>
      </View>

      {/* Navigation Buttons */}
      <View style={styles.navigationButtons}>
        <TouchableOpacity
          style={styles.cancelButton}
          onPress={() => router.back()}
        >
          <Text style={styles.cancelButtonText}>Cancel</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.nextButton}
          onPress={() => {
            if (validateStep2()) {
              setStep(3);
            }
          }}
        >
          <Text style={styles.nextButtonText}>Review Complaint</Text>
          <Ionicons name="arrow-forward" size={20} color={Colors.surface} />
        </TouchableOpacity>
      </View>
    </ScrollView>
  );

  const renderStep3 = () => (
    <ScrollView 
      style={styles.stepContainer}
      showsVerticalScrollIndicator={false}
      keyboardShouldPersistTaps="handled"
    >
      <TouchableOpacity 
        style={styles.backButton}
        onPress={() => setStep(2)}
      >
        <Ionicons name="arrow-back" size={20} color={Colors.text.secondary} />
        <Text style={styles.backButtonText}>Edit Details</Text>
      </TouchableOpacity>

      <Text style={styles.stepTitle}>Review Your Complaint</Text>
      <Text style={styles.stepSubtitle}>
        Please verify all information before submitting
      </Text>

      <View style={styles.reviewCard}>
        <View style={styles.reviewSection}>
          <Text style={styles.reviewLabel}>Issue Type</Text>
          <Text style={styles.reviewValue}>
            {ISSUE_TYPES.find(t => t.id === form.issueType)?.label}
          </Text>
        </View>

        <View style={styles.reviewSection}>
          <Text style={styles.reviewLabel}>Subject</Text>
          <Text style={styles.reviewValue}>{form.subject}</Text>
        </View>

        <View style={styles.reviewSection}>
          <Text style={styles.reviewLabel}>Description</Text>
          <Text style={styles.reviewValue}>{form.description}</Text>
        </View>

        <View style={styles.reviewSection}>
          <Text style={styles.reviewLabel}>Priority</Text>
          <View style={[styles.priorityBadge, { 
            backgroundColor: 
              form.priority === 'high' ? Colors.error + '20' :
              form.priority === 'medium' ? Colors.warning + '20' :
              Colors.success + '20'
          }]}>
            <Text style={[styles.priorityBadgeText, { 
              color: 
                form.priority === 'high' ? Colors.error :
                form.priority === 'medium' ? Colors.warning :
                Colors.success
            }]}>
              {form.priority.toUpperCase()}
            </Text>
          </View>
        </View>

        {form.attachments.length > 0 && (
          <View style={styles.reviewSection}>
            <Text style={styles.reviewLabel}>Attachments ({form.attachments.length})</Text>
            <ScrollView 
              horizontal 
              showsHorizontalScrollIndicator={false}
              keyboardShouldPersistTaps="handled"
            >
              {form.attachments.map((uri, index) => (
                <Image key={index} source={{ uri }} style={styles.reviewAttachment} />
              ))}
            </ScrollView>
          </View>
        )}
      </View>

      <View style={styles.disclaimer}>
        <Ionicons name="information-circle-outline" size={20} color={Colors.primary} />
        <Text style={styles.disclaimerText}>
          By submitting this complaint, you confirm that all information provided is accurate to the best of your knowledge. False reports may result in account suspension.
        </Text>
      </View>

      <View style={styles.navigationButtons}>
        <TouchableOpacity
          style={styles.cancelButton}
          onPress={() => router.back()}
        >
          <Text style={styles.cancelButtonText}>Cancel</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.submitButton, createComplaint.isPending && styles.submitButtonDisabled]}
          onPress={handleSubmit}
          disabled={createComplaint.isPending}
        >
          {createComplaint.isPending ? (
            <ActivityIndicator size="small" color={Colors.surface} />
          ) : (
            <>
              <Text style={styles.submitButtonText}>Submit Complaint</Text>
              <Ionicons name="send" size={20} color={Colors.surface} />
            </>
          )}
        </TouchableOpacity>
      </View>
    </ScrollView>
  );

  return (
    <KeyboardAvoidingView 
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
    >
      {/* Progress Indicator */}
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
      </View>

      {step === 1 && renderStep1()}
      {step === 2 && renderStep2()}
      {step === 3 && renderStep3()}
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  progressContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 40,
    paddingVertical: 20,
    backgroundColor: Colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
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
  stepContainer: {
    flex: 1,
    padding: 20,
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
    marginBottom: 24,
  },
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  backButtonText: {
    marginLeft: 8,
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
  bookingInfo: {
    flex: 1,
  },
  bookingService: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.text.primary,
    marginBottom: 4,
  },
  bookingProvider: {
    fontSize: 14,
    color: Colors.text.secondary,
    marginBottom: 4,
  },
  bookingDate: {
    fontSize: 12,
    color: Colors.text.secondary,
  },
  issueTypesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginHorizontal: -4,
    marginBottom: 20,
  },
  issueTypeCard: {
    width: '25%',
    padding: 8,
    alignItems: 'center',
  },
  issueTypeCardSelected: {
    opacity: 1,
  },
  issueTypeLabel: {
    fontSize: 11,
    color: Colors.text.secondary,
    textAlign: 'center',
    marginTop: 4,
  },
  issueTypeLabelSelected: {
    color: Colors.primary,
    fontWeight: '500',
  },
  inputGroup: {
    marginBottom: 20,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: Colors.text.primary,
    marginBottom: 8,
  },
  input: {
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 12,
    padding: 12,
    fontSize: 14,
    color: Colors.text.primary,
  },
  textArea: {
    minHeight: 120,
    textAlignVertical: 'top',
  },
  charCount: {
    fontSize: 11,
    color: Colors.text.secondary,
    textAlign: 'right',
    marginTop: 4,
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
    width: 80,
    height: 80,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  removeAttachment: {
    position: 'absolute',
    top: -6,
    right: -6,
    backgroundColor: Colors.surface,
    borderRadius: 10,
  },
  addAttachment: {
    width: 80,
    height: 80,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: Colors.border,
    borderStyle: 'dashed',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: Colors.background,
  },
  addAttachmentText: {
    fontSize: 10,
    color: Colors.primary,
    marginTop: 4,
  },
  priorityContainer: {
    flexDirection: 'row',
    gap: 12,
  },
  priorityButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 8,
    borderRadius: 12,
    borderWidth: 1,
    backgroundColor: Colors.background,
    gap: 6,
  },
  priorityButtonSelected: {
    backgroundColor: Colors.primary + '10',
  },
  priorityDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  priorityText: {
    fontSize: 12,
    color: Colors.text.secondary,
  },
  navigationButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 20,
    marginBottom: 40,
    gap: 12,
  },
  cancelButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.border,
    alignItems: 'center',
  },
  cancelButtonText: {
    fontSize: 16,
    color: Colors.text.secondary,
  },
  nextButton: {
    flex: 1,
    flexDirection: 'row',
    backgroundColor: Colors.primary,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  nextButtonText: {
    fontSize: 16,
    color: Colors.surface,
    fontWeight: '600',
  },
  submitButton: {
    flex: 1,
    flexDirection: 'row',
    backgroundColor: Colors.primary,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
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
  reviewCard: {
    backgroundColor: Colors.surface,
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: Colors.border,
    marginBottom: 20,
  },
  reviewSection: {
    marginBottom: 16,
  },
  reviewLabel: {
    fontSize: 12,
    color: Colors.text.secondary,
    marginBottom: 4,
  },
  reviewValue: {
    fontSize: 16,
    color: Colors.text.primary,
  },
  priorityBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  priorityBadgeText: {
    fontSize: 12,
    fontWeight: '600',
  },
  reviewAttachment: {
    width: 60,
    height: 60,
    borderRadius: 8,
    marginRight: 8,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  disclaimer: {
    flexDirection: 'row',
    backgroundColor: Colors.primary + '10',
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
    gap: 12,
  },
  disclaimerText: {
    flex: 1,
    fontSize: 13,
    color: Colors.text.secondary,
    lineHeight: 18,
  },
});