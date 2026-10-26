import NetworkSelector, { NETWORKS } from '@/components/data/NetworkSelector';
import { BillShell, Field, Notice, errMsg, inputClass, useFinishPurchase } from '@/components/bills/BillShell';
import { Button } from '@/components/ui/Button';
import { useWallet } from '@/context/WalletContext';
import { marketAPI } from '@/lib/marketApi';
import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import { Alert, Text, TextInput, TouchableOpacity, View } from 'react-native';

const QUICK_AMOUNTS = [100, 200, 500, 1000];

export default function AirtimeScreen() {
    const router = useRouter();
    const { availableBalance } = useWallet();
    const finish = useFinishPurchase();
    const [network, setNetwork] = useState(NETWORKS[0].id);
    const [phone, setPhone] = useState('');
    const [amountText, setAmountText] = useState('');
    const [loading, setLoading] = useState(false);

    const amount = Number(amountText) || 0;
    const balance = Number(availableBalance);
    const validAmount = amount >= 50 && amount <= 50000;
    const insufficient = validAmount && balance < amount;
    const canSubmit = !loading && phone.length === 11 && validAmount && !insufficient;
    // The wallet-side id is "<network>-airtime"; the selector shares ids with data.
    const serviceId = network.replace(/-data$/, '-airtime');
    const networkName = NETWORKS.find((n) => n.id === network)?.name ?? '';

    const handlePurchase = async () => {
        setLoading(true);
        try {
            const res = await marketAPI.purchaseAirtime({ service_id: serviceId, phone, amount });
            const pending = await finish(res, {
                network: networkName, planName: `Airtime ₦${amount.toLocaleString()}`, amount: String(amount), phone,
            });
            if (pending) {
                Alert.alert('Processing', pending);
                router.push('/market/data-history');
            }
        } catch (err: any) {
            Alert.alert('Failed', errMsg(err));
        } finally {
            setLoading(false);
        }
    };

    return (
        <BillShell title="Buy Airtime">
            <NetworkSelector selectedNetwork={network} onSelectNetwork={setNetwork} />

            <Field label="Phone Number:">
                <TextInput
                    className={inputClass}
                    placeholder="08012345678"
                    placeholderTextColor="#9CA3AF"
                    keyboardType="numeric"
                    value={phone}
                    onChangeText={setPhone}
                    maxLength={11}
                />
            </Field>

            <Field label="Amount (₦50 – ₦50,000):">
                <TextInput
                    className={inputClass}
                    placeholder="500"
                    placeholderTextColor="#9CA3AF"
                    keyboardType="numeric"
                    value={amountText}
                    onChangeText={(t) => setAmountText(t.replace(/[^0-9]/g, ''))}
                    maxLength={5}
                />
                <View className="flex-row gap-2 mt-3">
                    {QUICK_AMOUNTS.map((a) => (
                        <TouchableOpacity
                            key={a}
                            onPress={() => setAmountText(String(a))}
                            className="flex-1 bg-white border border-gray-200 rounded-xl py-2.5 items-center"
                        >
                            <Text className="text-slate-900 font-bold text-sm">₦{a.toLocaleString()}</Text>
                        </TouchableOpacity>
                    ))}
                </View>
            </Field>

            {insufficient && <Notice tone="red">Insufficient wallet balance. Top up your wallet to continue.</Notice>}
            {amountText.length > 0 && !validAmount && <Notice tone="amber">Enter an amount between ₦50 and ₦50,000.</Notice>}

            <Button title="Buy Airtime" onPress={handlePurchase} disabled={!canSubmit} loading={loading} size="lg" />
        </BillShell>
    );
}
