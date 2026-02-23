// components/customer/ServiceRequestModal.tsx
import { Colors } from "@/app/constants/Colors";
import type { ServiceProvider } from "@/app/types/customer.types";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import DateTimePicker from "@react-native-community/datetimepicker";
import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { useCreateServiceRequest } from "../../hooks/useCustomerQueries";

interface ServiceRequestModalProps {
  visible: boolean;
  onClose: () => void;
  provider: ServiceProvider | null;
  userLocation?: {
    latitude: number;
    longitude: number;
    address?: string;
  } | null;
  selectedService?: string;
}

interface RequestFormData {
  serviceId: string;
  scheduledDate: Date;
  scheduledTime: string;
  locationId?: string;
  address: string;
  description: string;
  specialInstructions: string;
  estimatedDuration?: number;
  estimatedPrice: number;
}

// Use a very flexible type for service items
type ServiceItem = Record<string, any>;

const TIME_SLOTS = [
  "08:00",
  "09:00",
  "10:00",
  "11:00",
  "12:00",
  "13:00",
  "14:00",
  "15:00",
  "16:00",
  "17:00",
  "18:00",
  "19:00",
  "20:00",
];

export const ServiceRequestModal: React.FC<ServiceRequestModalProps> = ({
  visible,
  onClose,
  provider,
  userLocation,
  selectedService,
}) => {
  const [step, setStep] = useState(1);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [loading, setLoading] = useState(false);
  const [selectedServiceDetails, setSelectedServiceDetails] =
    useState<ServiceItem | null>(null);

  const createRequest = useCreateServiceRequest();

  const [formData, setFormData] = useState<RequestFormData>({
    serviceId: "",
    scheduledDate: new Date(),
    scheduledTime: "09:00",
    address: userLocation?.address || "",
    description: "",
    specialInstructions: "",
    estimatedPrice: 0,
  });

  useEffect(() => {
    if (visible) {
      setStep(1);
      resetForm();
      if (selectedService && provider?.services) {
        // Find service by name
        const service = provider.services.find(
          (s: any) =>
            s?.serviceName === selectedService || s?.name === selectedService,
        );
        if (service) {
          setSelectedServiceDetails(service);
          // Try all possible price properties
          const price =
            (service as any).price ||
            (service as any).basePrice ||
            (service as any).customPrice ||
            0;
          setFormData((prev) => ({
            ...prev,
            serviceId: service.id,
            estimatedPrice: price,
          }));
        }
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible, selectedService, provider]);

  useEffect(() => {
    if (userLocation?.address) {
      setFormData((prev) => ({ ...prev, address: userLocation.address || "" }));
    }
  }, [userLocation]);

  const resetForm = () => {
    if (!selectedServiceDetails) {
      setFormData({
        serviceId: "",
        scheduledDate: new Date(),
        scheduledTime: "09:00",
        address: userLocation?.address || "",
        description: "",
        specialInstructions: "",
        estimatedPrice: 0,
      });
      return;
    }

    const price =
      selectedServiceDetails.price ||
      selectedServiceDetails.basePrice ||
      selectedServiceDetails.customPrice ||
      0;

    setFormData({
      serviceId: selectedServiceDetails.id || "",
      scheduledDate: new Date(),
      scheduledTime: "09:00",
      address: userLocation?.address || "",
      description: "",
      specialInstructions: "",
      estimatedPrice: price,
    });
  };

  const handleServiceSelect = (service: ServiceItem) => {
    setSelectedServiceDetails(service);
    const price =
      service.price || service.basePrice || service.customPrice || 0;
    setFormData((prev) => ({
      ...prev,
      serviceId: service.id,
      estimatedPrice: price,
    }));
  };

  const getServiceName = (service: ServiceItem): string => {
    return service?.serviceName || service?.name || "Service";
  };

  const getServiceDescription = (service: ServiceItem): string => {
    return service?.description || "Professional service";
  };

  const getServicePrice = (service: ServiceItem): number => {
    return service?.price || service?.basePrice || service?.customPrice || 0;
  };

  const getServiceDuration = (service: ServiceItem): string => {
    const duration = service?.estimatedDuration || 1;
    return `${duration}h`;
  };

  const handleDateChange = (_: any, selectedDate?: Date) => {
    setShowDatePicker(Platform.OS === "ios");
    if (selectedDate) {
      setFormData({ ...formData, scheduledDate: selectedDate });
    }
  };

  const handleTimeSelect = (time: string) => {
    setFormData({ ...formData, scheduledTime: time });
    setShowTimePicker(false);
  };

  const validateStep1 = () => {
    if (!formData.serviceId) {
      Alert.alert("Error", "Please select a service");
      return false;
    }
    return true;
  };

  const validateStep2 = () => {
    if (!formData.address.trim()) {
      Alert.alert("Error", "Please enter your address");
      return false;
    }
    return true;
  };

  const handleNext = () => {
    if (step === 1 && validateStep1()) {
      setStep(2);
    } else if (step === 2 && validateStep2()) {
      setStep(3);
    }
  };

  const handleBack = () => {
    setStep(step - 1);
  };

  const handleSubmit = async () => {
    if (!provider) return;

    setLoading(true);
    try {
      await createRequest.mutateAsync({
        providerId: provider.id,
        serviceId: formData.serviceId,
        scheduledDate: formData.scheduledDate.toISOString().split("T")[0],
        scheduledTime: formData.scheduledTime,
        address: formData.address,
        description: formData.description,
        specialInstructions: formData.specialInstructions,
      });

      Alert.alert(
        "Request Sent!",
        `Your service request has been sent to ${provider.businessName || provider.name || "the provider"}. They will respond shortly.`,
        [
          {
            text: "View Requests",
            onPress: () => {
              onClose();
              // Navigate to requests
            },
          },
          {
            text: "OK",
            onPress: onClose,
          },
        ],
      );
    } catch (error) {
      Alert.alert("Error", "Failed to send request. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const renderStepIndicator = () => (
    <View style={styles.stepIndicator}>
      <View style={[styles.stepDot, step >= 1 && styles.stepDotActive]}>
        <Text
          style={[styles.stepDotText, step >= 1 && styles.stepDotTextActive]}
        >
          1
        </Text>
      </View>
      <View style={[styles.stepLine, step >= 2 && styles.stepLineActive]} />
      <View style={[styles.stepDot, step >= 2 && styles.stepDotActive]}>
        <Text
          style={[styles.stepDotText, step >= 2 && styles.stepDotTextActive]}
        >
          2
        </Text>
      </View>
      <View style={[styles.stepLine, step >= 3 && styles.stepLineActive]} />
      <View style={[styles.stepDot, step >= 3 && styles.stepDotActive]}>
        <Text
          style={[styles.stepDotText, step >= 3 && styles.stepDotTextActive]}
        >
          3
        </Text>
      </View>
    </View>
  );

  const renderStep1 = () => (
    <View style={styles.stepContainer}>
      <Text style={styles.stepTitle}>Select Service</Text>
      <Text style={styles.stepSubtitle}>
        Choose the specific service you need from{" "}
        {provider?.businessName || provider?.name || "the provider"}
      </Text>

      <ScrollView
        style={styles.servicesList}
        showsVerticalScrollIndicator={false}
      >
        {provider?.services?.map((service: any, index: number) => (
          <TouchableOpacity
            key={service?.id || index}
            style={[
              styles.serviceCard,
              formData.serviceId === service?.id && styles.serviceCardSelected,
            ]}
            onPress={() => handleServiceSelect(service)}
          >
            <View style={styles.serviceCardLeft}>
              <View
                style={[
                  styles.serviceIcon,
                  { backgroundColor: Colors.primary + "20" },
                ]}
              >
                <MaterialCommunityIcons
                  name="wrench"
                  size={24}
                  color={Colors.primary}
                />
              </View>
              <View style={styles.serviceInfo}>
                <Text style={styles.serviceName}>
                  {getServiceName(service)}
                </Text>
                <Text style={styles.serviceDescription} numberOfLines={2}>
                  {getServiceDescription(service)}
                </Text>
                <View style={styles.serviceMeta}>
                  <Text style={styles.serviceDuration}>
                    <Ionicons name="time-outline" size={12} />{" "}
                    {getServiceDuration(service)}
                  </Text>
                  <Text style={styles.servicePrice}>
                    ${getServicePrice(service)}
                  </Text>
                </View>
              </View>
            </View>
            <View style={styles.radioButton}>
              {formData.serviceId === service?.id && (
                <View style={styles.radioSelected} />
              )}
            </View>
          </TouchableOpacity>
        ))}
      </ScrollView>
    </View>
  );

  const renderStep2 = () => (
    <View style={styles.stepContainer}>
      <Text style={styles.stepTitle}>Schedule & Location</Text>
      <Text style={styles.stepSubtitle}>
        When and where do you need the service?
      </Text>

      {/* Date Selection */}
      <View style={styles.formGroup}>
        <Text style={styles.formLabel}>Date</Text>
        <TouchableOpacity
          style={styles.datePickerButton}
          onPress={() => setShowDatePicker(true)}
        >
          <Ionicons name="calendar-outline" size={20} color={Colors.primary} />
          <Text style={styles.dateText}>
            {formData.scheduledDate.toLocaleDateString("en-US", {
              weekday: "short",
              month: "short",
              day: "numeric",
              year: "numeric",
            })}
          </Text>
        </TouchableOpacity>
        {showDatePicker && (
          <DateTimePicker
            value={formData.scheduledDate}
            mode="date"
            display={Platform.OS === "ios" ? "spinner" : "default"}
            onChange={handleDateChange}
            minimumDate={new Date()}
          />
        )}
      </View>

      {/* Time Selection */}
      <View style={styles.formGroup}>
        <Text style={styles.formLabel}>Time</Text>
        <TouchableOpacity
          style={styles.timePickerButton}
          onPress={() => setShowTimePicker(!showTimePicker)}
        >
          <Ionicons name="time-outline" size={20} color={Colors.primary} />
          <Text style={styles.timeText}>{formData.scheduledTime}</Text>
        </TouchableOpacity>

        {showTimePicker && (
          <View style={styles.timeSlotsContainer}>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              {TIME_SLOTS.map((time) => (
                <TouchableOpacity
                  key={time}
                  style={[
                    styles.timeSlot,
                    formData.scheduledTime === time && styles.timeSlotSelected,
                  ]}
                  onPress={() => handleTimeSelect(time)}
                >
                  <Text
                    style={[
                      styles.timeSlotText,
                      formData.scheduledTime === time &&
                        styles.timeSlotTextSelected,
                    ]}
                  >
                    {time}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        )}
      </View>

      {/* Address */}
      <View style={styles.formGroup}>
        <Text style={styles.formLabel}>Service Address</Text>
        <TextInput
          style={[styles.input, styles.textArea]}
          placeholder="Enter your full address"
          placeholderTextColor={Colors.text.secondary}
          value={formData.address}
          onChangeText={(text) => setFormData({ ...formData, address: text })}
          multiline
          numberOfLines={3}
          textAlignVertical="top"
        />
      </View>

      {/* Description */}
      <View style={styles.formGroup}>
        <Text style={styles.formLabel}>Job Description (Optional)</Text>
        <TextInput
          style={[styles.input, styles.textArea]}
          placeholder="Describe the work you need done..."
          placeholderTextColor={Colors.text.secondary}
          value={formData.description}
          onChangeText={(text) =>
            setFormData({ ...formData, description: text })
          }
          multiline
          numberOfLines={4}
          textAlignVertical="top"
        />
      </View>
    </View>
  );

  const renderStep3 = () => (
    <View style={styles.stepContainer}>
      <Text style={styles.stepTitle}>Review & Confirm</Text>
      <Text style={styles.stepSubtitle}>
        Please review your request details before submitting
      </Text>

      <ScrollView
        style={styles.reviewContainer}
        showsVerticalScrollIndicator={false}
      >
        {/* Service Summary */}
        <View style={styles.reviewSection}>
          <Text style={styles.reviewSectionTitle}>Service Details</Text>
          <View style={styles.reviewCard}>
            <View style={styles.reviewRow}>
              <Text style={styles.reviewLabel}>Service</Text>
              <Text style={styles.reviewValue}>
                {selectedServiceDetails
                  ? getServiceName(selectedServiceDetails)
                  : "N/A"}
              </Text>
            </View>
            <View style={styles.reviewDivider} />
            <View style={styles.reviewRow}>
              <Text style={styles.reviewLabel}>Provider</Text>
              <Text style={styles.reviewValue}>
                {provider?.businessName || provider?.name || "N/A"}
              </Text>
            </View>
            <View style={styles.reviewDivider} />
            <View style={styles.reviewRow}>
              <Text style={styles.reviewLabel}>Date & Time</Text>
              <Text style={styles.reviewValue}>
                {formData.scheduledDate.toLocaleDateString()} at{" "}
                {formData.scheduledTime}
              </Text>
            </View>
          </View>
        </View>

        {/* Location Summary */}
        <View style={styles.reviewSection}>
          <Text style={styles.reviewSectionTitle}>Location</Text>
          <View style={styles.reviewCard}>
            <Text style={styles.reviewAddress}>
              {formData.address || "No address provided"}
            </Text>
          </View>
        </View>

        {/* Price Summary */}
        <View style={styles.reviewSection}>
          <Text style={styles.reviewSectionTitle}>Price Estimate</Text>
          <View style={styles.reviewCard}>
            <View style={styles.reviewRow}>
              <Text style={styles.reviewLabel}>Service Price</Text>
              <Text style={styles.reviewPrice}>
                ${(formData.estimatedPrice || 0).toFixed(2)}
              </Text>
            </View>
            <View style={styles.reviewDivider} />
            <View style={styles.reviewRow}>
              <Text style={styles.reviewLabel}>Service Fee</Text>
              <Text style={styles.reviewPrice}>
                ${((formData.estimatedPrice || 0) * 0.05).toFixed(2)}
              </Text>
            </View>
            <View style={styles.reviewDivider} />
            <View style={[styles.reviewRow, styles.totalRow]}>
              <Text style={styles.totalLabel}>Total</Text>
              <Text style={styles.totalValue}>
                ${((formData.estimatedPrice || 0) * 1.05).toFixed(2)}
              </Text>
            </View>
          </View>
          <Text style={styles.priceNote}>
            *Final price may vary based on actual work required
          </Text>
        </View>

        {/* Instructions (if any) */}
        {formData.specialInstructions ? (
          <View style={styles.reviewSection}>
            <Text style={styles.reviewSectionTitle}>Special Instructions</Text>
            <View style={styles.reviewCard}>
              <Text style={styles.reviewInstructions}>
                {formData.specialInstructions}
              </Text>
            </View>
          </View>
        ) : null}
      </ScrollView>
    </View>
  );

  if (!provider) return null;

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent
      onRequestClose={onClose}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          {/* Header */}
          <View style={styles.modalHeader}>
            <TouchableOpacity onPress={step > 1 ? handleBack : onClose}>
              <Ionicons
                name={step > 1 ? "arrow-back" : "close"}
                size={24}
                color={Colors.text.primary}
              />
            </TouchableOpacity>
            <Text style={styles.modalTitle}>Request Service</Text>
            <View style={{ width: 24 }} />
          </View>

          {renderStepIndicator()}

          {/* Provider Info Bar */}
          <View style={styles.providerBar}>
            <Text style={styles.providerBarName}>
              {provider.businessName || provider.name || "Provider"}
            </Text>
            <View style={styles.providerBarRating}>
              <Ionicons name="star" size={14} color={Colors.warning} />
              <Text style={styles.providerBarRatingText}>
                {provider.rating?.toFixed(1) || "0.0"}
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

          {/* Footer */}
          <View style={styles.modalFooter}>
            {step < 3 ? (
              <TouchableOpacity style={styles.nextButton} onPress={handleNext}>
                <Text style={styles.nextButtonText}>Next</Text>
                <Ionicons
                  name="arrow-forward"
                  size={20}
                  color={Colors.surface}
                />
              </TouchableOpacity>
            ) : (
              <TouchableOpacity
                style={[
                  styles.submitButton,
                  loading && styles.submitButtonDisabled,
                ]}
                onPress={handleSubmit}
                disabled={loading}
              >
                {loading ? (
                  <ActivityIndicator size="small" color={Colors.surface} />
                ) : (
                  <>
                    <Text style={styles.submitButtonText}>
                      Confirm & Send Request
                    </Text>
                    <Ionicons name="send" size={20} color={Colors.surface} />
                  </>
                )}
              </TouchableOpacity>
            )}
          </View>
        </View>
      </View>
    </Modal>
  );
};

// Styles remain exactly the same...
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
    height: "90%",
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
  stepIndicator: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
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
    justifyContent: "center",
    alignItems: "center",
  },
  stepDotActive: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  stepDotText: {
    fontSize: 14,
    fontWeight: "600",
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
    backgroundColor: Colors.primary,
  },
  providerBar: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: Colors.background,
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: Colors.border,
  },
  providerBarName: {
    fontSize: 14,
    fontWeight: "500",
    color: Colors.text.primary,
  },
  providerBarRating: {
    flexDirection: "row",
    alignItems: "center",
  },
  providerBarRatingText: {
    marginLeft: 4,
    fontSize: 13,
    color: Colors.text.primary,
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
    fontWeight: "bold",
    color: Colors.text.primary,
    marginBottom: 8,
  },
  stepSubtitle: {
    fontSize: 14,
    color: Colors.text.secondary,
    marginBottom: 20,
  },
  servicesList: {
    maxHeight: 400,
  },
  serviceCard: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: Colors.background,
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 2,
    borderColor: "transparent",
  },
  serviceCardSelected: {
    borderColor: Colors.primary,
    backgroundColor: Colors.primary + "10",
  },
  serviceCardLeft: {
    flex: 1,
    flexDirection: "row",
  },
  serviceIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  serviceInfo: {
    flex: 1,
  },
  serviceName: {
    fontSize: 16,
    fontWeight: "600",
    color: Colors.text.primary,
    marginBottom: 4,
  },
  serviceDescription: {
    fontSize: 12,
    color: Colors.text.secondary,
    marginBottom: 8,
  },
  serviceMeta: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  serviceDuration: {
    fontSize: 12,
    color: Colors.text.secondary,
  },
  servicePrice: {
    fontSize: 16,
    fontWeight: "bold",
    color: Colors.primary,
  },
  radioButton: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: Colors.primary,
    justifyContent: "center",
    alignItems: "center",
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
    fontWeight: "500",
    color: Colors.text.primary,
    marginBottom: 8,
  },
  datePickerButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: Colors.background,
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  dateText: {
    marginLeft: 12,
    fontSize: 16,
    color: Colors.text.primary,
  },
  timePickerButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: Colors.background,
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  timeText: {
    marginLeft: 12,
    fontSize: 16,
    color: Colors.text.primary,
  },
  timeSlotsContainer: {
    marginTop: 12,
  },
  timeSlot: {
    paddingHorizontal: 20,
    paddingVertical: 10,
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
  input: {
    backgroundColor: Colors.background,
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    color: Colors.text.primary,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  textArea: {
    minHeight: 100,
    textAlignVertical: "top",
  },
  reviewContainer: {
    flex: 1,
  },
  reviewSection: {
    marginBottom: 20,
  },
  reviewSectionTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: Colors.text.primary,
    marginBottom: 12,
  },
  reviewCard: {
    backgroundColor: Colors.background,
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  reviewRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  reviewLabel: {
    fontSize: 14,
    color: Colors.text.secondary,
  },
  reviewValue: {
    fontSize: 14,
    color: Colors.text.primary,
    fontWeight: "500",
  },
  reviewDivider: {
    height: 1,
    backgroundColor: Colors.border,
    marginVertical: 12,
  },
  reviewAddress: {
    fontSize: 14,
    color: Colors.text.primary,
    lineHeight: 20,
  },
  reviewPrice: {
    fontSize: 14,
    color: Colors.text.primary,
    fontWeight: "600",
  },
  totalRow: {
    marginTop: 8,
  },
  totalLabel: {
    fontSize: 16,
    fontWeight: "600",
    color: Colors.text.primary,
  },
  totalValue: {
    fontSize: 18,
    fontWeight: "bold",
    color: Colors.primary,
  },
  priceNote: {
    fontSize: 12,
    color: Colors.text.secondary,
    marginTop: 8,
    fontStyle: "italic",
  },
  reviewInstructions: {
    fontSize: 14,
    color: Colors.text.primary,
    lineHeight: 20,
  },
  modalFooter: {
    padding: 20,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
  },
  nextButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: Colors.primary,
    paddingVertical: 16,
    borderRadius: 12,
    gap: 8,
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
