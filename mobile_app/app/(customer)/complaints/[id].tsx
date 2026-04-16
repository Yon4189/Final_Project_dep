// app/(customer)/complaints/[id].tsx
import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  TextInput,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { Ionicons } from '@expo/vector-icons';
import {Colors} from '../../constants/Colors';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { customerService } from '@/app/services/customer.service';
import { LoadingSpinner } from '@/components/common/LoadingSpinner';
import { format } from 'date-fns';

interface Complaint {
  id: string;
  complaintNumber: string;
  status: 'pending' | 'under_review' | 'resolved' | 'rejected';
  priority: 'low' | 'medium' | 'high';
  issueType: string;
  subject: string;
  description: string;
  providerName: string;
  providerImage?: string;
  serviceName?: string;
  bookingId: string;
  createdAt: string;
  resolvedAt?: string;
  rejectedAt?: string;
  resolution?: string;
  rejectionReason?: string;
  attachments?: string[];
  responses?: Array<{
    message: string;
    createdAt: string;
  }>;
  userResponses?: Array<{
    message: string;
    createdAt: string;
  }>;
}

const STATUS_COLORS = {
  pending: Colors.warning,
  under_review: Colors.primary, // Changed from Colors.info
  resolved: Colors.success,
  rejected: Colors.error,
};

const STATUS_ICONS: Record<string, keyof typeof Ionicons.glyphMap> = {
  pending: 'time-outline',
  under_review: 'eye-outline',
  resolved: 'checkmark-circle-outline',
  rejected: 'close-circle-outline',
};

const STATUS_LABELS = {
  pending: 'complaints.status.pending',
  under_review: 'complaints.status.underReview',
  resolved: 'complaints.status.resolved',
  rejected: 'complaints.status.rejected',
};

export default function ComplaintDetails() {
  const { id } = useLocalSearchParams();
  const router = useRouter();
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const [responseMessage, setResponseMessage] = useState('');
  const [isAddingResponse, setIsAddingResponse] = useState(false);

  const { data: complaint, isLoading } = useQuery({
    queryKey: ['complaint', id],
    queryFn: async () => {
      const response = await customerService.getComplaintDetails(id as string);
      if (!response.success) {
        throw new Error(response.message);
      }
      return response.data as Complaint;
    },
  });

  const addResponseMutation = useMutation({
    mutationFn: (message: string) => 
      customerService.addComplaintResponse(id as string, message),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['complaint', id] });
      setResponseMessage('');
      setIsAddingResponse(false);
      Alert.alert(t('common.success', 'Success'), t('complaints.addResponseSuccess', 'Response added successfully'));
    },
    onError: (error) => {
      Alert.alert(t('common.error', 'Error'), error.message || t('chat.sendError', 'Failed to add response'));
    },
  });

  if (isLoading) {
    return <LoadingSpinner />;
  }

  if (!complaint) {
    return (
      <View style={styles.errorContainer}>
        <Ionicons name="alert-circle-outline" size={64} color={Colors.error} />
        <Text style={styles.errorText}>{t('complaints.notFound', 'Complaint not found')}</Text>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <Text style={styles.backButtonText}>{t('complaints.goBack', 'Go Back')}</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const getStatusColor = (status: string) => {
    return STATUS_COLORS[status as keyof typeof STATUS_COLORS] || Colors.text.secondary;
  };

  const getStatusIcon = (status: string) => {
    return STATUS_ICONS[status] || 'help-outline';
  };

  const getStatusLabel = (status: string) => {
    return t(STATUS_LABELS[status as keyof typeof STATUS_LABELS] || status);
  };

  const handleAddResponse = () => {
    if (!responseMessage.trim()) {
      Alert.alert(t('common.error', 'Error'), t('complaints.enterMessage', 'Please enter a message'));
      return;
    }
    addResponseMutation.mutate(responseMessage);
  };

  const renderHeader = () => (
    <View style={styles.header}>
      <View style={styles.headerTop}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={Colors.text.primary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{t('complaints.detailsTitle', 'Complaint Details')}</Text>
        <View style={{ width: 40 }} />
      </View>

      <View style={styles.complaintHeader}>
        <View style={styles.complaintNumberContainer}>
          <Text style={styles.complaintNumberLabel}>{t('complaints.numberLabel', 'Complaint #')}</Text>
          <Text style={styles.complaintNumber}>{complaint.complaintNumber}</Text>
        </View>

        <View style={[styles.statusBadge, { backgroundColor: getStatusColor(complaint.status) + '20' }]}>
          <Ionicons name={getStatusIcon(complaint.status)} size={16} color={getStatusColor(complaint.status)} />
          <Text style={[styles.statusText, { color: getStatusColor(complaint.status) }]}>
            {getStatusLabel(complaint.status)}
          </Text>
        </View>
      </View>

      <View style={styles.dateContainer}>
        <Ionicons name="calendar-outline" size={14} color={Colors.text.secondary} />
        <Text style={styles.dateText}>
        {t('complaints.submittedOn', { date: format(new Date(complaint.createdAt), 'MMMM d, yyyy'), defaultValue: `Submitted on ${format(new Date(complaint.createdAt), 'MMMM d, yyyy')}` })}
        </Text>
      </View>
    </View>
  );

  const renderProviderInfo = () => (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>{t('complaints.serviceProvider', 'Service Provider')}</Text>
      <View style={styles.providerCard}>
        <Image
          source={{ uri: complaint.providerImage || 'https://via.placeholder.com/50' }}
          style={styles.providerImage}
        />
        <View style={styles.providerInfo}>
          <Text style={styles.providerName}>{complaint.providerName}</Text>
          <Text style={styles.providerService}>{complaint.serviceName || t('complaints.serviceNotSpecified', 'Service not specified')}</Text>
          <TouchableOpacity 
            style={styles.viewBookingButton}
            onPress={() => router.push(`/(customer)/requests/${complaint.bookingId}`)}
          >
            <Text style={styles.viewBookingText}>{t('complaints.viewBooking', 'View Booking')}</Text>
            <Ionicons name="chevron-forward" size={14} color={Colors.primary} />
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );

  const renderComplaintDetails = () => (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>{t('complaints.detailsLabel', 'Complaint Details')}</Text>
      
      <View style={styles.detailsCard}>
        <View style={styles.detailItem}>
          <Text style={styles.detailLabel}>{t('complaints.issueTypeLabel', 'Issue Type')}</Text>
          <Text style={styles.detailValue}>{complaint.issueType}</Text>
        </View>

        <View style={styles.detailItem}>
          <Text style={styles.detailLabel}>{t('complaints.priorityLabel', 'Priority')}</Text>
          <View style={[styles.priorityBadge, { 
            backgroundColor: 
              complaint.priority === 'high' ? Colors.error + '20' :
              complaint.priority === 'medium' ? Colors.warning + '20' :
              Colors.success + '20'
          }]}>
            <Text style={[styles.priorityText, { 
              color: 
                complaint.priority === 'high' ? Colors.error :
                complaint.priority === 'medium' ? Colors.warning :
                Colors.success
            }]}>
              {t(`complaints.priorities.${complaint.priority?.toLowerCase() || 'medium'}`, complaint.priority?.toUpperCase() || 'MEDIUM')}
            </Text>
          </View>
        </View>

        <View style={styles.detailItem}>
          <Text style={styles.detailLabel}>{t('complaints.subjectLabel', 'Subject')}</Text>
          <Text style={styles.detailValue}>{complaint.subject}</Text>
        </View>

        <View style={styles.detailItem}>
          <Text style={styles.detailLabel}>{t('complaints.descriptionLabel', 'Description')}</Text>
          <Text style={styles.detailValue}>{complaint.description}</Text>
        </View>

        {complaint.attachments && complaint.attachments.length > 0 && (
          <View style={styles.attachmentsContainer}>
            <Text style={styles.detailLabel}>{t('complaints.attachmentsLabel', 'Attachments')}</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              {complaint.attachments.map((uri: string, index: number) => (
                <TouchableOpacity key={index} style={styles.attachmentItem}>
                  <Image source={{ uri }} style={styles.attachmentImage} />
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        )}
      </View>
    </View>
  );

  const renderTimeline = () => (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>{t('complaints.timelineLabel', 'Timeline')}</Text>
      
      <View style={styles.timelineCard}>
        {/* Submitted Event */}
        <View style={styles.timelineItem}>
          <View style={styles.timelineLeft}>
            <View style={[styles.timelineDot, styles.timelineDotCompleted]}>
              <Ionicons name="checkmark" size={12} color={Colors.surface} />
            </View>
            <View style={styles.timelineLine} />
          </View>
          <View style={styles.timelineContent}>
            <Text style={styles.timelineTitle}>{t('complaints.submittedEvent', 'Complaint Submitted')}</Text>
            <Text style={styles.timelineTime}>
              {format(new Date(complaint.createdAt), 'MMM d, yyyy • h:mm a')}
            </Text>
          </View>
        </View>

        {/* Status Change Events */}
        {complaint.status === 'under_review' && (
          <View style={styles.timelineItem}>
            <View style={styles.timelineLeft}>
              <View style={[styles.timelineDot, styles.timelineDotActive]}>
                <Ionicons name="eye" size={12} color={Colors.surface} />
              </View>
              <View style={styles.timelineLine} />
            </View>
            <View style={styles.timelineContent}>
              <Text style={styles.timelineTitle}>{t('complaints.underReviewEvent', 'Under Review')}</Text>
              <Text style={styles.timelineTime}>
                {t('complaints.underReviewDesc', 'Our team is investigating your complaint')}
              </Text>
            </View>
          </View>
        )}

        {complaint.status === 'resolved' && complaint.resolvedAt && (
          <View style={styles.timelineItem}>
            <View style={styles.timelineLeft}>
              <View style={[styles.timelineDot, styles.timelineDotCompleted]}>
                <Ionicons name="checkmark" size={12} color={Colors.surface} />
              </View>
            </View>
            <View style={styles.timelineContent}>
              <Text style={styles.timelineTitle}>{t('complaints.resolvedEvent', 'Resolved')}</Text>
              <Text style={styles.timelineTime}>
                {format(new Date(complaint.resolvedAt), 'MMM d, yyyy • h:mm a')}
              </Text>
              {complaint.resolution && (
                <Text style={styles.timelineDescription}>{complaint.resolution}</Text>
              )}
            </View>
          </View>
        )}

        {complaint.status === 'rejected' && (
          <View style={styles.timelineItem}>
            <View style={styles.timelineLeft}>
              <View style={[styles.timelineDot, styles.timelineDotError]}>
                <Ionicons name="close" size={12} color={Colors.surface} />
              </View>
            </View>
            <View style={styles.timelineContent}>
              <Text style={styles.timelineTitle}>{t('complaints.rejectedEvent', 'Rejected')}</Text>
              <Text style={styles.timelineTime}>
                {complaint.rejectedAt ? format(new Date(complaint.rejectedAt), 'MMM d, yyyy') : ''}
              </Text>
              {complaint.rejectionReason && (
                <Text style={styles.timelineDescription}>{complaint.rejectionReason}</Text>
              )}
            </View>
          </View>
        )}
      </View>
    </View>
  );

  const renderAdminResponses = () => {
    if (!complaint.responses || complaint.responses.length === 0) {
      return null;
    }

    return (
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>{t('complaints.adminResponses', 'Admin Responses')}</Text>
        
        {complaint.responses.map((response: any, index: number) => (
          <View key={index} style={styles.responseCard}>
            <View style={styles.responseHeader}>
              <View style={styles.responseAuthor}>
                <Ionicons name="shield-checkmark" size={20} color={Colors.primary} />
                <Text style={styles.responseAuthorName}>{t('complaints.supportName', 'HomeLink Support')}</Text>
              </View>
              <Text style={styles.responseTime}>
                {format(new Date(response.createdAt), 'MMM d, h:mm a')}
              </Text>
            </View>
            <Text style={styles.responseMessage}>{response.message}</Text>
          </View>
        ))}
      </View>
    );
  };

  const renderUserResponses = () => {
    if (!complaint.userResponses || complaint.userResponses.length === 0) {
      return null;
    }

    return (
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>{t('complaints.yourResponses', 'Your Responses')}</Text>
        
        {complaint.userResponses.map((response: any, index: number) => (
          <View key={index} style={[styles.responseCard, styles.userResponseCard]}>
            <View style={styles.responseHeader}>
              <View style={styles.responseAuthor}>
                <Ionicons name="person-circle" size={20} color={Colors.text.secondary} />
                <Text style={styles.responseAuthorName}>{t('complaints.you', 'You')}</Text>
              </View>
              <Text style={styles.responseTime}>
                {format(new Date(response.createdAt), 'MMM d, h:mm a')}
              </Text>
            </View>
            <Text style={styles.responseMessage}>{response.message}</Text>
          </View>
        ))}
      </View>
    );
  };

  const renderAddResponse = () => {
    if (complaint.status === 'resolved' || complaint.status === 'rejected') {
      return (
        <View style={styles.closedContainer}>
          <Ionicons 
            name={complaint.status === 'resolved' ? 'checkmark-circle' : 'close-circle'} 
            size={24} 
            color={complaint.status === 'resolved' ? Colors.success : Colors.error} 
          />
          <Text style={styles.closedText}>
            {t('complaints.closedMsg', { status: t(STATUS_LABELS[complaint.status as keyof typeof STATUS_LABELS] || complaint.status), defaultValue: `This complaint is ${complaint.status}. No further responses can be added.` })}
          </Text>
        </View>
      );
    }

    return (
      <View style={styles.addResponseSection}>
        <Text style={styles.sectionTitle}>{t('complaints.addResponse', 'Add Response')}</Text>
        
        {isAddingResponse ? (
          <View style={styles.addResponseContainer}>
            <TextInput
              style={styles.responseInput}
              placeholder={t('chat.typeMessage', 'Type your response...')}
              placeholderTextColor={Colors.text.secondary}
              value={responseMessage}
              onChangeText={setResponseMessage}
              multiline
              numberOfLines={4}
              textAlignVertical="top"
            />
            
            <View style={styles.responseActions}>
              <TouchableOpacity 
                style={styles.cancelResponseButton}
                onPress={() => {
                  setIsAddingResponse(false);
                  setResponseMessage('');
                }}
              >
                <Text style={styles.cancelResponseText}>{t('common.cancel', 'Cancel')}</Text>
              </TouchableOpacity>
              
              <TouchableOpacity 
                style={[
                  styles.sendResponseButton,
                  (!responseMessage.trim() || addResponseMutation.isPending) && styles.sendResponseDisabled
                ]}
                onPress={handleAddResponse}
                disabled={!responseMessage.trim() || addResponseMutation.isPending}
              >
                {addResponseMutation.isPending ? (
                  <ActivityIndicator size="small" color={Colors.surface} />
                ) : (
                  <>
                    <Text style={styles.sendResponseText}>{t('chat.send', 'Send')}</Text>
                    <Ionicons name="send" size={16} color={Colors.surface} />
                  </>
                )}
              </TouchableOpacity>
            </View>
          </View>
        ) : (
          <TouchableOpacity 
            style={styles.addResponseButton}
            onPress={() => setIsAddingResponse(true)}
          >
            <Ionicons name="add-circle-outline" size={20} color={Colors.primary} />
            <Text style={styles.addResponseText}>{t('complaints.addResponse', 'Add a response')}</Text>
          </TouchableOpacity>
        )}
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <ScrollView showsVerticalScrollIndicator={false}>
        {renderHeader()}
        {renderProviderInfo()}
        {renderComplaintDetails()}
        {renderTimeline()}
        {renderAdminResponses()}
        {renderUserResponses()}
        {renderAddResponse()}
        
        <View style={styles.bottomPadding} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  header: {
    backgroundColor: Colors.surface,
    paddingTop: 100,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
    marginBottom: 20,
  },
  headerTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    marginBottom: 16,
  },
  backButton: {
    padding: 4,
  },
  backButtonText: {
    fontSize: 16,
    color: Colors.primary,
    fontWeight: '500',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: Colors.text.primary,
  },
  complaintHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    marginBottom: 8,
  },
  complaintNumberContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  complaintNumberLabel: {
    fontSize: 13,
    color: Colors.text.secondary,
  },
  complaintNumber: {
    fontSize: 15,
    fontWeight: '600',
    color: Colors.text.primary,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    gap: 4,
  },
  statusText: {
    fontSize: 13,
    fontWeight: '500',
  },
  dateContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    gap: 6,
  },
  dateText: {
    fontSize: 12,
    color: Colors.text.secondary,
  },
  section: {
    paddingHorizontal: 20,
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.text.primary,
    marginBottom: 12,
  },
  providerCard: {
    flexDirection: 'row',
    backgroundColor: Colors.surface,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  providerImage: {
    width: 50,
    height: 50,
    borderRadius: 25,
    marginRight: 16,
  },
  providerInfo: {
    flex: 1,
  },
  providerName: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.text.primary,
    marginBottom: 4,
  },
  providerService: {
    fontSize: 14,
    color: Colors.text.secondary,
    marginBottom: 8,
  },
  viewBookingButton: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: 4,
  },
  viewBookingText: {
    fontSize: 13,
    color: Colors.primary,
  },
  detailsCard: {
    backgroundColor: Colors.surface,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  detailItem: {
    marginBottom: 16,
  },
  detailLabel: {
    fontSize: 12,
    color: Colors.text.secondary,
    marginBottom: 4,
  },
  detailValue: {
    fontSize: 15,
    color: Colors.text.primary,
    lineHeight: 22,
  },
  priorityBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  priorityText: {
    fontSize: 12,
    fontWeight: '600',
  },
  attachmentsContainer: {
    marginTop: 8,
  },
  attachmentItem: {
    marginRight: 12,
  },
  attachmentImage: {
    width: 80,
    height: 80,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  timelineCard: {
    backgroundColor: Colors.surface,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  timelineItem: {
    flexDirection: 'row',
    minHeight: 60,
  },
  timelineLeft: {
    width: 30,
    alignItems: 'center',
  },
  timelineDot: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: Colors.background,
    borderWidth: 2,
    borderColor: Colors.border,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1,
  },
  timelineDotCompleted: {
    backgroundColor: Colors.success,
    borderColor: Colors.success,
  },
  timelineDotActive: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  timelineDotError: {
    backgroundColor: Colors.error,
    borderColor: Colors.error,
  },
  timelineLine: {
    position: 'absolute',
    top: 20,
    width: 2,
    height: 40,
    backgroundColor: Colors.border,
  },
  timelineContent: {
    flex: 1,
    marginLeft: 12,
    marginBottom: 20,
  },
  timelineTitle: {
    fontSize: 15,
    fontWeight: '500',
    color: Colors.text.primary,
    marginBottom: 4,
  },
  timelineTime: {
    fontSize: 12,
    color: Colors.text.secondary,
    marginBottom: 4,
  },
  timelineDescription: {
    fontSize: 13,
    color: Colors.text.secondary,
    lineHeight: 18,
  },
  responseCard: {
    backgroundColor: Colors.surface,
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  userResponseCard: {
    backgroundColor: Colors.primary + '05',
    borderColor: Colors.primary + '20',
  },
  responseHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  responseAuthor: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  responseAuthorName: {
    fontSize: 14,
    fontWeight: '500',
    color: Colors.text.primary,
  },
  responseTime: {
    fontSize: 11,
    color: Colors.text.secondary,
  },
  responseMessage: {
    fontSize: 14,
    color: Colors.text.primary,
    lineHeight: 20,
  },
  addResponseSection: {
    paddingHorizontal: 20,
    marginBottom: 30,
  },
  addResponseButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.primary + '10',
    paddingVertical: 16,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: Colors.primary + '30',
    borderStyle: 'dashed',
    gap: 8,
  },
  addResponseText: {
    fontSize: 15,
    color: Colors.primary,
    fontWeight: '500',
  },
  addResponseContainer: {
    backgroundColor: Colors.surface,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  responseInput: {
    backgroundColor: Colors.background,
    borderRadius: 12,
    padding: 12,
    fontSize: 14,
    color: Colors.text.primary,
    minHeight: 100,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  responseActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 12,
  },
  cancelResponseButton: {
    paddingVertical: 10,
    paddingHorizontal: 16,
  },
  cancelResponseText: {
    fontSize: 14,
    color: Colors.text.secondary,
  },
  sendResponseButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.primary,
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 20,
    gap: 6,
  },
  sendResponseDisabled: {
    opacity: 0.5,
  },
  sendResponseText: {
    fontSize: 14,
    color: Colors.surface,
    fontWeight: '500',
  },
  closedContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.background,
    borderRadius: 12,
    padding: 16,
    marginHorizontal: 20,
    marginBottom: 30,
    borderWidth: 1,
    borderColor: Colors.border,
    gap: 12,
  },
  closedText: {
    flex: 1,
    fontSize: 14,
    color: Colors.text.secondary,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  errorText: {
    fontSize: 16,
    color: Colors.text.primary,
    marginTop: 16,
    marginBottom: 24,
  },
  bottomPadding: {
    height: 40,
  },
});