// components/customer/ReviewModal.tsx
import { Colors } from "@/app/constants/Colors";
import { Ionicons } from "@expo/vector-icons";
import React, { useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { useCreateReview } from "../../hooks/useCustomerQueries";
import { RatingStars } from "./ratingstars";

interface ReviewModalProps {
  visible: boolean;
  onClose: () => void;
  bookingId: string;
  providerName: string;
  serviceName: string;
  providerImage?: string;
  onSuccess?: () => void;
}

interface CriteriaRating {
  punctuality: number;
  quality: number;
  professionalism: number;
  communication: number;
  valueForMoney: number;
}

const CRITERIA = [
  { key: "punctuality" as const, label: "Punctuality", icon: "time-outline" },
  {
    key: "quality" as const,
    label: "Quality of Work",
    icon: "construct-outline",
  },
  {
    key: "professionalism" as const,
    label: "Professionalism",
    icon: "people-outline",
  },
  {
    key: "communication" as const,
    label: "Communication",
    icon: "chatbubble-outline",
  },
  {
    key: "valueForMoney" as const,
    label: "Value for Money",
    icon: "wallet-outline",
  },
];

const RECOMMEND_OPTIONS = [
  {
    value: true,
    label: "Yes, I would recommend",
    icon: "thumbs-up",
    color: Colors.success,
  },
  {
    value: false,
    label: "No, I would not recommend",
    icon: "thumbs-down",
    color: Colors.error,
  },
];

export const ReviewModal: React.FC<ReviewModalProps> = ({
  visible,
  onClose,
  bookingId,
  providerName,
  serviceName,
  onSuccess,
}) => {
  const [step, setStep] = useState(1);
  const [rating, setRating] = useState(0);
  const [criteriaRatings, setCriteriaRatings] = useState<CriteriaRating>({
    punctuality: 0,
    quality: 0,
    professionalism: 0,
    communication: 0,
    valueForMoney: 0,
  });
  const [comment, setComment] = useState("");
  const [isRecommended, setIsRecommended] = useState(true);
  const [isAnonymous, setIsAnonymous] = useState(false);
  const [allowPhotos, setAllowPhotos] = useState(true);

  const createReview = useCreateReview();

  const handleClose = () => {
    setStep(1);
    setRating(0);
    setCriteriaRatings({
      punctuality: 0,
      quality: 0,
      professionalism: 0,
      communication: 0,
      valueForMoney: 0,
    });
    setComment("");
    setIsRecommended(true);
    setIsAnonymous(false);
    setAllowPhotos(true);
    onClose();
  };

  const handleNext = () => {
    if (step === 1 && rating === 0) {
      Alert.alert("Error", "Please select an overall rating");
      return;
    }
    setStep(step + 1);
  };

  const handleBack = () => {
    setStep(step - 1);
  };

  const isCriteriaComplete = () => {
    return Object.values(criteriaRatings).every((value) => value > 0);
  };

  const calculateAverageRating = () => {
    const values = Object.values(criteriaRatings);
    const sum = values.reduce((acc, val) => acc + val, 0);
    return sum / values.length;
  };

  const handleSubmit = async () => {
    if (!isCriteriaComplete()) {
      Alert.alert("Error", "Please rate all criteria");
      return;
    }

    try {
      await createReview.mutateAsync({
        bookingId,
        rating,
        criteriaRatings,
        comment: comment.trim() || undefined,
        isRecommended,
        isAnonymous,
      });

      Alert.alert(
        "Thank You!",
        "Your review has been submitted successfully.",
        [{ text: "OK", onPress: onSuccess || handleClose }],
      );
    } catch (error) {
      Alert.alert("Error", "Failed to submit review. Please try again.");
    }
  };

  const renderStep1 = () => (
    <View style={styles.stepContainer}>
      <View style={styles.providerInfo}>
        <View style={styles.providerAvatar}>
          <Text style={styles.providerInitials}>
            {providerName
              .split(" ")
              .map((n) => n[0])
              .join("")}
          </Text>
        </View>
        <View style={styles.providerDetails}>
          <Text style={styles.providerName}>{providerName}</Text>
          <Text style={styles.serviceName}>{serviceName}</Text>
        </View>
      </View>

      <Text style={styles.stepTitle}>How was your experience?</Text>
      <Text style={styles.stepSubtitle}>
        Tap a star to rate your overall satisfaction
      </Text>

      <View style={styles.ratingContainer}>
        <RatingStars
          rating={rating}
          size={48}
          editable
          onRatingChange={setRating}
        />
        <Text style={styles.ratingLabel}>
          {rating === 0 ? "Tap to rate" : `${rating} out of 5`}
        </Text>
        {rating > 0 && (
          <Text style={styles.ratingMessage}>
            {rating >= 4 ? "Great! Tell us more" : "Thanks for your feedback"}
          </Text>
        )}
      </View>

      <TouchableOpacity
        style={[styles.nextButton, rating === 0 && styles.nextButtonDisabled]}
        onPress={handleNext}
        disabled={rating === 0}
      >
        <Text style={styles.nextButtonText}>Continue</Text>
        <Ionicons name="arrow-forward" size={20} color={Colors.surface} />
      </TouchableOpacity>
    </View>
  );

  const renderStep2 = () => (
    <View style={styles.stepContainer}>
      <View style={styles.stepHeader}>
        <TouchableOpacity onPress={handleBack}>
          <Ionicons name="arrow-back" size={24} color={Colors.text.primary} />
        </TouchableOpacity>
        <Text style={styles.stepTitle}>Rate Specifics</Text>
        <View style={{ width: 24 }} />
      </View>

      <Text style={styles.stepSubtitle}>
        Help us understand your experience better
      </Text>

      <ScrollView
        style={styles.criteriaContainer}
        showsVerticalScrollIndicator={false}
      >
        {CRITERIA.map((criteria) => (
          <View key={criteria.key} style={styles.criteriaRow}>
            <View style={styles.criteriaLabel}>
              <Ionicons
                name={criteria.icon as keyof typeof Ionicons.glyphMap}
                size={20}
                color={Colors.primary}
              />
              <Text style={styles.criteriaText}>{criteria.label}</Text>
            </View>
            <RatingStars
              rating={criteriaRatings[criteria.key]}
              size={24}
              editable
              onRatingChange={(value) =>
                setCriteriaRatings({
                  ...criteriaRatings,
                  [criteria.key]: value,
                })
              }
            />
          </View>
        ))}

        {/* Live Average */}
        {isCriteriaComplete() && (
          <View style={styles.liveAverage}>
            <Text style={styles.liveAverageLabel}>Average Rating</Text>
            <View style={styles.liveAverageValue}>
              <Text style={styles.liveAverageText}>
                {calculateAverageRating().toFixed(1)}
              </Text>
              <RatingStars rating={calculateAverageRating()} size={16} />
            </View>
          </View>
        )}
      </ScrollView>

      <TouchableOpacity
        style={[
          styles.nextButton,
          !isCriteriaComplete() && styles.nextButtonDisabled,
        ]}
        onPress={() => setStep(3)}
        disabled={!isCriteriaComplete()}
      >
        <Text style={styles.nextButtonText}>Continue</Text>
        <Ionicons name="arrow-forward" size={20} color={Colors.surface} />
      </TouchableOpacity>
    </View>
  );

  const renderStep3 = () => (
    <View style={styles.stepContainer}>
      <View style={styles.stepHeader}>
        <TouchableOpacity onPress={() => setStep(2)}>
          <Ionicons name="arrow-back" size={24} color={Colors.text.primary} />
        </TouchableOpacity>
        <Text style={styles.stepTitle}>Write Review</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Comment Input */}
        <View style={styles.commentSection}>
          <Text style={styles.commentLabel}>
            Share your experience (Optional)
          </Text>
          <TextInput
            style={styles.commentInput}
            placeholder="What did you like or dislike? Any suggestions?"
            placeholderTextColor={Colors.text.secondary}
            value={comment}
            onChangeText={setComment}
            multiline
            numberOfLines={5}
            textAlignVertical="top"
          />
        </View>

        {/* Recommend Question */}
        <View style={styles.recommendSection}>
          <Text style={styles.recommendLabel}>
            Would you recommend {providerName} to others?
          </Text>
          <View style={styles.recommendOptions}>
            {RECOMMEND_OPTIONS.map((option) => (
              <TouchableOpacity
                key={option.value.toString()}
                style={[
                  styles.recommendOption,
                  isRecommended === option.value &&
                    styles.recommendOptionSelected,
                  { borderColor: option.color + "40" },
                ]}
                onPress={() => setIsRecommended(option.value)}
              >
                <Ionicons
                  name={option.icon as keyof typeof Ionicons.glyphMap}
                  size={24}
                  color={
                    isRecommended === option.value
                      ? option.color
                      : Colors.text.secondary
                  }
                />
                <Text
                  style={[
                    styles.recommendOptionText,
                    isRecommended === option.value && { color: option.color },
                  ]}
                >
                  {option.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Additional Options */}
        <View style={styles.optionsSection}>
          <TouchableOpacity
            style={styles.optionRow}
            onPress={() => setIsAnonymous(!isAnonymous)}
          >
            <View style={styles.checkbox}>
              {isAnonymous && (
                <Ionicons name="checkmark" size={16} color={Colors.primary} />
              )}
            </View>
            <Text style={styles.optionText}>Post anonymously</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.optionRow}
            onPress={() => setAllowPhotos(!allowPhotos)}
          >
            <View style={styles.checkbox}>
              {allowPhotos && (
                <Ionicons name="checkmark" size={16} color={Colors.primary} />
              )}
            </View>
            <Text style={styles.optionText}>Allow provider to add photos</Text>
          </TouchableOpacity>
        </View>

        {/* Summary */}
        <View style={styles.summaryCard}>
          <Text style={styles.summaryTitle}>Review Summary</Text>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Overall Rating</Text>
            <RatingStars rating={rating} size={16} />
          </View>
          <View style={styles.summaryDivider} />
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Average Rating</Text>
            <Text style={styles.summaryValue}>
              {calculateAverageRating().toFixed(1)}
            </Text>
          </View>
        </View>
      </ScrollView>

      <TouchableOpacity
        style={[
          styles.submitButton,
          createReview?.isPending && styles.submitButtonDisabled,
        ]}
        onPress={handleSubmit}
        disabled={createReview?.isPending}
      >
        {createReview?.isPending ? (
          <ActivityIndicator size="small" color={Colors.surface} />
        ) : (
          <>
            <Text style={styles.submitButtonText}>Submit Review</Text>
            <Ionicons
              name="checkmark-circle"
              size={20}
              color={Colors.surface}
            />
          </>
        )}
      </TouchableOpacity>
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
        <View style={styles.modalContent}>
          {/* Header */}
          <View style={styles.modalHeader}>
            <TouchableOpacity onPress={handleClose}>
              <Ionicons name="close" size={24} color={Colors.text.primary} />
            </TouchableOpacity>
            <Text style={styles.modalTitle}>Write a Review</Text>
            <View style={{ width: 24 }} />
          </View>

          {/* Progress Steps */}
          <View style={styles.progressContainer}>
            <View
              style={[
                styles.progressStep,
                step >= 1 && styles.progressStepActive,
              ]}
            >
              <Text
                style={[
                  styles.progressStepText,
                  step >= 1 && styles.progressStepTextActive,
                ]}
              >
                1
              </Text>
            </View>
            <View
              style={[
                styles.progressLine,
                step >= 2 && styles.progressLineActive,
              ]}
            />
            <View
              style={[
                styles.progressStep,
                step >= 2 && styles.progressStepActive,
              ]}
            >
              <Text
                style={[
                  styles.progressStepText,
                  step >= 2 && styles.progressStepTextActive,
                ]}
              >
                2
              </Text>
            </View>
            <View
              style={[
                styles.progressLine,
                step >= 3 && styles.progressLineActive,
              ]}
            />
            <View
              style={[
                styles.progressStep,
                step >= 3 && styles.progressStepActive,
              ]}
            >
              <Text
                style={[
                  styles.progressStepText,
                  step >= 3 && styles.progressStepTextActive,
                ]}
              >
                3
              </Text>
            </View>
          </View>

          {/* Step Content */}
          <ScrollView
            style={styles.content}
            showsVerticalScrollIndicator={false}
          >
            {step === 1 && renderStep1()}
            {step === 2 && renderStep2()}
            {step === 3 && renderStep3()}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "flex-end",
  },
  modalContent: {
    backgroundColor: Colors.surface,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: "90%",
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 10,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: Colors.text.primary,
  },
  progressContainer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
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
    justifyContent: "center",
    alignItems: "center",
  },
  progressStepActive: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  progressStepText: {
    fontSize: 14,
    fontWeight: "600",
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
    padding: 20,
  },
  stepContainer: {
    flex: 1,
  },
  stepHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 20,
  },
  stepTitle: {
    fontSize: 20,
    fontWeight: "bold",
    color: Colors.text.primary,
    marginBottom: 8,
    textAlign: "center",
  },
  stepSubtitle: {
    fontSize: 14,
    color: Colors.text.secondary,
    marginBottom: 20,
    textAlign: "center",
  },
  providerInfo: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 24,
    padding: 16,
    backgroundColor: Colors.background,
    borderRadius: 12,
  },
  providerAvatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: Colors.primary + "20",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  providerInitials: {
    fontSize: 18,
    fontWeight: "bold",
    color: Colors.primary,
  },
  providerDetails: {
    flex: 1,
  },
  providerName: {
    fontSize: 16,
    fontWeight: "600",
    color: Colors.text.primary,
    marginBottom: 2,
  },
  serviceName: {
    fontSize: 13,
    color: Colors.text.secondary,
  },
  ratingContainer: {
    alignItems: "center",
    marginBottom: 30,
  },
  ratingLabel: {
    marginTop: 12,
    fontSize: 14,
    color: Colors.text.secondary,
  },
  ratingMessage: {
    marginTop: 8,
    fontSize: 14,
    color: Colors.primary,
    fontWeight: "500",
  },
  criteriaContainer: {
    maxHeight: 400,
    marginBottom: 20,
  },
  criteriaRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
    paddingHorizontal: 4,
  },
  criteriaLabel: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
  },
  criteriaText: {
    marginLeft: 8,
    fontSize: 14,
    color: Colors.text.primary,
  },
  liveAverage: {
    backgroundColor: Colors.primary + "10",
    borderRadius: 12,
    padding: 16,
    marginTop: 8,
  },
  liveAverageLabel: {
    fontSize: 13,
    color: Colors.text.secondary,
    marginBottom: 4,
  },
  liveAverageValue: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  liveAverageText: {
    fontSize: 18,
    fontWeight: "bold",
    color: Colors.primary,
  },
  commentSection: {
    marginBottom: 24,
  },
  commentLabel: {
    fontSize: 14,
    fontWeight: "500",
    color: Colors.text.primary,
    marginBottom: 8,
  },
  commentInput: {
    backgroundColor: Colors.background,
    borderRadius: 12,
    padding: 12,
    fontSize: 14,
    color: Colors.text.primary,
    minHeight: 100,
    borderWidth: 1,
    borderColor: Colors.border,
    textAlignVertical: "top",
  },
  recommendSection: {
    marginBottom: 24,
  },
  recommendLabel: {
    fontSize: 14,
    fontWeight: "500",
    color: Colors.text.primary,
    marginBottom: 12,
  },
  recommendOptions: {
    flexDirection: "row",
    gap: 12,
  },
  recommendOption: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    padding: 12,
    borderRadius: 12,
    borderWidth: 2,
    gap: 8,
  },
  recommendOptionSelected: {
    backgroundColor: Colors.primary + "10",
  },
  recommendOptionText: {
    fontSize: 13,
    fontWeight: "500",
  },
  optionsSection: {
    marginBottom: 24,
  },
  optionRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
  },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: Colors.primary,
    marginRight: 12,
    justifyContent: "center",
    alignItems: "center",
  },
  optionText: {
    fontSize: 14,
    color: Colors.text.primary,
  },
  summaryCard: {
    backgroundColor: Colors.background,
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
  },
  summaryTitle: {
    fontSize: 15,
    fontWeight: "600",
    color: Colors.text.primary,
    marginBottom: 12,
  },
  summaryRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  summaryLabel: {
    fontSize: 13,
    color: Colors.text.secondary,
  },
  summaryValue: {
    fontSize: 15,
    fontWeight: "600",
    color: Colors.primary,
  },
  summaryDivider: {
    height: 1,
    backgroundColor: Colors.border,
    marginVertical: 8,
  },
  nextButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: Colors.primary,
    paddingVertical: 16,
    borderRadius: 12,
    gap: 8,
    marginTop: 20,
  },
  nextButtonDisabled: {
    opacity: 0.5,
  },
  nextButtonText: {
    fontSize: 16,
    color: Colors.surface,
    fontWeight: "600",
  },
  submitButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: Colors.success,
    paddingVertical: 16,
    borderRadius: 12,
    gap: 8,
    marginTop: 20,
  },
  submitButtonDisabled: {
    opacity: 0.5,
  },
  submitButtonText: {
    fontSize: 16,
    color: Colors.surface,
    fontWeight: "600",
  },
});
