import NetworkSelector, { NETWORKS } from '@/components/data/NetworkSelector';
import { Button } from '@/components/ui/Button';
import { Select } from '@/components/ui/Select';
import { useWallet } from '@/context/WalletContext';
import { useIdempotencyKey } from '@/components/bills/BillShell';
import { fetchDataPlans } from '@/src/services/financeService';
import { marketAPI } from '@/lib/marketApi';
import { useTabBarSpace } from '@/hooks/useTabBarSpace';
import { Stack, useRouter } from 'expo-router';
import { Smartphone, Phone, Zap, Tv } from 'lucide-react-native';
import React, { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Alert, KeyboardAvoidingView, Platform, ScrollView, StatusBar, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Image } from 'expo-image';

export default function DataPurchaseScreen() {
    const tabSpace = useTabBarSpace();
    const router = useRouter();
    const { availableBalance, refreshWallet } = useWallet();
    const [selectedNetwork, setSelectedNetwork] = useState(NETWORKS[0].id);
    const [plans, setPlans] = useState<any[]>([]);
    const [dataType, setDataType] = useState<string | null>(null);
    const [selectedPlan, setSelectedPlan] = useState<any>(null);
    const [phoneNumber, setPhoneNumber] = useState('');
    const idem = useIdempotencyKey();
    const [loading, setLoading] = useState(false);
    const [fetchingPlans, setFetchingPlans] = useState(false);

    const walletBalance = Number(availableBalance);

    const groupedPlans = useMemo(() => {
        if (!plans || plans.length === 0) return [];

        const groups = plans.reduce((acc: any[], plan: any) => {
            const name = (plan.name || plan.Name || "").toUpperCase();
            let type = "Direct/Gifting";

            if (name.includes("SME")) type = "SME";
            else if (name.includes("AWOOF") || name.includes("PROMO")) type = "Awoof";
            else if (name.includes("CG") || name.includes("CORPORATE")) type = "Corporate";

            const existingSection = acc.find(s => s.title === type);
            if (existingSection) {
                existingSection.data.push(plan);
            } else {
                acc.push({ title: type, data: [plan] });
            }
            return acc;
        }, []);

        return groups.sort((a) => (a.title === "SME" ? -1 : 1));
    }, [plans]);

    const dataTypeOptions = useMemo(
        () => groupedPlans.map((g: any) => ({ label: g.title, value: g.title })),
        [groupedPlans]
    );

    const currentTypeGroup = useMemo(
        () => groupedPlans.find((g: any) => g.title === dataType),
        [groupedPlans, dataType]
    );

    const planOptions = useMemo(() => {
        if (!currentTypeGroup) return [];
        return currentTypeGroup.data.map((item: any) => {
            const rawName = item.name || item.Name || '';
            const name = rawName.split('(')[0].trim();
            const price = Math.round(Number(item.variation_amount || item.Amount));
            const code = String(item.variation_code || item.ID);
            return { label: `${name} — ₦${price.toLocaleString()}`, value: code };
        });
    }, [currentTypeGroup]);

    useEffect(() => {
        const loadPlans = async () => {
            setPlans([]);
            setDataType(null);
            setSelectedPlan(null);
            setFetchingPlans(true);
            try {
                const fetched = await fetchDataPlans(selectedNetwork);
                setPlans(fetched || []);
            } catch (err) {

            } finally {
                setFetchingPlans(false);
            }
        };

        loadPlans();
    }, [selectedNetwork]);

    const handleSelectDataType = (value: string) => {
        setDataType(value);
        setSelectedPlan(null);
    };

    const handleSelectPlan = (value: string) => {
        const item = currentTypeGroup?.data.find(
            (p: any) => String(p.variation_code || p.ID) === value
        );
        setSelectedPlan(item || null);
    };

    const planPrice = selectedPlan
        ? Math.round(Number(selectedPlan.variation_amount || selectedPlan.Amount))
        : 0;

    const handlePurchase = async () => {
        if (!phoneNumber || phoneNumber.length < 11) {
            return Alert.alert("Invalid Phone", "Please enter a valid 11-digit number.");
        }
        if (!selectedPlan) return Alert.alert("Error", "Select a plan.");

        const planId = String(selectedPlan.variation_code || selectedPlan.ID);

        if (walletBalance < planPrice) {
            return Alert.alert("Insufficient Balance", "Please top up your wallet.");
        }

        setLoading(true);
        try {
            const res = await marketAPI.purchaseData({
                service_id: selectedNetwork,
                variation_code: planId,
                phone: phoneNumber,
                amount: planPrice,
            }, idem.get(`${selectedNetwork}|${planId}|${phoneNumber}`));
            idem.settle();

            await refreshWallet();
            router.replace({
                pathname: '/market/receipt',
                params: {
                    orderId: res.order_id || 'N/A',
                    network: selectedNetwork,
                    planName: selectedPlan.name || selectedPlan.Name,
                    amount: String(planPrice),
                    phone: phoneNumber,
                    status: 'successful',
                },
            });
        } catch (err: any) {
            idem.settle(err);
            Alert.alert("Failed", err?.response?.data?.error || err?.response?.data?.message || "Network problem. If you were charged, check your history before trying again.");
        } finally {
            setLoading(false);
        }
    };

    const insufficientBalance = !!selectedPlan && walletBalance < planPrice;
    const canSubmit = !loading && !!selectedPlan && phoneNumber.length === 11 && !insufficientBalance;

    return (
        <SafeAreaView className="flex-1 bg-background">
            <Stack.Screen options={{ headerShown: false }} />
            <StatusBar barStyle="dark-content" />

            <View className="flex-row items-center px-5 py-4 bg-white border-b border-slate-100">
                <Image
                    source={require('@/assets/images/gl.jpeg')}
                    className="w-8 h-8 rounded-xl mr-2.5"
                    contentFit="cover"
                />
                <Text className="flex-1 text-lg font-black text-slate-900 tracking-tight">Purchase Data</Text>
                <View className="bg-primary-container px-3 py-1.5 rounded-full">
                    <Text className="text-xs font-black text-primary-dark">₦{walletBalance.toLocaleString()}</Text>
                </View>
            </View>

            <KeyboardAvoidingView style={{ flex: 1 }} behavior="padding">
            <ScrollView
                contentContainerStyle={{ padding: 24, paddingBottom: tabSpace }}
                showsVerticalScrollIndicator={false}
                keyboardShouldPersistTaps="handled"
            >
                <View className="flex-row gap-3 mb-6">
                    {[
                        { label: 'Airtime', href: '/finance/airtime', Icon: Phone },
                        { label: 'Electricity', href: '/finance/electricity', Icon: Zap },
                        { label: 'Cable TV', href: '/finance/cable', Icon: Tv },
                    ].map(({ label, href, Icon }) => (
                        <TouchableOpacity
                            key={href}
                            onPress={() => router.push(href as any)}
                            className="flex-1 bg-white border border-gray-200 rounded-2xl py-3 items-center"
                        >
                            <Icon size={20} color="#329629" />
                            <Text className="text-slate-900 font-bold text-xs mt-1">{label}</Text>
                        </TouchableOpacity>
                    ))}
                </View>

                <NetworkSelector selectedNetwork={selectedNetwork} onSelectNetwork={setSelectedNetwork} />

                <Text className="text-gray-700 font-bold text-xs mb-2">Phone Number:</Text>
                <View className="flex-row items-center border border-gray-300 rounded-xl px-4 h-14 mb-6 bg-white">
                    <Smartphone size={20} color="#9CA3AF" />
                    <TextInput
                        className="flex-1 ml-3 text-slate-900 font-bold text-base h-full"
                        placeholder="08012345678"
                        placeholderTextColor="#9CA3AF"
                        keyboardType="numeric"
                        value={phoneNumber}
                        onChangeText={setPhoneNumber}
                        maxLength={11}
                    />
                </View>

                <View style={{ opacity: fetchingPlans || dataTypeOptions.length === 0 ? 0.5 : 1 }} pointerEvents={fetchingPlans || dataTypeOptions.length === 0 ? 'none' : 'auto'}>
                    <Select
                        label="Data Type:"
                        placeholder={fetchingPlans ? 'Loading plans...' : 'Select data type'}
                        options={dataTypeOptions}
                        value={dataType || undefined}
                        onValueChange={handleSelectDataType}
                    />
                </View>

                <View style={{ opacity: dataType ? 1 : 0.5 }} pointerEvents={dataType ? 'auto' : 'none'}>
                    <Select
                        label="Plan Type:"
                        placeholder="Select a plan"
                        options={planOptions}
                        value={selectedPlan ? String(selectedPlan.variation_code || selectedPlan.ID) : undefined}
                        onValueChange={handleSelectPlan}
                    />
                </View>

                {fetchingPlans && (
                    <View className="items-center mb-4">
                        <ActivityIndicator color="#329629" />
                    </View>
                )}

                <Text className="text-gray-700 font-bold text-xs mb-2">Amount:</Text>
                <View className="border border-gray-200 rounded-xl p-4 mb-4 bg-gray-50">
                    <Text className="text-slate-900 font-black text-lg">
                        ₦{planPrice ? planPrice.toLocaleString() : '0.0'}
                    </Text>
                </View>

                {insufficientBalance && (
                    <View className="bg-red-50 border border-red-200 rounded-xl p-4 mb-4">
                        <Text className="text-red-700 font-bold text-sm">
                            Insufficient wallet balance for this plan. Top up your wallet to continue.
                        </Text>
                    </View>
                )}

                {!!selectedPlan && !insufficientBalance && phoneNumber.length > 0 && phoneNumber.length !== 11 && (
                    <View className="bg-amber-50 border border-amber-200 rounded-xl p-4 mb-4">
                        <Text className="text-amber-700 font-bold text-sm">
                            Enter a valid 11-digit phone number to continue.
                        </Text>
                    </View>
                )}

                <Button
                    title="Purchase"
                    onPress={handlePurchase}
                    disabled={!canSubmit}
                    loading={loading}
                    size="lg"
                />

                <TouchableOpacity
                    onPress={() => router.push('/market/data-history')}
                    className="items-center mt-6"
                >
                    <Text className="text-primary font-bold text-sm">View Receipt History</Text>
                </TouchableOpacity>
            </ScrollView>
            </KeyboardAvoidingView>
        </SafeAreaView>
    );
}
