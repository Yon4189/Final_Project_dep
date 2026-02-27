// app/(auth)/register-customer.tsx
import { Platform } from 'react-native';
import { api } from "../services/api";
import { useRouter } from "expo-router";
import React, { useState, useEffect } from "react";
import * as ImagePicker from 'expo-image-picker';
import {
  Alert,
  FlatList,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  Image,
  ActivityIndicator,
} from "react-native";
import AppButton from "../../components/AppButton";
import AppInput from "../../components/AppInput";
import { Colors } from "../constants/Colors";
import { LOCATIONS } from "../constants/Services";
import { Ionicons } from '@expo/vector-icons';

// Define City interface

interface City {
  id: number;
  name: string;
  cityID?: number;
}

export default function RegisterCustomerScreen() {
  const router = useRouter();
  const [formData, setFormData] = useState({
    fullname: "",
    email: "",
    phone: "",
    location: "",
    service_city: "",
    password: "",
    password_confirmation: "",
    profilePicture: null as any,
  });

  const [loading, setLoading] = useState(false);
  const [showLocationModal, setShowLocationModal] = useState(false);
  const [showCityModal, setShowCityModal] = useState(false);
  const [imageUri, setImageUri] = useState<string | null>(null);
  const [cities, setCities] = useState<City[]>([]);
  const [citiesLoading, setCitiesLoading] = useState(false);
  const [validationErrors, setValidationErrors] = useState<{ [key: string]: string }>({});

  useEffect(() => {
    fetchCities();
  }, []);

  const fetchCities = async () => {
    setCitiesLoading(true);
    try {
      const resp = await api.get<any>('/cities');
      console.log('Cities API response:', resp);

      if (resp.success && resp.data) {
        let citiesData = [];
        if (Array.isArray(resp.data)) {
          citiesData = resp.data;
        } else if (resp.data.data && Array.isArray(resp.data.data)) {
          citiesData = resp.data.data;
        } else if (resp.data.cities && Array.isArray(resp.data.cities)) {
          citiesData = resp.data.cities;
        } else if (typeof resp.data === 'object' && resp.data !== null) {
          citiesData = Object.values(resp.data).filter(item =>
            typeof item === 'object' && item !== null
          );
        }
        setCities(citiesData);
      }
    } catch (err) {
      console.log('Error fetching cities:', err);
    } finally {
      setCitiesLoading(false);
    }
  };

  const pickImage = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();

    if (status !== 'granted') {
      Alert.alert('Permission needed', 'Please grant camera roll permissions');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });

    if (!result.canceled) {
      const asset = result.assets[0];
      setImageUri(asset.uri);

      const fileName = asset.uri.split('/').pop() || 'photo.jpg';
      const fileExtension = fileName.split('.').pop()?.toLowerCase() || 'jpg';
      const mimeType = fileExtension === 'jpg' || fileExtension === 'jpeg'
        ? 'image/jpeg'
        : fileExtension === 'png'
          ? 'image/png'
          : 'image/jpeg';

      setFormData({
        ...formData,
        profilePicture: {
          uri: asset.uri,
          name: fileName,
          type: mimeType,
        }
      });

      setValidationErrors(prev => ({ ...prev, profilePicture: '' }));
    }
  };

  // Validate phone number - remove non-numeric and check format
  const validatePhoneNumber = (phone: string) => {
    const cleaned = phone.replace(/[^0-9]/g, '');
    return {
      isValid: /^(09|07)[0-9]{8}$/.test(cleaned),
      cleaned: cleaned
    };
  };

  // Validate email format
  const validateEmail = (email: string) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  // Validate form fields
  const validateForm = () => {
    const errors: { [key: string]: string } = {};

    if (!formData.fullname.trim()) {
      errors.fullname = "Full name is required";
    } else if (formData.fullname.length < 3) {
      errors.fullname = "Full name must be at least 3 characters";
    }

    if (!formData.email.trim()) {
      errors.email = "Email is required";
    } else if (!validateEmail(formData.email)) {
      errors.email = "Please enter a valid email address";
    }

    if (!formData.phone.trim()) {
      errors.phone = "Phone number is required";
    } else {
      const { isValid } = validatePhoneNumber(formData.phone);
      if (!isValid) {
        errors.phone = "Phone number must be 10 digits starting with 09 or 07";
      }
    }

    if (!formData.location) {
      errors.location = "Please select your location";
    }

    if (!formData.service_city) {
      errors.service_city = "Please select your service city";
    }

    if (!formData.password) {
      errors.password = "Password is required";
    } else if (formData.password.length < 8) {
      errors.password = "Password must be at least 8 characters";
    }

    if (!formData.password_confirmation) {
      errors.password_confirmation = "Please confirm your password";
    } else if (formData.password !== formData.password_confirmation) {
      errors.password_confirmation = "Passwords do not match";
    }

    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleRegister = async () => {
    setValidationErrors({});

    if (!validateForm()) {
      return;
    }

    const { cleaned: cleanedPhone } = validatePhoneNumber(formData.phone);

    try {
      setLoading(true);
      console.log("Starting registration with cleaned phone:", cleanedPhone);

      const formDataToSend = new FormData();
      formDataToSend.append('fullname', formData.fullname.trim());
      formDataToSend.append('email', formData.email.trim().toLowerCase());
      formDataToSend.append('phone', cleanedPhone);
      formDataToSend.append('password', formData.password);
      formDataToSend.append('password_confirmation', formData.password_confirmation);
      formDataToSend.append('location', formData.location);
      formDataToSend.append('service_city', formData.service_city);

      if (formData.profilePicture?.uri) {
        const filename = formData.profilePicture.uri.split('/').pop() || 'photo.jpg';
        const match = /\.(\w+)$/.exec(filename);
        const type = match ? `image/${match[1]}` : 'image/jpeg';

        if (Platform.OS === 'web') {
          const response = await fetch(formData.profilePicture.uri);
          const blob = await response.blob();
          const file = new File([blob], filename, { type });
          formDataToSend.append('profilePicture', file);
        } else {
          formDataToSend.append('profilePicture', {
            uri: formData.profilePicture.uri,
            name: filename,
            type,
          } as any);
        }
      }

      if (__DEV__) {
        console.log('Sending FormData with fields:', {
          fullname: formData.fullname,
          email: formData.email,
          phone: cleanedPhone,
          location: formData.location,
          service_city: formData.service_city,
          hasProfilePicture: !!formData.profilePicture?.uri
        });
      }

      const response = await api.post<any>(
        '/customer/register',
        formDataToSend,
        {
          headers: {
            'Content-Type': 'multipart/form-data',
            'Accept': 'application/json',
          },
          timeout: 30000,
        }
      );

      console.log("Registration response:", response);

      if (response?.success === true || response?.status === 'success') {
        setFormData({
          fullname: "",
          email: "",
          phone: "",
          location: "",
          service_city: "",
          password: "",
          password_confirmation: "",
          profilePicture: null,
        });
        setImageUri(null);
        setValidationErrors({});

        console.log("Registration success: Navigating to login page...");

        if (Platform.OS === 'web') {
          router.replace("/login");
        } else {
          setTimeout(() => {
            router.replace("/login");
          }, 100);
        }
      } else {
        Alert.alert(
          "Registration Failed",
          response?.message || "Could not complete registration. Please try again."
        );
      }
    } catch (err: any) {
      console.error('Registration error details:', err);

      let errorMessage = "Could not connect to server. Please check your internet connection.";

      if (err.response) {
        console.error('Error response data:', err.response.data);

        if (err.response.status === 422) {
          const responseData = err.response.data;

          if (responseData.errors) {
            const serverErrors = responseData.errors;
            const errorMessages = [];

            const newValidationErrors: { [key: string]: string } = {};

            if (serverErrors.phone) {
              newValidationErrors.phone = serverErrors.phone[0];
              errorMessages.push(`📱 ${serverErrors.phone[0]}`);
            }
            if (serverErrors.email) {
              newValidationErrors.email = serverErrors.email[0];
              errorMessages.push(`📧 ${serverErrors.email[0]}`);
            }
            if (serverErrors.fullname) {
              newValidationErrors.fullname = serverErrors.fullname[0];
              errorMessages.push(`👤 ${serverErrors.fullname[0]}`);
            }
            if (serverErrors.password) {
              newValidationErrors.password = serverErrors.password[0];
              errorMessages.push(`🔒 ${serverErrors.password[0]}`);
            }
            if (serverErrors.location) {
              newValidationErrors.location = serverErrors.location[0];
              errorMessages.push(`📍 ${serverErrors.location[0]}`);
            }
            if (serverErrors.service_city) {
              newValidationErrors.service_city = serverErrors.service_city[0];
              errorMessages.push(`🏙️ ${serverErrors.service_city[0]}`);
            }

            setValidationErrors(newValidationErrors);

            if (errorMessages.length > 0) {
              errorMessage = errorMessages.join('\n\n');
            } else {
              errorMessage = responseData.message || 'Validation failed';
            }
          } else {
            errorMessage = responseData.message || 'Validation failed';
          }
        } else {
          errorMessage = err.response.data?.message ||
            err.response.data?.error ||
            `Server error: ${err.response.status}`;
        }
      } else if (err.request) {
        errorMessage = "No response from server. Please check your internet connection and try again.";
      } else {
        errorMessage = err.message || "An unexpected error occurred.";
      }

      Alert.alert("Registration Error", errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const renderModalItem = (item: string | any, onSelect: () => void) => {
    const itemName = typeof item === 'string' ? item : item.name || item.cityName || "";
    return (
      <TouchableOpacity
        style={styles.modalItem}
        onPress={() => {
          onSelect();
        }}
      >
        <Text style={styles.modalItemText}>
          <Text>{itemName}</Text>
        </Text>
      </TouchableOpacity>
    );
  };

  return (
    <ScrollView
      style={styles.container}
      keyboardShouldPersistTaps="handled"
      showsVerticalScrollIndicator={false}
    >
      <View style={styles.header}>
        <Text style={styles.title}>
          <Text>Create Customer Account</Text>
        </Text>
        <Text style={styles.subtitle}>
          <Text>Join thousands of satisfied customers</Text>
        </Text>
      </View>

      <View style={styles.formContainer}>
        {/* Full Name Input */}
        <View style={styles.inputGroup}>
          <Text style={styles.label}>
            <Text>Full Name </Text><Text style={styles.required}>*</Text>
          </Text>
          <AppInput
            value={formData.fullname}
            onChangeText={(text: string) => {
              setFormData({ ...formData, fullname: text });
              setValidationErrors(prev => ({ ...prev, fullname: '' }));
            }}
            placeholder="Enter your full name"
            required
            error={validationErrors.fullname}
          />
        </View>

        {/* Email Input */}
        <View style={styles.inputGroup}>
          <Text style={styles.label}>
            <Text>Email </Text><Text style={styles.required}>*</Text>
          </Text>
          <AppInput
            value={formData.email}
            onChangeText={(text: string) => {
              setFormData({ ...formData, email: text });
              setValidationErrors(prev => ({ ...prev, email: '' }));
            }}
            placeholder="Enter your email"
            keyboardType="email-address"
            autoCapitalize="none"
            required
            error={validationErrors.email}
          />
        </View>

        {/* Phone Number Input */}
        <View style={styles.inputGroup}>
          <Text style={styles.label}>
            <Text>Phone Number </Text><Text style={styles.required}>*</Text>
          </Text>
          <AppInput
            value={formData.phone}
            onChangeText={(text: string) => {
              const cleaned = text.replace(/[^0-9]/g, '');
              if (cleaned.length <= 10) {
                setFormData({ ...formData, phone: cleaned });
                setValidationErrors(prev => ({ ...prev, phone: '' }));
              }
            }}
            placeholder="0912345678"
            keyboardType="phone-pad"
            maxLength={10}
            required
            error={validationErrors.phone}
          />
          <Text style={styles.hintText}>
            <Text>Enter 10 digits starting with 09 or 07</Text>
          </Text>
        </View>

        {/* Location Dropdown */}
        <View style={styles.inputGroup}>
          <Text style={styles.label}>
            <Text>Your Location </Text><Text style={styles.required}>*</Text>
          </Text>
          <TouchableOpacity
            style={[
              styles.dropdown,
              validationErrors.location && styles.dropdownError
            ]}
            onPress={() => setShowLocationModal(true)}
          >
            <Text
              style={formData.location ? styles.dropdownText : styles.dropdownPlaceholder}
            >
              <Text>{formData.location || "Select your current location"}</Text>
            </Text>
            <Ionicons name="chevron-down" size={20} color={Colors.text.secondary} />
          </TouchableOpacity>
          {validationErrors.location ? (
            <Text style={styles.errorText}>{validationErrors.location}</Text>
          ) : null}
        </View>

        {/* Service City Dropdown */}
        <View style={styles.inputGroup}>
          <Text style={styles.label}>
            <Text>Service City </Text><Text style={styles.required}>*</Text>
          </Text>
          <TouchableOpacity
            style={[
              styles.dropdown,
              validationErrors.service_city && styles.dropdownError
            ]}
            onPress={() => setShowCityModal(true)}
          >
            <Text
              style={formData.service_city ? styles.dropdownText : styles.dropdownPlaceholder}
            >
              <Text>{formData.service_city || "Select city for services"}</Text>
            </Text>
            <Ionicons name="chevron-down" size={20} color={Colors.text.secondary} />
          </TouchableOpacity>
          {validationErrors.service_city ? (
            <Text style={styles.errorText}>{validationErrors.service_city}</Text>
          ) : null}
          {citiesLoading && (
            <View style={styles.loadingIndicator}>
              <ActivityIndicator size="small" color={Colors.primary} />
              <Text style={styles.loadingText}>
                <Text>Loading cities...</Text>
              </Text>
            </View>
          )}
        </View>

        {/* Password Input */}
        <View style={styles.inputGroup}>
          <Text style={styles.label}>
            <Text>Password </Text><Text style={styles.required}>*</Text>
          </Text>
          <AppInput
            value={formData.password}
            onChangeText={(text: string) => {
              setFormData({ ...formData, password: text });
              setValidationErrors(prev => ({ ...prev, password: '' }));
            }}
            placeholder="Minimum 8 characters"
            secureTextEntry
            required
            error={validationErrors.password}
          />
        </View>

        {/* Confirm Password Input */}
        <View style={styles.inputGroup}>
          <Text style={styles.label}>
            <Text>Confirm Password </Text><Text style={styles.required}>*</Text>
          </Text>
          <AppInput
            value={formData.password_confirmation}
            onChangeText={(text: string) => {
              setFormData({ ...formData, password_confirmation: text });
              setValidationErrors(prev => ({ ...prev, password_confirmation: '' }));
            }}
            placeholder="Re-enter your password"
            secureTextEntry
            required
            error={validationErrors.password_confirmation}
          />
        </View>

        {/* Profile Picture */}
        <View style={styles.inputGroup}>
          <Text style={styles.label}>Profile Picture (Optional)</Text>
          <TouchableOpacity
            style={[
              styles.imagePicker,
              validationErrors.profilePicture && styles.imagePickerError
            ]}
            onPress={pickImage}
          >
            {imageUri ? (
              <Image source={{ uri: imageUri }} style={styles.profileImage} />
            ) : (
              <View style={styles.imagePlaceholder}>
                <Ionicons name="camera-outline" size={40} color={Colors.text.secondary} />
                <Text style={styles.imagePlaceholderText}>
                  <Text>Tap to upload photo</Text>
                </Text>
                <Text style={styles.imageHintText}>
                  <Text>JPG or PNG, max 2MB</Text>
                </Text>
              </View>
            )}
          </TouchableOpacity>
          {validationErrors.profilePicture ? (
            <Text style={styles.errorText}>{validationErrors.profilePicture}</Text>
          ) : null}
        </View>

        {/* Register Button */}
        <AppButton
          title="Create Account"
          onPress={handleRegister}
          loading={loading}
          fullWidth
          style={styles.registerButton}
        />

        {/* Divider */}
        <View style={styles.divider}>
          <View style={styles.dividerLine} />
          <Text style={styles.dividerText}>
            <Text>OR</Text>
          </Text>
          <View style={styles.dividerLine} />
        </View>

        {/* Link to Provider Registration - FIXED */}
        <TouchableOpacity
          style={styles.linkButton}
          onPress={() => {
            console.log("Navigating to provider registration");
            // Use relative path since we're in the same (auth) group
            router.push("/register-provider");
          }}
        >
          <Text style={styles.linkText}>
            <Text>Want to offer services? </Text><Text style={styles.linkHighlight}>Register as Provider</Text>
          </Text>
        </TouchableOpacity>

        {/* Login Link - FIXED */}
        <TouchableOpacity
          style={styles.loginLink}
          onPress={() => {
            console.log("Navigating to login");
            // Use relative path since we're in the same (auth) group
            router.push("/login");
          }}
        >
          <Text style={styles.loginText}>
            <Text>Already have an account? </Text><Text style={styles.loginLinkText}>Sign In</Text>
          </Text>
        </TouchableOpacity>
      </View>

      {/* Location Selection Modal */}
      <Modal
        visible={showLocationModal}
        animationType="slide"
        transparent
        onRequestClose={() => setShowLocationModal(false)}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>
                <Text>Select Your Location</Text>
              </Text>
              <TouchableOpacity onPress={() => setShowLocationModal(false)}>
                <Ionicons name="close" size={24} color={Colors.text.secondary} />
              </TouchableOpacity>
            </View>
            <FlatList
              data={LOCATIONS}
              keyExtractor={(item) => item}
              renderItem={({ item }) =>
                renderModalItem(item, () => {
                  setFormData({ ...formData, location: item });
                  setValidationErrors(prev => ({ ...prev, location: '' }));
                  setShowLocationModal(false);
                })
              }
              style={styles.modalList}
              showsVerticalScrollIndicator={false}
            />
          </View>
        </View>
      </Modal>

      {/* Service City Selection Modal */}
      <Modal
        visible={showCityModal}
        animationType="slide"
        transparent
        onRequestClose={() => setShowCityModal(false)}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>
                <Text>Select Service City</Text>
              </Text>
              <TouchableOpacity onPress={() => setShowCityModal(false)}>
                <Ionicons name="close" size={24} color={Colors.text.secondary} />
              </TouchableOpacity>
            </View>

            {citiesLoading ? (
              <View style={styles.modalLoadingContainer}>
                <ActivityIndicator size="large" color={Colors.primary} />
                <Text style={styles.modalLoadingText}>
                  <Text>Loading cities...</Text>
                </Text>
              </View>
            ) : cities.length === 0 ? (
              <View style={styles.modalEmptyContainer}>
                <Ionicons name="location-outline" size={48} color={Colors.text.secondary} />
                <Text style={styles.modalEmptyText}>
                  <Text>No cities available</Text>
                </Text>
                <TouchableOpacity onPress={fetchCities} style={styles.retryButton}>
                  <Text style={styles.retryText}>
                    <Text>Retry</Text>
                  </Text>
                </TouchableOpacity>
              </View>
            ) : (
              <FlatList
                data={cities}
                keyExtractor={(item) => item.id?.toString() || item.cityID?.toString() || Math.random().toString()}
                renderItem={({ item }) => {
                  const cityName = item.name || (typeof item === 'string' ? item : "");
                  return renderModalItem(item, () => {
                    setFormData({ ...formData, service_city: cityName });
                    setValidationErrors(prev => ({ ...prev, service_city: '' }));
                    setShowCityModal(false);
                  });
                }}
                style={styles.modalList}
                showsVerticalScrollIndicator={false}
              />
            )}
          </View>
        </View>
      </Modal>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background
  },
  header: {
    padding: 30,
    backgroundColor: Colors.primary,
    alignItems: "center",
    borderBottomLeftRadius: 30,
    borderBottomRightRadius: 30,
  },
  title: {
    fontSize: 28,
    fontWeight: "bold",
    color: '#FFFFFF',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: 'rgba(255,255,255,0.9)',
  },
  formContainer: {
    padding: 20,
    marginTop: -20,
    marginHorizontal: 15,
    backgroundColor: Colors.surface,
    borderRadius: 20,
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
  },
  inputGroup: {
    marginBottom: 20
  },
  label: {
    fontSize: 14,
    fontWeight: "600",
    color: Colors.text.primary,
    marginBottom: 8
  },
  required: {
    color: Colors.error
  },
  hintText: {
    fontSize: 12,
    color: Colors.text.secondary,
    marginTop: 4,
    marginLeft: 5
  },
  dropdown: {
    backgroundColor: Colors.background,
    padding: 15,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: Colors.border,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center"
  },
  dropdownError: {
    borderColor: Colors.error,
  },
  dropdownPlaceholder: {
    fontSize: 16,
    color: Colors.text.secondary
  },
  dropdownText: {
    fontSize: 16,
    color: Colors.text.primary
  },
  errorText: {
    fontSize: 12,
    color: Colors.error,
    marginTop: 4,
    marginLeft: 5,
  },
  imagePicker: {
    width: '100%',
    height: 150,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: Colors.border,
    borderStyle: 'dashed',
    overflow: 'hidden',
    backgroundColor: Colors.background,
  },
  imagePickerError: {
    borderColor: Colors.error,
  },
  profileImage: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover'
  },
  imagePlaceholder: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: Colors.background
  },
  imagePlaceholderText: {
    marginTop: 8,
    color: Colors.text.secondary,
    fontSize: 14,
    fontWeight: '500',
  },
  imageHintText: {
    marginTop: 4,
    color: Colors.text.secondary,
    fontSize: 12,
  },
  registerButton: {
    marginTop: 20,
    marginBottom: 15
  },
  divider: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 20,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: Colors.border,
  },
  dividerText: {
    marginHorizontal: 10,
    color: Colors.text.secondary,
    fontSize: 14,
  },
  linkButton: {
    padding: 15,
    alignItems: "center",
    marginBottom: 10,
    backgroundColor: Colors.background,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  linkText: {
    color: Colors.text.secondary,
    fontWeight: "500",
    fontSize: 14
  },
  linkHighlight: {
    color: Colors.secondary,
    fontWeight: "600",
  },
  loginLink: {
    alignItems: "center",
    marginTop: 10,
    marginBottom: 20,
  },
  loginText: {
    color: Colors.text.secondary,
    fontSize: 14,
  },
  loginLinkText: {
    color: Colors.primary,
    fontWeight: "600"
  },
  modalContainer: {
    flex: 1,
    justifyContent: "flex-end",
    backgroundColor: "rgba(0,0,0,0.5)"
  },
  modalContent: {
    backgroundColor: Colors.surface,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    maxHeight: "80%"
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: "bold",
    color: Colors.text.primary
  },
  modalList: {
    maxHeight: 400
  },
  modalItem: {
    padding: 15,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border
  },
  modalItemText: {
    fontSize: 16,
    color: Colors.text.primary
  },
  loadingContainer: {
    padding: 20,
    alignItems: 'center'
  },
  loadingIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
  },
  loadingText: {
    fontSize: 12,
    color: Colors.text.secondary,
    marginLeft: 8,
  },
  modalLoadingContainer: {
    padding: 40,
    alignItems: 'center',
  },
  modalLoadingText: {
    marginTop: 12,
    color: Colors.text.secondary,
    fontSize: 14,
  },
  emptyContainer: {
    padding: 20,
    alignItems: 'center'
  },
  modalEmptyContainer: {
    padding: 40,
    alignItems: 'center',
  },
  modalEmptyText: {
    marginTop: 12,
    color: Colors.text.secondary,
    fontSize: 16,
  },
  retryButton: {
    marginTop: 16,
    paddingHorizontal: 20,
    paddingVertical: 10,
    backgroundColor: Colors.primary,
    borderRadius: 8,
  },
  retryText: {
    color: '#FFFFFF',
    fontWeight: '600',
  },
});