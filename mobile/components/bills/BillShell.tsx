import { useWallet } from '@/context/WalletContext';
import { useTabBarSpace } from '@/hooks/useTabBarSpace';
import { Image } from 'expo-image';
import { Stack, useRouter } from 'expo-router';
import { ChevronLeft } from 'lucide-react-native';
import React, { useRef } from 'react';
import { KeyboardAvoidingView, ScrollView, StatusBar, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

/** Readable message from an axios error (the API returns { error } or { message }). */
export function errMsg(err: any): string {
    const data = err?.response?.data;
    return data?.error || data?.message || data?.detail || 'Something went wrong. Please try again.';
}

export function BillShell({ title, children }: { title: string; children: React.ReactNode }) {
    const tabSpace = useTabBarSpace();
    const router = useRouter();
    const { availableBalance } = useWallet();

    return (
        <SafeAreaView className="flex-1 bg-background">
            <Stack.Screen options={{ headerShown: false }} />
            <StatusBar barStyle="dark-content" />

            <View className="flex-row items-center px-5 py-4 bg-white border-b border-slate-100">
                <TouchableOpacity onPress={() => router.back()} className="mr-2" hitSlop={8}>
                    <ChevronLeft size={24} color="#0f172a" />
                </TouchableOpacity>
                <Image
                    source={require('@/assets/images/gl.jpeg')}
                    className="w-8 h-8 rounded-xl mr-2.5"
                    contentFit="cover"
                />
                <Text className="flex-1 text-lg font-black text-slate-900 tracking-tight">{title}</Text>
                <View className="bg-primary-container px-3 py-1.5 rounded-full">
                    <Text className="text-xs font-black text-primary-dark">₦{Number(availableBalance).toLocaleString()}</Text>
                </View>
            </View>

            <KeyboardAvoidingView style={{ flex: 1 }} behavior="padding">
                <ScrollView
                    contentContainerStyle={{ padding: 24, paddingBottom: tabSpace }}
                    showsVerticalScrollIndicator={false}
                    keyboardShouldPersistTaps="handled"
                >
                    {children}
                </ScrollView>
            </KeyboardAvoidingView>
        </SafeAreaView>
    );
}

export function Field({ label, children }: { label: string; children: React.ReactNode }) {
    return (
        <View className="mb-6">
            <Text className="text-gray-700 font-bold text-xs mb-2">{label}</Text>
            {children}
        </View>
    );
}

export const inputClass =
    'border border-gray-300 rounded-xl px-4 h-14 bg-white text-slate-900 font-bold text-base';

export function Notice({ tone, children }: { tone: 'red' | 'amber' | 'green'; children: React.ReactNode }) {
    const styles = {
        red: 'bg-red-50 border-red-200 text-red-700',
        amber: 'bg-amber-50 border-amber-200 text-amber-700',
        green: 'bg-green-50 border-green-200 text-green-700',
    }[tone].split(' ');
    return (
        <View className={`${styles[0]} border ${styles[1]} rounded-xl p-4 mb-4`}>
            <Text className={`${styles[2]} font-bold text-sm`}>{children}</Text>
        </View>
    );
}

/** After a purchase call: 200 -> receipt, 202 -> pending notice + history. */
export function useFinishPurchase() {
    const router = useRouter();
    const { refreshWallet } = useWallet();

    return async (
        res: { http_status: number; order_id?: string; token?: string; message?: string },
        receipt: { network: string; planName: string; amount: string; phone: string },
    ) => {
        await refreshWallet();
        if (res.http_status === 200) {
            router.replace({
                pathname: '/market/receipt',
                params: { orderId: res.order_id || 'N/A', status: 'successful', token: res.token, ...receipt },
            });
            return null;
        }
        return res.message || 'Order submitted for processing. Check history for status updates.';
    };
}

/**
 * One key per distinct purchase. It is kept across retries after a network failure
 * (no response) so the server can recognise the retry, but only while the purchase
 * details are unchanged: pass the details as `fingerprint`, and any change (another
 * phone number, plan, amount...) gets a fresh key. It is dropped once the server has
 * given a definite answer.
 */
export function useIdempotencyKey() {
    const ref = useRef<{ key: string; fingerprint: string } | null>(null);
    return {
        get: (fingerprint: string) => {
            if (!ref.current || ref.current.fingerprint !== fingerprint) {
                ref.current = {
                    key: `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 12)}`,
                    fingerprint,
                };
            }
            return ref.current.key;
        },
        settle: (err?: any) => {
            // Keep the key only when we never heard back from the server.
            if (!err || err.response) ref.current = null;
        },
    };
}
