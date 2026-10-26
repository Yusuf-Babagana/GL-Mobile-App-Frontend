import { BillShell, Field, Notice, errMsg, inputClass, useFinishPurchase } from '@/components/bills/BillShell';
import { Button } from '@/components/ui/Button';
import { Select } from '@/components/ui/Select';
import { useWallet } from '@/context/WalletContext';
import { marketAPI } from '@/lib/marketApi';
import { useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, Text, TextInput, View } from 'react-native';

const METER_TYPES = [
    { label: 'Prepaid', value: 'prepaid' },
    { label: 'Postpaid', value: 'postpaid' },
];

export default function ElectricityScreen() {
    const router = useRouter();
    const { availableBalance } = useWallet();
    const finish = useFinishPurchase();
    const [discos, setDiscos] = useState<{ label: string; value: string }[]>([]);
    const [minimum, setMinimum] = useState(1000);
    const [fee, setFee] = useState(0);
    const [disco, setDisco] = useState<string>();
    const [meterType, setMeterType] = useState('prepaid');
    const [meterNo, setMeterNo] = useState('');
    const [customer, setCustomer] = useState<string | null>(null);
    const [verifyError, setVerifyError] = useState<string | null>(null);
    const [verifying, setVerifying] = useState(false);
    const [phone, setPhone] = useState('');
    const [amountText, setAmountText] = useState('');
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        marketAPI.fetchDiscos()
            .then((d) => {
                setDiscos(d.discos.map((x) => ({ label: x.name, value: x.code })));
                setMinimum(Number(d.minimum_amount));
                setFee(Number(d.service_fee));
            })
            .catch((err) => Alert.alert('Error', errMsg(err)));
    }, []);

    // A verified name is only valid for the details it was verified against.
    useEffect(() => {
        setCustomer(null);
        setVerifyError(null);
    }, [disco, meterType, meterNo]);

    const amount = Number(amountText) || 0;
    const total = amount + fee;
    const balance = Number(availableBalance);
    const validAmount = amount >= minimum;
    const insufficient = validAmount && balance < total;
    const canVerify = !!disco && meterNo.length >= 6 && !verifying;
    const canSubmit = !loading && !!customer && phone.length === 11 && validAmount && !insufficient;

    const handleVerify = async () => {
        setVerifying(true);
        setVerifyError(null);
        try {
            const res = await marketAPI.verifyMeter(disco!, meterNo, meterType);
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
            const res = await marketAPI.purchaseElectricity({
                disco: disco!, meter_no: meterNo, meter_type: meterType, phone, amount,
            });
            const discoName = discos.find((d) => d.value === disco)?.label ?? 'Electricity';
            const pending = await finish(res, {
                network: discoName, planName: `${meterType} meter ${meterNo}`, amount: String(total), phone,
            });
            if (pending) {
                Alert.alert('Processing', pending + ' Your token will appear in your history once confirmed.');
                router.push('/market/data-history');
            }
        } catch (err: any) {
            Alert.alert('Failed', errMsg(err));
        } finally {
            setLoading(false);
        }
    };

    return (
        <BillShell title="Pay Electricity">
            <View style={{ opacity: discos.length ? 1 : 0.5 }} pointerEvents={discos.length ? 'auto' : 'none'}>
                <Select
                    label="Distribution Company:"
                    placeholder={discos.length ? 'Select disco' : 'Loading...'}
                    options={discos}
                    value={disco}
                    onValueChange={setDisco}
                />
            </View>

            <Select label="Meter Type:" placeholder="Select meter type" options={METER_TYPES} value={meterType} onValueChange={setMeterType} />

            <Field label="Meter Number:">
                <TextInput
                    className={inputClass}
                    placeholder="Enter meter number"
                    placeholderTextColor="#9CA3AF"
                    keyboardType="numeric"
                    value={meterNo}
                    onChangeText={(t) => setMeterNo(t.replace(/[^0-9]/g, ''))}
                    maxLength={20}
                />
            </Field>

            {customer ? (
                <Notice tone="green">{customer}</Notice>
            ) : (
                <View className="mb-6">
                    <Button title="Verify Meter" onPress={handleVerify} disabled={!canVerify} loading={verifying} size="lg" />
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

            <Field label={`Amount (minimum ₦${minimum.toLocaleString()}):`}>
                <TextInput
                    className={inputClass}
                    placeholder={String(minimum)}
                    placeholderTextColor="#9CA3AF"
                    keyboardType="numeric"
                    value={amountText}
                    onChangeText={(t) => setAmountText(t.replace(/[^0-9]/g, ''))}
                    maxLength={6}
                />
            </Field>

            {validAmount && (
                <View className="border border-gray-200 rounded-xl p-4 mb-4 bg-gray-50">
                    <Text className="text-gray-500 font-bold text-xs">Service fee: ₦{fee.toLocaleString()}</Text>
                    <Text className="text-slate-900 font-black text-lg">Total: ₦{total.toLocaleString()}</Text>
                </View>
            )}

            {insufficient && <Notice tone="red">Insufficient wallet balance. Top up your wallet to continue.</Notice>}
            {amountText.length > 0 && !validAmount && <Notice tone="amber">Minimum amount is ₦{minimum.toLocaleString()}.</Notice>}

            <Button title="Pay Bill" onPress={handlePurchase} disabled={!canSubmit} loading={loading} size="lg" />
            {!discos.length && <ActivityIndicator color="#329629" className="mt-4" />}
        </BillShell>
    );
}
