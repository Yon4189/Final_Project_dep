// app/(provider)/profile/bank.tsx
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '@/app/constants/Colors';
import { useProviderEarnings } from '@/hooks/useProviderEarnings';
import { LoadingSpinner } from '@/components/common/LoadingSpinner';

export default function BankDetailsScreen() {
  const router = useRouter();
  const { bankDetails: savedBankDetails, updateBankDetails, isLoading } = useProviderEarnings();
  
  const [form, setForm] = useState({
    bankName: '',
    accountName: '',
    accountNumber: '',
    branch: '',
    swiftCode: '',
  });

  useEffect(() => {
    if (savedBankDetails) {
      setForm({
        bankName: savedBankDetails.bankName || '',
        accountName: savedBankDetails.accountName || '',
        accountNumber: savedBankDetails.accountNumber || '',
        branch: savedBankDetails.branch || '',
        swiftCode: savedBankDetails.swiftCode || '',
      });
    }
  }, [savedBankDetails]);

  const handleSave = async () => {
    if (!form.bankName || !form.accountName || !form.accountNumber) {
      Alert.alert('Error', 'Please fill in all required fields');
      return;
    }

    try {
      await updateBankDetails.mutateAsync(form);
      Alert.alert('Success', 'Bank details updated successfully', [
        { text: 'OK', onPress: () => router.back() }
      ]);
    } catch (error) {
      // Error is handled by the mutation's onError
    }
  };

  if (isLoading) {
    return <LoadingSpinner fullScreen />;
  }

  return (
    <KeyboardAvoidingView 
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView 
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.header}>
          <Text style={styles.title}>Update Bank Account</Text>
          <Text style={styles.subtitle}>
            Enter your bank details to receive payments for your services.
          </Text>
        </View>

        <View style={styles.card}>
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Bank Name *</Text>
            <View style={styles.inputWrapper}>
              <Ionicons name="business-outline" size={20} color={Colors.text.secondary} style={styles.inputIcon} />
              <TextInput
                style={styles.input}
                placeholder="e.g. Commercial Bank of Ethiopia"
                value={form.bankName}
                onChangeText={(text) => setForm({ ...form, bankName: text })}
              />
            </View>
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Account Holder Name *</Text>
            <View style={styles.inputWrapper}>
              <Ionicons name="person-outline" size={20} color={Colors.text.secondary} style={styles.inputIcon} />
              <TextInput
                style={styles.input}
                placeholder="Exact name as in your bank"
                value={form.accountName}
                onChangeText={(text) => setForm({ ...form, accountName: text })}
              />
            </View>
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Account Number *</Text>
            <View style={styles.inputWrapper}>
              <Ionicons name="card-outline" size={20} color={Colors.text.secondary} style={styles.inputIcon} />
              <TextInput
                style={styles.input}
                placeholder="Enter your account number"
                keyboardType="numeric"
                value={form.accountNumber}
                onChangeText={(text) => setForm({ ...form, accountNumber: text })}
              />
            </View>
          </View>

          <View style={styles.row}>
            <View style={[styles.inputGroup, { flex: 1, marginRight: 8 }]}>
              <Text style={styles.label}>Branch (Optional)</Text>
              <TextInput
                style={styles.inputSmall}
                placeholder="Branch"
                value={form.branch}
                onChangeText={(text) => setForm({ ...form, branch: text })}
              />
            </View>
            <View style={[styles.inputGroup, { flex: 1, marginLeft: 8 }]}>
              <Text style={styles.label}>SWIFT (Optional)</Text>
              <TextInput
                style={styles.inputSmall}
                placeholder="SWIFT"
                value={form.swiftCode}
                onChangeText={(text) => setForm({ ...form, swiftCode: text })}
                autoCapitalize="characters"
              />
            </View>
          </View>
        </View>

        <View style={styles.infoBox}>
          <Ionicons name="shield-checkmark-outline" size={20} color={Colors.success} />
          <Text style={styles.infoText}>
            Your banking information is encrypted and stored securely.
          </Text>
        </View>

        <TouchableOpacity 
          style={[styles.saveButton, updateBankDetails.isPending && styles.saveButtonDisabled]}
          onPress={handleSave}
          disabled={updateBankDetails.isPending}
        >
          {updateBankDetails.isPending ? (
            <ActivityIndicator color={Colors.surface} />
          ) : (
            <>
              <Text style={styles.saveButtonText}>Save Account Details</Text>
              <Ionicons name="checkmark-circle" size={20} color={Colors.surface} />
            </>
          )}
        </TouchableOpacity>

        <TouchableOpacity 
          style={styles.cancelButton}
          onPress={() => router.back()}
        >
          <Text style={styles.cancelButtonText}>Cancel</Text>
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  scrollContent: {
    padding: 24,
    paddingTop: 40,
  },
  header: {
    marginBottom: 32,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: Colors.text.primary,
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 15,
    color: Colors.text.secondary,
    lineHeight: 22,
  },
  card: {
    backgroundColor: Colors.surface,
    borderRadius: 16,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 3,
    marginBottom: 20,
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
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 12,
    paddingHorizontal: 12,
    backgroundColor: Colors.background,
  },
  inputIcon: {
    marginRight: 10,
  },
  input: {
    flex: 1,
    height: 50,
    fontSize: 15,
    color: Colors.text.primary,
  },
  inputSmall: {
    height: 50,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 12,
    paddingHorizontal: 12,
    fontSize: 15,
    color: Colors.text.primary,
    backgroundColor: Colors.background,
  },
  row: {
    flexDirection: 'row',
  },
  infoBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.success + '10',
    padding: 16,
    borderRadius: 12,
    marginBottom: 32,
    borderWidth: 1,
    borderColor: Colors.success + '20',
    gap: 10,
  },
  infoText: {
    flex: 1,
    fontSize: 13,
    color: Colors.success,
    lineHeight: 18,
  },
  saveButton: {
    backgroundColor: Colors.primary,
    height: 56,
    borderRadius: 16,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5,
    marginBottom: 16,
  },
  saveButtonDisabled: {
    opacity: 0.7,
  },
  saveButtonText: {
    color: Colors.surface,
    fontSize: 16,
    fontWeight: 'bold',
  },
  cancelButton: {
    height: 50,
    justifyContent: 'center',
    alignItems: 'center',
  },
  cancelButtonText: {
    color: Colors.text.secondary,
    fontSize: 15,
    fontWeight: '500',
  },
});
