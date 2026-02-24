import { api } from "../services/api";
import { useRouter } from "expo-router";
import React, { useState } from "react";
import {
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import AppButton from "../../components/AppButton";
import AppInput from "../../components/AppInput";
import { Colors } from "../constants/Colors";
import { Ionicons } from "@expo/vector-icons";

export default function LoginScreen() {
  const router = useRouter();
  const [formData, setFormData] = useState({
    email: "",
    password: "",
  });
  const [loading, setLoading] = useState(false);
  const [userType, setUserType] = useState<"customer" | "provider">("customer");

  const handleLogin = async () => {
    if (!formData.email || !formData.password) {
      Alert.alert("Error", "Please enter email and password");
      return;
    }

    setLoading(true);

    try {
      const endpoint = userType === "customer" ? "/customer/login" : "/provider/login";
      const response = await api.post<any>(endpoint, {
        email: formData.email,
        password: formData.password,
      });

      setLoading(false);

      if (response.success && response.data) {
        if (response.data.token) {
          await api.setToken(response.data.token);
        }

        Alert.alert("Success", `Logged in as ${userType}`);

        if (userType === "provider") {
          router.replace("/(provider)/dashboard");
        } else {
          router.replace("/(customer)/dashboard");
        }
      } else {
        Alert.alert("Error", response.message || "Login failed");
      }
    } catch (error: any) {
      setLoading(false);
      Alert.alert("Error", error.message || "Login failed");
    }
  };

  return (
    <ScrollView style={styles.container} keyboardShouldPersistTaps="handled">
      <View style={styles.header}>
        <Text style={styles.title}>Welcome Back</Text>
        <Text style={styles.subtitle}>Sign in to your account</Text>
      </View>

      <View style={styles.formContainer}>
        {/* User Type Selection */}
        <View style={styles.userTypeContainer}>
          <TouchableOpacity
            style={[
              styles.userTypeBtn,
              userType === "customer" && styles.userTypeBtnActive,
            ]}
            onPress={() => setUserType("customer")}
          >
            <Ionicons
              name="person-outline"
              size={24}
              color={userType === "customer" ? Colors.text.light : Colors.primary}
            />
            <Text
              style={[
                styles.userTypeText,
                userType === "customer" && styles.userTypeTextActive,
              ]}
            >
              Customer
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.userTypeBtn,
              userType === "provider" && styles.userTypeBtnActive,
            ]}
            onPress={() => setUserType("provider")}
          >
            <Ionicons
              name="construct-outline"
              size={24}
              color={userType === "provider" ? Colors.text.light : Colors.primary}
            />
            <Text
              style={[
                styles.userTypeText,
                userType === "provider" && styles.userTypeTextActive,
              ]}
            >
              Provider
            </Text>
          </TouchableOpacity>
        </View>

        {/* Email Input */}
        <View style={styles.inputWithIcon}>
          <Ionicons name="mail-outline" size={20} color={Colors.primary} style={styles.inputIcon} />
          <View style={{ flex: 1 }}>
            <AppInput
              label="Email"
              value={formData.email}
              onChangeText={(text: string) => setFormData({ ...formData, email: text })}
              placeholder="Enter your email"
              keyboardType="email-address"
              autoCapitalize="none"
              required
            />
          </View>
        </View>

        {/* Password Input */}
        <View style={styles.inputWithIcon}>
          <Ionicons name="lock-closed-outline" size={20} color={Colors.primary} style={styles.inputIcon} />
          <View style={{ flex: 1 }}>
            <AppInput
              label="Password"
              value={formData.password}
              onChangeText={(text: string) => setFormData({ ...formData, password: text })}
              placeholder="Enter your password"
              secureTextEntry
              required
            />
          </View>
        </View>

        <TouchableOpacity
          style={styles.forgotPassword}
          onPress={() => router.push("/(auth)/forgot-password")}
        >
          <Text style={styles.forgotPasswordText}>Forgot Password?</Text>
        </TouchableOpacity>

        <AppButton
          title="Sign In"
          onPress={handleLogin}
          loading={loading}
          fullWidth
        />

        <View style={styles.divider}>
          <View style={styles.dividerLine} />
          <Text style={styles.dividerText}>OR</Text>
          <View style={styles.dividerLine} />
        </View>

        <Text style={styles.registerTitle}>Don't have an account?</Text>

        <AppButton
          title="Register as Customer"
          onPress={() => router.push("/(auth)/register-customer")}
          variant="outline"
          fullWidth
          style={styles.registerButton}
        />

        <AppButton
          title="Register as Service Provider"
          onPress={() => router.push("/(auth)/register-provider")}
          variant="outline"
          fullWidth
          style={styles.registerButton}
        />
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  header: {
    alignItems: "center",
    paddingTop: 60,
    paddingBottom: 40,
    backgroundColor: Colors.surface,
    borderBottomLeftRadius: 30,
    borderBottomRightRadius: 30,
    elevation: 5,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    marginBottom: 20,
  },
  title: {
    fontSize: 28,
    fontWeight: "bold",
    color: Colors.text.primary,
  },
  subtitle: {
    fontSize: 16,
    color: Colors.text.secondary,
    marginTop: 5,
  },
  formContainer: {
    padding: 20,
    marginHorizontal: 15,
    backgroundColor: Colors.surface,
    borderRadius: 15,
    elevation: 3,
  },
  userTypeContainer: {
    flexDirection: "row",
    backgroundColor: Colors.background,
    borderRadius: 10,
    padding: 5,
    marginBottom: 25,
  },
  userTypeBtn: {
    flex: 1,
    padding: 15,
    alignItems: "center",
    borderRadius: 8,
  },
  userTypeBtnActive: {
    backgroundColor: Colors.primary,
  },
  userTypeText: {
    fontSize: 16,
    fontWeight: "600",
    color: Colors.text.secondary,
  },
  userTypeTextActive: {
    color: Colors.text.light,
  },
  inputWithIcon: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 5,
  },
  inputIcon: {
    marginRight: 10,
    marginTop: 20,
  },
  forgotPassword: {
    alignSelf: "flex-end",
    marginBottom: 25,
  },
  forgotPasswordText: {
    color: Colors.primary,
    fontWeight: "600",
  },
  divider: {
    flexDirection: "row",
    alignItems: "center",
    marginVertical: 30,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: Colors.border,
  },
  dividerText: {
    paddingHorizontal: 15,
    color: Colors.text.secondary,
    fontSize: 14,
  },
  registerTitle: {
    textAlign: "center",
    fontSize: 16,
    color: Colors.text.primary,
    marginBottom: 15,
    fontWeight: "600",
  },
  registerButton: {
    marginBottom: 10,
  },
  skipBtn: {
    padding: 15,
    alignItems: "center",
    marginTop: 10,
  },
  skipText: {
    color: Colors.text.secondary,
    fontSize: 14,
  },
});
