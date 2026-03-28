// components/customer/ComplaintModal.tsx
import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  ScrollView,
  TextInput,
  Alert,
  ActivityIndicator,
  Image,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { Colors } from '@/app/constants/Colors';
import { useCreateComplaint } from '../../hooks/useCustomerQueries';

interface ComplaintModalProps {
  visible: boolean;
  onClose: () => void;
  bookingId: string;
  providerId?: string;
  providerName: string;
  serviceName?: string;
  onSuccess?: () => void;
}

interface ComplaintForm {
  subject: string;
  description: string;
  issueType: string;
  priority: 'low' | 'medium' | 'high';
  attachments: string[];
}

const ISSUE_TYPES = [
  { id: 'service_quality', label: 'Poor Service Quality', icon: 'construct-outline', description: 'Work was not up to expected standards' },
  { id: 'professionalism', label: 'Unprofessional Behavior', icon: 'people-outline', description: 'Rude, disrespectful, or inappropriate conduct' },
  { id: 'late_arrival', label: 'Late Arrival / No Show', icon: 'time-outline', description: 'Provider arrived late or didn\'t show up' },
  { id: 'overcharging', label: 'Overcharging', icon: 'cash-outline', description: 'Charged more than agreed or quoted' },
  { id: 'damage', label: 'Property Damage', icon: 'warning-outline', description: 'Caused damage to property during service' },
  { id: 'incomplete', label: 'Incomplete Work', icon: 'close-circle-outline', description: 'Work was not completed as agreed' },
  { id: 'communication', label: 'Poor Communication', icon: 'chatbubble-outline', description: 'Failed to communicate properly' },
  { id: 'other', label: 'Other', icon: 'ellipsis-horizontal-outline', description: 'Other issues not listed' },
];

const PRIORITY_OPTIONS = [
  { value: 'low', label: 'Low', description: 'Minor issue, can wait', color: Colors.success, icon: 'flag-outline' },
  { value: 'medium', label: 'Medium', description: 'Needs attention soon', color: Colors.warning, icon: 'flag' },
  { value: 'high', label: 'High', description: 'Urgent - needs immediate attention', color: Colors.error, icon: 'flag' },
];

export const ComplaintModal: React.FC<ComplaintModalProps> = ({
  visible,
  onClose,
  bookingId,
  providerId,
  providerName,
  serviceName,
  onSuccess,
}) => {
  const [step, setStep] = useState(1);
  const [uploading, setUploading] = useState(false);
  const [form, setForm] = useState<ComplaintForm>({
    subject: '',
    description: '',
    issueType: '',
    priority: 'medium',
    attachments: [],
  });

  const createComplaint = useCreateComplaint();

  const handleClose = () => {
    setStep(1);
    setForm({
      subject: '',
      description: '',
      issueType: '',
      priority: 'medium',
      attachments: [],
    });
    onClose();
  };

  const handleNext = () => {
    if (step === 1 && !form.issueType) {
      Alert.alert('Error', 'Please select an issue type');
      return;
    }
    if (step === 2 && !form.subject.trim()) {
      Alert.alert('Error', 'Please enter a subject');
      return;
    }
    if (step === 2 && !form.description.trim()) {
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
      base64: false,
    });

    if (!result.canceled && result.assets) {
      setUploading(true);
      // Simulate upload (in production, you'd upload to server and get URLs)
      setTimeout(() => {
        setForm({
          ...form,
          attachments: [...form.attachments, ...result.assets.map(a => a.uri)],
        });
        setUploading(false);
      }, 500);
    }
  };

  const handleRemoveAttachment = (index: number) => {
    setForm({
      ...form,
      attachments: form.attachments.filter((_, i) => i !== index),
    });
  };

  const handleSubmit = async () => {
    try {
      await createComplaint.mutateAsync({
        booking_id: bookingId,      // snake_case for backend
        provider_id: providerId,    // new field
        type: form.issueType,       // mapped field name
        description: form.description,
        priority: form.priority,
        attachments: form.attachments,
      });

      Alert.alert(
        'Complaint Submitted',
        'Your complaint has been submitted successfully. Our team will review it within 24-48 hours.',
        [
          {
            text: 'View Complaints',
            onPress: () => {
              handleClose();
              onSuccess?.();
            },
          },
          {
            text: 'Close',
            onPress: handleClose,
          },
        ]
      );
    } catch (error) {
      console.error('Complaint submission error:', error);
      Alert.alert('Error', 'Failed to submit complaint. Please try again.');
    }
  };

  const renderStepIndicator = () => (
    <View style={styles.stepIndicator}>
      <View style={[styles.stepDot, step >= 1 && styles.stepDotActive]}>
        <Text style={[styles.stepDotText, step >= 1 && styles.stepDotTextActive]}>1</Text>
      </View>
      <View style={[styles.stepLine, step >= 2 && styles.stepLineActive]} />
      <View style={[styles.stepDot, step >= 2 && styles.stepDotActive]}>
        <Text style={[styles.stepDotText, step >= 2 && styles.stepDotTextActive]}>2</Text>
      </View>
      <View style={[styles.stepLine, step >= 3 && styles.stepLineActive]} />
      <View style={[styles.stepDot, step >= 3 && styles.stepDotActive]}>
        <Text style={[styles.stepDotText, step >= 3 && styles.stepDotTextActive]}>3</Text>
      </View>
    </View>
  );

  const renderStep1 = () => (
    <View style={styles.stepContainer}>
      <Text style={styles.stepTitle}>What's the issue?</Text>
      <Text style={styles.stepSubtitle}>
        Select the type of issue you're experiencing with {providerName}
      </Text>

      <ScrollView style={styles.issueTypesList} showsVerticalScrollIndicator={false}>
        {ISSUE_TYPES.map((type) => (
          <TouchableOpacity
            key={type.id}
            style={[
              styles.issueTypeCard,
              form.issueType === type.id && styles.issueTypeCardSelected,
            ]}
            onPress={() => setForm({ ...form, issueType: type.id })}
          >
            <View style={styles.issueTypeLeft}>
              <View style={[styles.issueTypeIcon, { backgroundColor: Colors.primary + '20' }]}>
                <Ionicons name={type.icon as keyof typeof Ionicons.glyphMap} size={24} color={Colors.primary} />
              </View>
              <View style={styles.issueTypeInfo}>
                <Text style={styles.issueTypeLabel}>{type.label}</Text>
                <Text style={styles.issueTypeDescription}>{type.description}</Text>
              </View>
            </View>
            <View style={styles.radioButton}>
              {form.issueType === type.id && <View style={styles.radioSelected} />}
            </View>
          </TouchableOpacity>
        ))}
      </ScrollView>
    </View>
  );

  const renderStep2 = () => (
    <View style={styles.stepContainer}>
      <View style={styles.stepHeader}>
        <TouchableOpacity onPress={handleBack}>
          <Ionicons name="arrow-back" size={24} color={Colors.text.primary} />
        </TouchableOpacity>
        <Text style={styles.stepTitle}>Describe the Issue</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Subject */}
        <View style={styles.formGroup}>
          <Text style={styles.formLabel}>Subject</Text>
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
        <View style={styles.formGroup}>
          <Text style={styles.formLabel}>Detailed Description</Text>
          <TextInput
            style={[styles.input, styles.textArea]}
            placeholder="Please provide as much detail as possible..."
            placeholderTextColor={Colors.text.secondary}
            value={form.description}
            onChangeText={(text) => setForm({ ...form, description: text })}
            multiline
            numberOfLines={6}
            textAlignVertical="top"
          />
        </View>

        {/* Priority */}
        <View style={styles.formGroup}>
          <Text style={styles.formLabel}>Priority</Text>
          <Text style={styles.formHint}>How urgent is this issue?</Text>
          <View style={styles.priorityContainer}>
            {PRIORITY_OPTIONS.map((priority) => (
              <TouchableOpacity
                key={priority.value}
                style={[
                  styles.priorityCard,
                  form.priority === priority.value && styles.priorityCardSelected,
                  { borderColor: priority.color + '40' }
                ]}
                onPress={() => setForm({ ...form, priority: priority.value as 'low' | 'medium' | 'high' })}
              >
                <Ionicons
                  name={priority.icon as keyof typeof Ionicons.glyphMap}
                  size={20}
                  color={form.priority === priority.value ? priority.color : Colors.text.secondary}
                />
                <View style={styles.priorityInfo}>
                  <Text style={[
                    styles.priorityLabel,
                    form.priority === priority.value && { color: priority.color }
                  ]}>
                    {priority.label}
                  </Text>
                  <Text style={styles.priorityDescription}>{priority.description}</Text>
                </View>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      </ScrollView>
    </View>
  );

  const renderStep3 = () => (
    <View style={styles.stepContainer}>
      <View style={styles.stepHeader}>
        <TouchableOpacity onPress={handleBack}>
          <Ionicons name="arrow-back" size={24} color={Colors.text.primary} />
        </TouchableOpacity>
        <Text style={styles.stepTitle}>Add Evidence</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView showsVerticalScrollIndicator={false}>
        <Text style={styles.stepSubtitle}>
          Upload photos or screenshots as evidence (optional)
        </Text>

        {/* Attachments */}
        <View style={styles.attachmentsContainer}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            {form.attachments.map((uri, index) => (
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

        {/* Tips */}
        <View style={styles.tipsContainer}>
          <Text style={styles.tipsTitle}>📸 Tips for good evidence:</Text>
          <View style={styles.tipItem}>
            <Ionicons name="checkmark-circle" size={16} color={Colors.success} />
            <Text style={styles.tipText}>Take clear, well-lit photos</Text>
          </View>
          <View style={styles.tipItem}>
            <Ionicons name="checkmark-circle" size={16} color={Colors.success} />
            <Text style={styles.tipText}>Include screenshots of messages if relevant</Text>
          </View>
          <View style={styles.tipItem}>
            <Ionicons name="checkmark-circle" size={16} color={Colors.success} />
            <Text style={styles.tipText}>Show the issue from multiple angles</Text>
          </View>
        </View>

        {/* Summary */}
        <View style={styles.summaryCard}>
          <Text style={styles.summaryTitle}>Complaint Summary</Text>
          
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Issue Type:</Text>
            <Text style={styles.summaryValue}>
              {ISSUE_TYPES.find(t => t.id === form.issueType)?.label || 'Not selected'}
            </Text>
          </View>
          
          <View style={styles.summaryDivider} />
          
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Priority:</Text>
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
          
          <View style={styles.summaryDivider} />
          
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Attachments:</Text>
            <Text style={styles.summaryValue}>{form.attachments.length} file(s)</Text>
          </View>
        </View>
      </ScrollView>
    </View>
  );

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent
      onRequestClose={handleClose}
    >
      <View style={styles.modalOverlay}>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.modalContent}
        >
          {/* Header */}
          <View style={styles.modalHeader}>
            <TouchableOpacity onPress={handleClose}>
              <Ionicons name="close" size={24} color={Colors.text.primary} />
            </TouchableOpacity>
            <Text style={styles.modalTitle}>File a Complaint</Text>
            <View style={{ width: 24 }} />
          </View>

          {/* Provider Info */}
          <View style={styles.providerBar}>
            <View>
              <Text style={styles.providerBarName}>{providerName}</Text>
              {serviceName && <Text style={styles.providerBarService}>{serviceName}</Text>}
            </View>
            <View style={styles.warningIcon}>
              <Ionicons name="alert-circle" size={24} color={Colors.error} />
            </View>
          </View>

          {renderStepIndicator()}

          {/* Step Content */}
          <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
            {step === 1 && renderStep1()}
            {step === 2 && renderStep2()}
            {step === 3 && renderStep3()}
          </ScrollView>

          {/* Footer */}
          <View style={styles.modalFooter}>
            {step < 3 ? (
              <TouchableOpacity style={styles.nextButton} onPress={handleNext}>
                <Text style={styles.nextButtonText}>Next</Text>
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
                  style={[styles.submitButton, createComplaint.isPending && styles.submitButtonDisabled]}
                  onPress={handleSubmit}
                  disabled={createComplaint.isPending}
                >
                  {createComplaint.isPending ? (
                    <ActivityIndicator size="small" color={Colors.surface} />
                  ) : (
                    <>
                      <Text style={styles.submitButtonText}>Submit</Text>
                      <Ionicons name="send" size={20} color={Colors.surface} />
                    </>
                  )}
                </TouchableOpacity>
              </View>
            )}
          </View>
        </KeyboardAvoidingView>
      </View>
    </Modal>
  );
};

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
  providerBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: Colors.error + '10',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: Colors.error + '20',
  },
  providerBarName: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.text.primary,
  },
  providerBarService: {
    fontSize: 12,
    color: Colors.text.secondary,
    marginTop: 2,
  },
  warningIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.error + '20',
    justifyContent: 'center',
    alignItems: 'center',
  },
  stepIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 40,
    paddingVertical: 15,
  },
  stepDot: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: Colors.background,
    borderWidth: 2,
    borderColor: Colors.border,
    justifyContent: 'center',
    alignItems: 'center',
  },
  stepDotActive: {
    backgroundColor: Colors.error,
    borderColor: Colors.error,
  },
  stepDotText: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.text.secondary,
  },
  stepDotTextActive: {
    color: Colors.surface,
  },
  stepLine: {
    flex: 1,
    height: 2,
    backgroundColor: Colors.border,
    marginHorizontal: 8,
  },
  stepLineActive: {
    backgroundColor: Colors.error,
  },
  content: {
    flex: 1,
    padding: 20,
  },
  stepContainer: {
    flex: 1,
  },
  stepHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
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
  issueTypesList: {
    maxHeight: 500,
  },
  issueTypeCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: Colors.background,
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  issueTypeCardSelected: {
    borderColor: Colors.error,
    backgroundColor: Colors.error + '10',
  },
  issueTypeLeft: {
    flex: 1,
    flexDirection: 'row',
  },
  issueTypeIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  issueTypeInfo: {
    flex: 1,
  },
  issueTypeLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.text.primary,
    marginBottom: 4,
  },
  issueTypeDescription: {
    fontSize: 12,
    color: Colors.text.secondary,
  },
  radioButton: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: Colors.error,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 12,
  },
  radioSelected: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: Colors.error,
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
  formHint: {
    fontSize: 12,
    color: Colors.text.secondary,
    marginBottom: 12,
  },
  input: {
    backgroundColor: Colors.background,
    borderRadius: 12,
    padding: 12,
    fontSize: 16,
    color: Colors.text.primary,
    borderWidth: 1,
    borderColor: Colors.border,
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
  priorityContainer: {
    gap: 12,
  },
  priorityCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.background,
    borderRadius: 12,
    padding: 16,
    borderWidth: 2,
    borderColor: 'transparent',
    gap: 12,
  },
  priorityCardSelected: {
    backgroundColor: Colors.primary + '10',
  },
  priorityInfo: {
    flex: 1,
  },
  priorityLabel: {
    fontSize: 15,
    fontWeight: '600',
    color: Colors.text.primary,
    marginBottom: 2,
  },
  priorityDescription: {
    fontSize: 12,
    color: Colors.text.secondary,
  },
  attachmentsContainer: {
    marginBottom: 20,
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
  tipsContainer: {
    backgroundColor: Colors.info + '10',
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: Colors.info + '20',
  },
  tipsTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.text.primary,
    marginBottom: 12,
  },
  tipItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
    gap: 8,
  },
  tipText: {
    fontSize: 13,
    color: Colors.text.secondary,
    flex: 1,
  },
  summaryCard: {
    backgroundColor: Colors.background,
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  summaryTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: Colors.text.primary,
    marginBottom: 12,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  summaryLabel: {
    fontSize: 13,
    color: Colors.text.secondary,
  },
  summaryValue: {
    fontSize: 13,
    color: Colors.text.primary,
    fontWeight: '500',
  },
  summaryDivider: {
    height: 1,
    backgroundColor: Colors.border,
    marginVertical: 8,
  },
  priorityBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  priorityBadgeText: {
    fontSize: 11,
    fontWeight: '600',
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
    backgroundColor: Colors.error,
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
  submitButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.error,
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