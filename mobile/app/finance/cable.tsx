import { BillShell, Field, Notice, errMsg, inputClass, useFinishPurchase } from '@/components/bills/BillShell';
import { Button } from '@/components/ui/Button';
import { Select } from '@/components/ui/Select';
import { useWallet } from '@/context/WalletContext';
import { marketAPI } from '@/lib/marketApi';
import { useRouter } from 'expo-router';
import React, { useEffect, useMemo, useState } from 'react';
import { Alert, Text, TextInput, View } from 'react-native';

const PROVIDERS = [
    { label: 'DStv', value: 'dstv' },
    { label: 'GOtv', value: 'gotv' },
    { label: 'StarTimes', value: 'startimes' },
];

type Plan = { package_id: string; name: string; price: string };

export default function CableScreen() {
    const router = useRouter();
    const { availableBalance } = useWallet();
    const finish = useFinishPurchase();
    const [provider, setProvider] = useState('dstv');
    const [plans, setPlans] = useState<Plan[]>([]);
    const [loadingPlans, setLoadingPlans] = useState(false);
    const [packageId, setPackageId] = useState<string>();
    const [smartcard, setSmartcard] = useState('');
    const [customer, setCustomer] = useState<string | null>(null);
    const [verifyError, setVerifyError] = useState<string | null>(null);
    const [verifying, setVerifying] = useState(false);
    const [phone, setPhone] = useState('');
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        setPlans([]);
        setPackageId(undefined);
        setLoadingPlans(true);
        marketAPI.fetchCablePlans(provider)
            .then(setPlans)
            .catch((err) => Alert.alert('Error', errMsg(err)))
            .finally(() => setLoadingPlans(false));
    }, [provider]);

    useEffect(() => {
        setCustomer(null);
        setVerifyError(null);
    }, [provider, smartcard]);

    const plan = useMemo(() => plans.find((p) => p.package_id === packageId), [plans, packageId]);
    const price = plan ? Math.round(Number(plan.price)) : 0;
    const planOptions = plans.map((p) => ({
        label: `${p.name} — ₦${Math.round(Number(p.price)).toLocaleString()}`,
        value: p.package_id,
    }));
    const insufficient = !!plan && Number(availableBalance) < price;
    const canVerify = smartcard.length >= 8 && !verifying;
    const canSubmit = !loading && !!plan && !!customer && phone.length === 11 && !insufficient;

    const handleVerify = async () => {
        setVerifying(true);
        setVerifyError(null);
        try {
            const res = await marketAPI.verifySmartcard(provider, smartcard);
            setCustomer(res.customer_name);
        } catch (err: any) {
            setVerifyError(errMsg(err));
        } finally {
            setVerifying(false);
        }
    };

    const handlePurchase = async () => {
        setLoading(true);
        try {
            const res = await marketAPI.purchaseCable({
                cable_tv: provider, package_id: plan!.package_id, smartcard, phone,
            });
            const pending = await finish(res, {
                network: PROVIDERS.find((p) => p.value === provider)!.label,
                planName: plan!.name, amount: String(price), phone,
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
        <BillShell title="Cable TV">
            <Select label="Provider:" placeholder="Select provider" options={PROVIDERS} value={provider} onValueChange={setProvider} />

            <View style={{ opacity: loadingPlans || !plans.length ? 0.5 : 1 }} pointerEvents={loadingPlans || !plans.length ? 'none' : 'auto'}>
                <Select
                    label="Package:"
                    placeholder={loadingPlans ? 'Loading packages...' : 'Select a package'}
                    options={planOptions}
                    value={packageId}
                    onValueChange={setPackageId}
                />
            </View>

            <Field label="Smartcard / IUC Number:">
                <TextInput
                    className={inputClass}
                    placeholder="Enter smartcard number"
                    placeholderTextColor="#9CA3AF"
                    keyboardType="numeric"
                    value={smartcard}
                    onChangeText={(t) => setSmartcard(t.replace(/[^0-9]/g, ''))}
                    maxLength={20}
                />
            </Field>

            {customer ? (
                <Notice tone="green">{customer}</Notice>
            ) : (
                <View className="mb-6">
                    <Button title="Verify Smartcard" onPress={handleVerify} disabled={!canVerify} loading={verifying} size="lg" />
                    {!!verifyError && <Text className="text-red-600 font-bold text-xs mt-2">{verifyError}</Text>}
                </View>
            )}

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

            <Field label="Amount:">
                <View className="border border-gray-200 rounded-xl p-4 bg-gray-50">
                    <Text className="text-slate-900 font-black text-lg">₦{price ? price.toLocaleString() : '0'}</Text>
                </View>
            </Field>

            {insufficient && <Notice tone="red">Insufficient wallet balance. Top up your wallet to continue.</Notice>}

            <Button title="Subscribe" onPress={handlePurchase} disabled={!canSubmit} loading={loading} size="lg" />
        </BillShell>
    );
}
