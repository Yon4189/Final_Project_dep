// app/(provider)/earnings/withdraw.tsx
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import React, { useEffect, useState, useMemo } from "react";
import {
  ActivityIndicator,
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { LoadingSpinner } from "../../../components/common/LoadingSpinner";
import { useProviderEarnings } from "../../../hooks/useProviderEarnings";
import { Colors } from "../../constants/Colors";
import type { Currency } from "../../types/customer.types";
import type { BankDetails } from "../../types/provider.types";
import { formatCurrency } from "../../utils/formatters";

// Add this interface to include id
interface BankAccount extends BankDetails {
  id: string;
}

export default function WithdrawScreen() {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [amount, setAmount] = useState("");
  const [selectedBank, setSelectedBank] = useState<BankAccount | null>(null);
  const [bankDetails, setBankDetails] = useState<Partial<BankDetails>>({
    bankName: "",
    accountName: "",
    accountNumber: "",
    branch: "",
    swiftCode: "",
  });
  const [saveBank, setSaveBank] = useState(true);
  const [agreeTerms, setAgreeTerms] = useState(false);

  const {
    summary,
    bankDetails: savedBankDetails,
    withdrawals,
    isLoading,
    requestWithdrawal,
    updateBankDetails,
    refetch,
  } = useProviderEarnings();

  // Safe currency formatter
  const safeFormatCurrency = (
    amount: number,
    currencyCode: string = "ETB",
  ): string => {
    return formatCurrency(amount, currencyCode as Currency);
  };

  // Convert savedBankDetails to array format for display with proper typing
  const bankAccounts: BankAccount[] = useMemo(() => savedBankDetails
    ? [{ ...savedBankDetails, id: "saved-bank-1" }]
    : [], [savedBankDetails]);

  useEffect(() => {
    if (bankAccounts.length > 0 && !selectedBank) {
      setSelectedBank(bankAccounts[0]);
    }
  }, [bankAccounts, selectedBank]);

  const handleAmountChange = (text: string) => {
    // Only allow numbers and decimal point
    const filtered = text.replace(/[^0-9.]/g, "");
    // Prevent multiple decimal points
    const parts = filtered.split(".");
    if (parts.length > 2) {
      return;
    }
    setAmount(filtered);
  };

  const calculateFee = () => {
    const numAmount = parseFloat(amount) || 0;
    const fee = numAmount * 0.01; // 1% fee
    return {
      fee,
      net: numAmount - fee,
    };
  };

  const validateAmount = () => {
    const numAmount = parseFloat(amount);
    if (isNaN(numAmount) || numAmount < 50) {
      Alert.alert("Invalid Amount", "Minimum withdrawal amount is ETB 50");
      return false;
    }
    if (numAmount > (summary?.availableForWithdrawal || 0)) {
      Alert.alert("Insufficient Balance", "You do not have enough balance");
      return false;
    }
    return true;
  };

  const handleNext = () => {
    if (step === 1) {
      if (!validateAmount()) return;
      setStep(2);
    } else if (step === 2) {
      if (!selectedBank && !bankDetails.bankName) {
        Alert.alert("Error", "Please select or add bank details");
        return;
      }
      setStep(3);
    }
  };

  const handleBack = () => {
    setStep(step - 1);
  };

  const handleSaveBankDetails = async (): Promise<BankAccount | null> => {
    if (
      !bankDetails.bankName ||
      !bankDetails.accountName ||
      !bankDetails.accountNumber
    ) {
      Alert.alert("Error", "Please fill in all required fields");
      return null;
    }

    try {
      const result = await updateBankDetails.mutateAsync(bankDetails);
      // Add a temporary id to the result
      return { ...result, id: "new-bank-" + Date.now() };
    } catch (error) {
      Alert.alert("Error", "Failed to save bank details");
      return null;
    }
  };

  const handleWithdraw = async () => {
    if (!agreeTerms) {
      Alert.alert("Error", "Please agree to the terms and conditions");
      return;
    }

    try {
      console.log("🚀 Starting withdrawal process...");
      
      const bank = selectedBank || bankDetails;
      
      // Strict frontend validation to prevent 422
      if (!bank.bankName || !bank.accountNumber || !bank.accountName) {
        Alert.alert("Missing Information", "Please ensure Bank Name, Account Number, and Account Holder Name are all filled in.");
        return;
      }

      // Request withdrawal with full details normalized to snake_case for backend
      if (requestWithdrawal) {
        const withdrawalData: any = {
          amount: parseFloat(amount),
          payment_method: selectedBank ? (selectedBank as any).preferredPayoutMethod || 'bank' : 'bank',
          bank_name: bank.bankName || "",
          account_number: bank.accountNumber || "",
          account_holder_name: bank.accountName || "",
        };

        console.log("📡 Sending withdrawal payload:", JSON.stringify(withdrawalData, null, 2));
        await requestWithdrawal.mutateAsync(withdrawalData);
      }

      Alert.alert("Success", "Withdrawal request submitted successfully", [
        {
          text: "View Status",
          onPress: () => router.push("/(provider)/earnings"),
        },
        {
          text: "OK",
          onPress: () => router.back(),
        },
      ]);
    } catch (error) {
      Alert.alert("Error", "Failed to process withdrawal");
    }
  };

  const renderStep1 = () => {
    const { fee, net } = calculateFee();

    return (
      <View style={styles.stepContainer}>
        <Text style={styles.stepTitle}>Enter Amount</Text>
        <Text style={styles.stepSubtitle}>
          Available balance:{" "}
          {safeFormatCurrency(
            summary?.availableForWithdrawal || 0,
            summary?.currency,
          )}
        </Text>

        <View style={styles.amountContainer}>
          <Text style={styles.currencySymbol}>ETB</Text>
          <TextInput
            style={styles.amountInput}
            placeholder="0.00"
            placeholderTextColor={Colors.text.secondary}
            value={amount}
            onChangeText={handleAmountChange}
            keyboardType="numeric"
            autoFocus
          />
        </View>

        <View style={styles.quickAmounts}>
          {[100, 500, 1000, 5000].map((amt) => (
            <TouchableOpacity
              key={amt}
              style={styles.quickAmount}
              onPress={() => setAmount(amt.toString())}
            >
              <Text style={styles.quickAmountText}>ETB {amt}</Text>
            </TouchableOpacity>
          ))}
        </View>

        <View style={styles.feeBreakdown}>
          <View style={styles.feeRow}>
            <Text style={styles.feeLabel}>Withdrawal Amount</Text>
            <Text style={styles.feeValue}>
              {safeFormatCurrency(parseFloat(amount) || 0, summary?.currency)}
            </Text>
          </View>

          <View style={styles.feeRow}>
            <Text style={styles.feeLabel}>Processing Fee (1%)</Text>
            <Text style={styles.feeValue}>
              -{safeFormatCurrency(fee, summary?.currency)}
            </Text>
          </View>

          <View style={styles.feeDivider} />

          <View style={styles.feeRow}>
            <Text style={styles.netLabel}>You'll Receive</Text>
            <Text style={styles.netValue}>
              {safeFormatCurrency(net, summary?.currency)}
            </Text>
          </View>
        </View>

        <View style={styles.infoBox}>
          <Ionicons
            name="information-circle-outline"
            size={20}
            color={Colors.info}
          />
          <Text style={styles.infoText}>
            Withdrawals are processed within 1-3 business days to your
            registered bank account. Minimum withdrawal: ETB 50
          </Text>
        </View>
      </View>
    );
  };

  const renderStep2 = () => {
    return (
      <View style={styles.stepContainer}>
        <Text style={styles.stepTitle}>Select Bank Account</Text>
        <Text style={styles.stepSubtitle}>
          Choose where you want to receive your money
        </Text>

        {bankAccounts.length > 0 && (
          <View style={styles.savedBanks}>
            <Text style={styles.sectionLabel}>Saved Accounts</Text>
            {bankAccounts.map((bank) => (
              <TouchableOpacity
                key={bank.id}
                style={[
                  styles.bankCard,
                  selectedBank?.id === bank.id && styles.bankCardSelected,
                ]}
                onPress={() => setSelectedBank(bank)}
              >
                <View style={styles.bankCardLeft}>
                  <View style={styles.bankIcon}>
                    <Ionicons name="business" size={24} color={Colors.primary} />
                  </View>
                  <View style={styles.bankInfo}>
                    <Text style={styles.bankName}>{bank.bankName || ""}</Text>
                    <Text style={styles.bankAccount}>
                      {bank.accountName || ""} ••••{" "}
                      {(bank.accountNumber || "").slice(-4)}
                    </Text>
                  </View>
                </View>
                <View style={styles.radioButton}>
                  {selectedBank?.id === bank.id && (
                    <View style={styles.radioSelected} />
                  )}
                </View>
              </TouchableOpacity>
            ))}
          </View>
        )}

        <TouchableOpacity
          style={styles.addBankButton}
          onPress={() => setSelectedBank(null)}
        >
          <Ionicons name="add-circle-outline" size={20} color={Colors.primary} />
          <Text style={styles.addBankText}>Add New Bank Account</Text>
        </TouchableOpacity>

        {!selectedBank && (
          <View style={styles.newBankForm}>
            <Text style={styles.sectionLabel}>New Bank Account</Text>

            <View style={styles.formGroup}>
              <Text style={styles.formLabel}>Bank Name</Text>
              <TextInput
                style={styles.formInput}
                placeholder="e.g., Commercial Bank of Ethiopia"
                placeholderTextColor={Colors.text.secondary}
                value={bankDetails.bankName}
                onChangeText={(text) =>
                  setBankDetails({ ...bankDetails, bankName: text })
                }
              />
            </View>

            <View style={styles.formGroup}>
              <Text style={styles.formLabel}>Account Holder Name</Text>
              <TextInput
                style={styles.formInput}
                placeholder="Name as it appears on account"
                placeholderTextColor={Colors.text.secondary}
                value={bankDetails.accountName}
                onChangeText={(text) =>
                  setBankDetails({ ...bankDetails, accountName: text })
                }
              />
            </View>

            <View style={styles.formGroup}>
              <Text style={styles.formLabel}>Account Number</Text>
              <TextInput
                style={styles.formInput}
                placeholder="Enter account number"
                placeholderTextColor={Colors.text.secondary}
                value={bankDetails.accountNumber}
                onChangeText={(text) =>
                  setBankDetails({ ...bankDetails, accountNumber: text })
                }
                keyboardType="numeric"
              />
            </View>

            <View style={styles.formRow}>
              <View style={[styles.formGroup, { flex: 1, marginRight: 8 }]}>
                <Text style={styles.formLabel}>Branch (Optional)</Text>
                <TextInput
                  style={styles.formInput}
                  placeholder="Branch name"
                  placeholderTextColor={Colors.text.secondary}
                  value={bankDetails.branch}
                  onChangeText={(text) =>
                    setBankDetails({ ...bankDetails, branch: text })
                  }
                />
              </View>

              <View style={[styles.formGroup, { flex: 1, marginLeft: 8 }]}>
                <Text style={styles.formLabel}>SWIFT Code (Optional)</Text>
                <TextInput
                  style={styles.formInput}
                  placeholder="SWIFT"
                  placeholderTextColor={Colors.text.secondary}
                  value={bankDetails.swiftCode}
                  onChangeText={(text) =>
                    setBankDetails({ ...bankDetails, swiftCode: text })
                  }
                  autoCapitalize="characters"
                />
              </View>
            </View>

            <TouchableOpacity
              style={styles.saveBankCheckbox}
              onPress={() => setSaveBank(!saveBank)}
            >
              <View style={[styles.checkbox, saveBank && styles.checkboxChecked]}>
                {saveBank && (
                  <Ionicons name="checkmark" size={16} color={Colors.surface} />
                )}
              </View>
              <Text style={styles.checkboxLabel}>
                Save this account for future withdrawals
              </Text>
            </TouchableOpacity>
          </View>
        )}
      </View>
    );
  };

  const renderStep3 = () => {
    const { fee, net } = calculateFee();
    const bank = selectedBank || bankDetails;

    return (
      <View style={styles.stepContainer}>
        <View style={styles.successIcon}>
          <Ionicons name="wallet-outline" size={60} color={Colors.primary} />
        </View>

        <Text style={styles.confirmTitle}>Review & Confirm</Text>
        <Text style={styles.confirmSubtitle}>
          Please verify your withdrawal details
        </Text>

        <View style={styles.summaryCard}>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Withdrawal Amount</Text>
            <Text style={styles.summaryValue}>
              {safeFormatCurrency(parseFloat(amount) || 0, summary?.currency)}
            </Text>
          </View>

          <View style={styles.summaryDivider} />

          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Processing Fee</Text>
            <Text style={styles.summaryValue}>
              -{safeFormatCurrency(fee, summary?.currency)}
            </Text>
          </View>

          <View style={styles.summaryDivider} />

          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>You'll Receive</Text>
            <Text style={[styles.summaryValue, styles.netAmount]}>
              {safeFormatCurrency(net, summary?.currency)}
            </Text>
          </View>

          <View style={styles.summaryDivider} />

          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Bank Account</Text>
            <View style={styles.bankSummary}>
              <Text style={styles.bankSummaryName}>{bank?.bankName || ""}</Text>
              <Text style={styles.bankSummaryDetails}>
                {bank?.accountName || ""} ••••{" "}
                {(bank?.accountNumber || "").slice(-4)}
              </Text>
            </View>
          </View>
        </View>

        <TouchableOpacity
          style={styles.termsCheckbox}
          onPress={() => setAgreeTerms(!agreeTerms)}
        >
          <View style={[styles.checkbox, agreeTerms && styles.checkboxChecked]}>
            {agreeTerms && (
              <Ionicons name="checkmark" size={16} color={Colors.surface} />
            )}
          </View>
          <Text style={styles.termsText}>
            I agree to the{" "}
            <Text style={styles.termsLink}>Terms and Conditions</Text> for
            withdrawals
          </Text>
        </TouchableOpacity>

        <View style={styles.warningBox}>
          <Ionicons
            name="alert-circle-outline"
            size={20}
            color={Colors.warning}
          />
          <Text style={styles.warningText}>
            Please ensure all details are correct. Withdrawals cannot be
            reversed once processed.
          </Text>
        </View>
      </View>
    );
  };

  if (isLoading && !bankAccounts.length) {
    return <LoadingSpinner fullScreen />;
  }

  const isPending =
    requestWithdrawal?.isPending || updateBankDetails?.isPending || false;

  return (
    <KeyboardAvoidingView 
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          onPress={step === 1 ? () => router.back() : handleBack}
        >
          <Ionicons name="arrow-back" size={24} color={Colors.text.primary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Withdraw Funds</Text>
        <View style={{ width: 24 }} />
      </View>

      {/* Progress Steps */}
      <View style={styles.progressContainer}>
        <View
          style={[styles.progressStep, step >= 1 && styles.progressStepActive]}
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
          style={[styles.progressLine, step >= 2 && styles.progressLineActive]}
        />
        <View
          style={[styles.progressStep, step >= 2 && styles.progressStepActive]}
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
          style={[styles.progressLine, step >= 3 && styles.progressLineActive]}
        />
        <View
          style={[styles.progressStep, step >= 3 && styles.progressStepActive]}
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
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        <View>
          {step === 1 && renderStep1()}
          {step === 2 && renderStep2()}
          {step === 3 && renderStep3()}
        </View>

        {/* Footer */}
        <View style={styles.footer}>
          {step < 3 ? (
            <TouchableOpacity style={styles.nextButton} onPress={handleNext}>
              <Text style={styles.nextButtonText}>Continue</Text>
              <Ionicons name="arrow-forward" size={20} color={Colors.surface} />
            </TouchableOpacity>
          ) : (
            <TouchableOpacity
              style={[
                styles.confirmButton,
                isPending && styles.confirmButtonDisabled,
              ]}
              onPress={handleWithdraw}
              disabled={isPending}
            >
              {isPending ? (
                <ActivityIndicator size="small" color={Colors.surface} />
              ) : (
                <>
                  <Text style={styles.confirmButtonText}>Confirm Withdrawal</Text>
                  <Ionicons
                    name="checkmark-circle"
                    size={20}
                    color={Colors.surface}
                  />
                </>
              )}
            </TouchableOpacity>
          )}
        </View>
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
    flexGrow: 1,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingTop: 60,
    paddingBottom: 20,
    backgroundColor: Colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: Colors.text.primary,
  },
  progressContainer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
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
    flex: 1,
    padding: 20,
  },
  stepContainer: {
    paddingBottom: 20,
  },
  stepTitle: {
    fontSize: 22,
    fontWeight: "bold",
    color: Colors.text.primary,
    marginBottom: 8,
  },
  stepSubtitle: {
    fontSize: 14,
    color: Colors.text.secondary,
    marginBottom: 24,
  },
  amountContainer: {
    flexDirection: "row",
    alignItems: "center",
    borderBottomWidth: 2,
    borderBottomColor: Colors.primary,
    marginBottom: 20,
    paddingBottom: 8,
  },
  currencySymbol: {
    fontSize: 24,
    fontWeight: "600",
    color: Colors.text.primary,
    marginRight: 8,
  },
  amountInput: {
    flex: 1,
    fontSize: 32,
    fontWeight: "bold",
    color: Colors.text.primary,
    padding: 0,
  },
  quickAmounts: {
    flexDirection: "row",
    flexWrap: "wrap",
    marginHorizontal: -4,
    marginBottom: 24,
  },
  quickAmount: {
    width: "23%",
    margin: "1%",
    backgroundColor: Colors.background,
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: "center",
    borderWidth: 1,
    borderColor: Colors.border,
  },
  quickAmountText: {
    fontSize: 12,
    color: Colors.text.primary,
    fontWeight: "500",
  },
  feeBreakdown: {
    backgroundColor: Colors.background,
    borderRadius: 16,
    padding: 16,
    marginBottom: 20,
  },
  feeRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 8,
  },
  feeLabel: {
    fontSize: 14,
    color: Colors.text.secondary,
  },
  feeValue: {
    fontSize: 14,
    color: Colors.text.primary,
  },
  feeDivider: {
    height: 1,
    backgroundColor: Colors.border,
    marginVertical: 12,
  },
  netLabel: {
    fontSize: 16,
    fontWeight: "600",
    color: Colors.text.primary,
  },
  netValue: {
    fontSize: 18,
    fontWeight: "bold",
    color: Colors.primary,
  },
  infoBox: {
    flexDirection: "row",
    backgroundColor: Colors.info + "10",
    borderRadius: 12,
    padding: 16,
    gap: 12,
    borderWidth: 1,
    borderColor: Colors.info + "20",
  },
  infoText: {
    flex: 1,
    fontSize: 13,
    color: Colors.text.secondary,
    lineHeight: 18,
  },
  savedBanks: {
    marginBottom: 20,
  },
  sectionLabel: {
    fontSize: 14,
    fontWeight: "600",
    color: Colors.text.primary,
    marginBottom: 12,
  },
  bankCard: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: Colors.background,
    borderRadius: 12,
    padding: 16,
    marginBottom: 8,
    borderWidth: 2,
    borderColor: "transparent",
  },
  bankCardSelected: {
    borderColor: Colors.primary,
    backgroundColor: Colors.primary + "10",
  },
  bankCardLeft: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
  },
  bankIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: Colors.primary + "20",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  bankInfo: {
    flex: 1,
  },
  bankName: {
    fontSize: 16,
    fontWeight: "600",
    color: Colors.text.primary,
    marginBottom: 4,
  },
  bankAccount: {
    fontSize: 13,
    color: Colors.text.secondary,
  },
  radioButton: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: Colors.primary,
    justifyContent: "center",
    alignItems: "center",
  },
  radioSelected: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: Colors.primary,
  },
  addBankButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: Colors.primary + "10",
    paddingVertical: 16,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: Colors.primary + "30",
    borderStyle: "dashed",
    gap: 8,
    marginBottom: 20,
  },
  addBankText: {
    fontSize: 15,
    color: Colors.primary,
    fontWeight: "500",
  },
  newBankForm: {
    backgroundColor: Colors.surface,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  formGroup: {
    marginBottom: 16,
  },
  formLabel: {
    fontSize: 13,
    fontWeight: "500",
    color: Colors.text.primary,
    marginBottom: 6,
  },
  formInput: {
    backgroundColor: Colors.background,
    borderRadius: 12,
    padding: 14,
    fontSize: 14,
    color: Colors.text.primary,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  formRow: {
    flexDirection: "row",
    marginHorizontal: -8,
  },
  saveBankCheckbox: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 8,
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
  checkboxChecked: {
    backgroundColor: Colors.primary,
  },
  checkboxLabel: {
    fontSize: 14,
    color: Colors.text.primary,
  },
  successIcon: {
    alignItems: "center",
    marginVertical: 20,
  },
  confirmTitle: {
    fontSize: 22,
    fontWeight: "bold",
    color: Colors.text.primary,
    textAlign: "center",
    marginBottom: 8,
  },
  confirmSubtitle: {
    fontSize: 14,
    color: Colors.text.secondary,
    textAlign: "center",
    marginBottom: 24,
  },
  summaryCard: {
    backgroundColor: Colors.background,
    borderRadius: 16,
    padding: 16,
    marginBottom: 20,
  },
  summaryRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
  },
  summaryLabel: {
    fontSize: 14,
    color: Colors.text.secondary,
  },
  summaryValue: {
    fontSize: 14,
    color: Colors.text.primary,
    fontWeight: "500",
  },
  netAmount: {
    fontSize: 18,
    fontWeight: "bold",
    color: Colors.primary,
  },
  summaryDivider: {
    height: 1,
    backgroundColor: Colors.border,
    marginVertical: 12,
  },
  bankSummary: {
    alignItems: "flex-end",
  },
  bankSummaryName: {
    fontSize: 14,
    fontWeight: "500",
    color: Colors.text.primary,
    marginBottom: 2,
  },
  bankSummaryDetails: {
    fontSize: 12,
    color: Colors.text.secondary,
  },
  termsCheckbox: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 20,
  },
  termsText: {
    flex: 1,
    fontSize: 13,
    color: Colors.text.secondary,
  },
  termsLink: {
    color: Colors.primary,
    fontWeight: "500",
  },
  warningBox: {
    flexDirection: "row",
    backgroundColor: Colors.warning + "10",
    borderRadius: 12,
    padding: 16,
    gap: 12,
    borderWidth: 1,
    borderColor: Colors.warning + "20",
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
  confirmButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: Colors.success,
    paddingVertical: 16,
    borderRadius: 12,
    gap: 8,
  },
  confirmButtonDisabled: {
    opacity: 0.5,
  },
  confirmButtonText: {
    fontSize: 16,
    color: Colors.surface,
    fontWeight: "600",
  },
});
