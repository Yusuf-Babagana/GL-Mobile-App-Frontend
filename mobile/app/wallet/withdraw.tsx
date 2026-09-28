import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { Alert, ActivityIndicator, KeyboardAvoidingView, Platform, ScrollView, Text, TextInput, TouchableOpacity, View } from "react-native";
import { Info, Sparkles, Building, Hash, Banknote, Lock } from "lucide-react-native";
import SafeScreen from "../../components/SafeScreen";
import React, { useState, useEffect } from "react";
import { Picker } from "@react-native-picker/picker";
import { marketAPI } from "../../lib/marketApi";
import { useWallet } from "../../context/WalletContext";
import * as Haptics from "expo-haptics";

export default function WithdrawScreen() {
    const router = useRouter();
    const { availableBalance, updateBalance } = useWallet();

    const [banks, setBanks] = useState<{ name: string; code: string }[]>([]);
    const [loadingBanks, setLoadingBanks] = useState(true);

    const [selectedBank, setSelectedBank] = useState("");
    const [accountNumber, setAccountNumber] = useState("");
    
    // Account Verification
    const [accountName, setAccountName] = useState<string | null>(null);
    const [verifying, setVerifying] = useState(false);
    
    const [amount, setAmount] = useState("");
    const [pin, setPin] = useState("");
    const [withdrawing, setWithdrawing] = useState(false);

    useEffect(() => {
        const loadBanks = async () => {
            try {
                const data = await marketAPI.getBanks();
                if (Array.isArray(data)) {
                    setBanks(data);
                } else if (data.data && Array.isArray(data.data)) {
                    // Sometimes APIs wrap lists in a 'data' key
                    setBanks(data.data);
                }
            } catch (error) {
                console.error("Error loading banks:", error);
                Alert.alert("Error", "Could not load bank list. Please try again.");
            } finally {
                setLoadingBanks(false);
            }
        };
        loadBanks();
    }, []);

    // Reset verified name if bank or account number changes
    useEffect(() => {
        setAccountName(null);
    }, [selectedBank, accountNumber]);

    const verifyAccount = async () => {
        if (!selectedBank) {
            Alert.alert("Missing Info", "Please select a bank first.");
            return;
        }
        if (accountNumber.length < 10) {
            Alert.alert("Invalid Account", "Please enter a valid 10-digit account number.");
            return;
        }

        setVerifying(true);
        try {
            const name = await marketAPI.verifyBankAccount(accountNumber, selectedBank);
            setAccountName(name);
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        } catch (error: any) {
            console.error("Verification error:", error);
            Alert.alert(
              "Verification Failed",
              "Account Verification Failed: The account number could not be validated for the selected bank. Please double-check your credentials and try again."
            );
            setAccountName(null);
        } finally {
            setVerifying(false);
        }
    };

    const handleWithdraw = async () => {
        if (!accountName) {
            Alert.alert("Verification Required", "Please verify your account number first.");
            return;
        }
        
        const withdrawAmount = parseFloat(amount);
        if (isNaN(withdrawAmount)) {
            Alert.alert("Invalid Amount", "Please enter a valid withdrawal amount.");
            return;
        }

        if (withdrawAmount > Number(availableBalance)) {
            Alert.alert("Insufficient Funds", "You do not have enough funds for this withdrawal.");
            return;
        }

        if (pin.length < 4) {
            Alert.alert("Invalid PIN", "Please enter your 4-digit transaction PIN.");
            return;
        }

        setWithdrawing(true);
        try {
            const bank = banks.find(b => b.code === selectedBank);
            const result = await marketAPI.initiateWithdrawal(withdrawAmount, accountNumber, selectedBank, pin, bank?.name, accountName);
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

            setAmount('');
            setPin('');
            setAccountNumber('');
            setAccountName(null);

            const successMsg = result.message || 'Withdrawal processed successfully.';
            const ref = result.reference ? `\n\nReference: ${result.reference}` : '';
            Alert.alert("Success 👍", successMsg + ref, [{ text: "OK", onPress: () => router.back() }]);
        } catch (error: any) {
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
            const errData = error.response?.data || error;
            Alert.alert("Withdrawal Failed", errData.error || errData.detail || errData.message || "An error occurred during withdrawal.");
        } finally {
            setWithdrawing(false);
        }
    };

    return (
        <SafeScreen>
            {/* Header */}
            <View className="px-6 py-4 flex-row items-center border-b border-gray-100 bg-white">
                <TouchableOpacity
                    activeOpacity={0.7}
                    onPress={() => router.back()}
                    hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                    accessibilityLabel="Go back"
                    accessibilityRole="button"
                    className="w-10 h-10 bg-gray-50 rounded-full items-center justify-center border border-gray-100"
                >
                    <Ionicons name="chevron-back" size={24} color="#1A1A1A" />
                </TouchableOpacity>
                <Text className="flex-1 text-center text-lg font-black text-slate-900 tracking-tight mr-10">Withdraw Funds</Text>
            </View>

            <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
            <ScrollView
                contentContainerStyle={{ padding: 24, paddingBottom: 100 }}
                showsVerticalScrollIndicator={false}
                keyboardShouldPersistTaps="handled"
            >
                {/* Available Balance */}
                <View className="bg-green-50 p-6 rounded-3xl border border-green-200 mb-8 items-center">
                    <Text className="text-green-700 text-xs font-bold uppercase tracking-widest mb-1">Withdrawable Balance</Text>
                    <Text className="text-green-950 text-3xl font-black tracking-tighter">
                        ₦{Number(availableBalance).toLocaleString()}
                    </Text>
                </View>

                {/* Bank Details Section */}
                <Text className="text-slate-900 font-bold mb-4 uppercase tracking-wider text-xs ml-1">1. Bank Details</Text>
                
                <View className="bg-white rounded-3xl p-5 border border-gray-100 mb-6">
                    {/* Bank Picker */}
                    <Text className="text-gray-500 text-xs font-bold mb-2 ml-1">Select Bank</Text>
                    <View className="bg-gray-50 border border-gray-200 rounded-2xl mb-4 overflow-hidden h-14 justify-center">
                        {loadingBanks ? (
                            <ActivityIndicator size="small" color="#10B981" />
                        ) : (
                            <Picker
                                selectedValue={selectedBank}
                                onValueChange={(itemValue) => setSelectedBank(itemValue)}
                                style={{ height: 50, width: '100%' }}
                            >
                                <Picker.Item label="Choose a bank..." value="" color="#9CA3AF" />
                                {banks.map((b) => (
                                    <Picker.Item key={b.code} label={`${b.code} - ${b.name}`} value={b.code} color="#111827" />
                                ))}
                            </Picker>
                        )}
                    </View>

                    {/* Account Number */}
                    <Text className="text-gray-500 text-xs font-bold mb-2 ml-1">Account Number</Text>
                    <View className="flex-row items-center bg-gray-50 border border-gray-200 rounded-2xl px-4 h-14 mb-2">
                        <Hash size={20} color="#9CA3AF" />
                        <TextInput 
                            className="flex-1 ml-3 text-slate-900 font-bold text-base h-full"
                            placeholder="e.g. 0123456789"
                            placeholderTextColor="#9CA3AF"
                            keyboardType="numeric"
                            maxLength={10}
                            value={accountNumber}
                            onChangeText={setAccountNumber}
                        />
                    </View>

                    {/* Verify Button / Verified Status */}
                    {accountName ? (
                        <View className="bg-green-50 border border-green-200 rounded-2xl p-4 mt-2 flex-row items-center">
                            <View className="bg-green-100 p-2 rounded-full mr-3">
                                <Ionicons name="checkmark-circle" size={20} color="#10B981" />
                            </View>
                            <View className="flex-1">
                                <Text className="text-green-700 text-[10px] font-bold uppercase mb-1">Account Verified</Text>
                                <Text className="text-green-950 font-black" numberOfLines={1}>{accountName}</Text>
                            </View>
                        </View>
                    ) : (
                        <TouchableOpacity
                            activeOpacity={0.7}
                            onPress={verifyAccount}
                            disabled={verifying || !selectedBank || accountNumber.length < 10}
                            className={`mt-2 rounded-xl py-3 items-center ${
                                verifying || !selectedBank || accountNumber.length < 10 
                                ? 'bg-gray-100' 
                                : 'bg-gray-900'
                            }`}
                        >
                            {verifying ? (
                                <ActivityIndicator size="small" color="#111827" />
                            ) : (
                                <Text className={`font-bold ${
                                    verifying || !selectedBank || accountNumber.length < 10 
                                    ? 'text-gray-400' 
                                    : 'text-white'
                                }`}>Verify Account</Text>
                            )}
                        </TouchableOpacity>
                    )}
                </View>

                {/* Withdrawal Details Section */}
                <Text className={`font-bold mb-4 uppercase tracking-wider text-xs ml-1 ${accountName ? 'text-slate-900' : 'text-gray-400'}`}>
                    2. Withdrawal Details
                </Text>

                <View className={`bg-white rounded-3xl p-5 border border-gray-100 mb-8 ${accountName ? 'opacity-100' : 'opacity-50'}`}>
                    {/* Amount */}
                    <Text className="text-gray-500 text-xs font-bold mb-2 ml-1">Amount (₦)</Text>
                    <View className="flex-row items-center bg-gray-50 border border-gray-200 rounded-2xl px-4 h-14 mb-4">
                        <Banknote size={20} color="#9CA3AF" />
                        <TextInput 
                            editable={!!accountName}
                            className="flex-1 ml-3 text-slate-900 font-bold text-base h-full"
                            placeholder="Enter amount to withdraw"
                            placeholderTextColor="#9CA3AF"
                            keyboardType="numeric"
                            value={amount}
                            onChangeText={setAmount}
                        />
                    </View>

                    {/* PIN */}
                    <Text className="text-gray-500 text-xs font-bold mb-2 ml-1">Transaction PIN</Text>
                    <View className="flex-row items-center bg-gray-50 border border-gray-200 rounded-2xl px-4 h-14">
                        <Lock size={20} color="#9CA3AF" />
                        <TextInput 
                            editable={!!accountName}
                            className="flex-1 ml-3 text-slate-900 font-bold text-base h-full tracking-widest"
                            placeholder="••••"
                            placeholderTextColor="#9CA3AF"
                            keyboardType="numeric"
                            secureTextEntry={true}
                            maxLength={4}
                            value={pin}
                            onChangeText={setPin}
                        />
                    </View>
                </View>

                {/* Submit Button */}
                <TouchableOpacity
                    activeOpacity={0.7}
                    onPress={handleWithdraw}
                    disabled={withdrawing || !accountName || amount === "" || pin.length < 4}
                    className={`rounded-[25px] h-14 items-center justify-center flex-row ${
                        withdrawing || !accountName || amount === "" || pin.length < 4
                        ? 'bg-gray-200'
                        : 'bg-green-500'
                    }`}
                >
                    {withdrawing ? (
                        <View className="flex-row items-center">
                            <ActivityIndicator color="white" />
                            <Text className="text-white font-black text-sm ml-2">Submitting Payout Request...</Text>
                        </View>
                    ) : (
                        <>
                            <Ionicons name="paper-plane" size={20} color={!accountName || amount === "" || pin.length < 4 ? '#9CA3AF' : 'white'} />
                            <Text className={`font-black ml-2 text-lg ${
                                !accountName || amount === "" || pin.length < 4 ? 'text-gray-400' : 'text-white'
                            }`}>
                                Send to Bank
                            </Text>
                        </>
                    )}
                </TouchableOpacity>
            </ScrollView>
            </KeyboardAvoidingView>
        </SafeScreen>
    );
}
