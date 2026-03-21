import React, { useState } from 'react';
import {
  View,
  Text,
  Modal,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  Switch,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '@/app/constants/Colors';
import { useSubmitReview } from '@/hooks/useCustomerQueries';

interface ReviewModalProps {
  visible: boolean;
  onClose: () => void;
  bookingId: string;
  providerName: string;
  serviceName?: string;
  onSuccess?: () => void;
}

export function ReviewModal({ visible, onClose, bookingId, providerName, serviceName, onSuccess }: ReviewModalProps) {
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState('');
  const [isAnonymous, setIsAnonymous] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submitReview = useSubmitReview();

  const handleSubmit = async () => {
    if (rating === 0) {
      setError('Please select a rating');
      return;
    }

    try {
      await submitReview.mutateAsync({
        bookingID: bookingId,
        rating,
        comment,
        is_anonymous: isAnonymous,
      });
      onSuccess?.();
      onClose();
      // Reset state for next time
      setRating(0);
      setComment('');
      setIsAnonymous(false);
    } catch (err: any) {
      setError(err.message || 'Failed to submit review');
    }
  };

  const renderStars = () => {
    const stars = [];
    for (let i = 1; i <= 5; i++) {
      stars.push(
        <TouchableOpacity key={i} onPress={() => { setRating(i); setError(null); }}>
          <Ionicons
            name={i <= rating ? 'star' : 'star-outline'}
            size={40}
            color={i <= rating ? '#FFD700' : Colors.text.secondary}
            style={styles.star}
          />
        </TouchableOpacity>
      );
    }
    return stars;
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={true}
      onRequestClose={onClose}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.modalOverlay}
      >
        <View style={styles.modalContent}>
          <View style={styles.header}>
            <Text style={styles.title}>Rate Your Experience</Text>
            <TouchableOpacity onPress={onClose}>
              <Ionicons name="close" size={24} color={Colors.text.primary} />
            </TouchableOpacity>
          </View>

          <ScrollView showsVerticalScrollIndicator={false}>
            <Text style={styles.subtitle}>How was your service with {providerName}?</Text>
            
            <View style={styles.starsContainer}>
              {renderStars()}
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Your Review (Optional)</Text>
              <TextInput
                style={styles.textArea}
                placeholder="Share your experience with others..."
                placeholderTextColor={Colors.text.secondary}
                multiline
                numberOfLines={4}
                value={comment}
                onChangeText={setComment}
                textAlignVertical="top"
              />
            </View>

            <View style={styles.switchGroup}>
              <View style={styles.switchTextContainer}>
                <Text style={styles.switchLabel}>Submit Anonymously</Text>
                <Text style={styles.switchDescription}>Your name won't be visible on the review</Text>
              </View>
              <Switch
                value={isAnonymous}
                onValueChange={setIsAnonymous}
                trackColor={{ false: '#767577', true: Colors.primary }}
              />
            </View>

            {error && <Text style={styles.errorText}>{error}</Text>}

            <TouchableOpacity
              style={[styles.submitButton, rating === 0 && styles.disabledButton]}
              onPress={handleSubmit}
              disabled={submitReview.isPending || rating === 0}
            >
              {submitReview.isPending ? (
                <ActivityIndicator color="#FFF" />
              ) : (
                <Text style={styles.submitButtonText}>Submit Review</Text>
              )}
            </TouchableOpacity>
          </ScrollView>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: Colors.surface,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    maxHeight: '80%',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: Colors.text.primary,
  },
  subtitle: {
    fontSize: 16,
    color: Colors.text.secondary,
    textAlign: 'center',
    marginBottom: 20,
  },
  starsContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginBottom: 30,
  },
  star: {
    marginHorizontal: 5,
  },
  inputGroup: {
    marginBottom: 20,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.text.primary,
    marginBottom: 8,
  },
  textArea: {
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 12,
    padding: 12,
    height: 120,
    color: Colors.text.primary,
    backgroundColor: Colors.background,
  },
  switchGroup: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 30,
    paddingVertical: 10,
  },
  switchTextContainer: {
    flex: 1,
    marginRight: 10,
  },
  switchLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.text.primary,
  },
  switchDescription: {
    fontSize: 12,
    color: Colors.text.secondary,
    marginTop: 2,
  },
  errorText: {
    color: Colors.error,
    fontSize: 14,
    textAlign: 'center',
    marginBottom: 15,
  },
  submitButton: {
    backgroundColor: Colors.primary,
    borderRadius: 12,
    height: 56,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  disabledButton: {
    backgroundColor: '#9CA3AF',
  },
  submitButtonText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: 'bold',
  },
});
