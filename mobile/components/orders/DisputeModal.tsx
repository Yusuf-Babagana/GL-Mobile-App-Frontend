import { marketAPI } from '@/lib/marketApi';
import React, { useState } from 'react';
import { ActivityIndicator, Alert, KeyboardAvoidingView, Modal, Platform, Text, TextInput, TouchableOpacity, View } from 'react-native';

const REASONS = [
    { value: 'not_received', label: 'Item not received' },
    { value: 'not_as_described', label: 'Not as described' },
    { value: 'damaged', label: 'Damaged / faulty' },
    { value: 'other', label: 'Other' },
];

export default function DisputeModal({
    visible, orderId, onClose, onOpened,
}: { visible: boolean; orderId: number; onClose: () => void; onOpened: () => void }) {
    const [reason, setReason] = useState('not_received');
    const [description, setDescription] = useState('');
    const [loading, setLoading] = useState(false);

    const submit = async () => {
        setLoading(true);
        try {
            await marketAPI.openDispute(orderId, reason, description.trim());
            setDescription('');
            onOpened();
        } catch (err: any) {
            Alert.alert('Could not open dispute', err?.message || 'Please try again.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
            <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} className="flex-1 justify-end bg-black/40">
                <View className="bg-white rounded-t-3xl p-6">
                    <Text className="text-xl font-black text-slate-900 mb-1">Report a problem</Text>
                    <Text className="text-gray-500 text-sm mb-4">
                        Your payment stays frozen while our team reviews this. The seller will not be paid until it is resolved.
                    </Text>

                    {REASONS.map((r) => (
                        <TouchableOpacity
                            key={r.value}
                            onPress={() => setReason(r.value)}
                            className={`border rounded-xl px-4 py-3 mb-2 ${reason === r.value ? 'border-primary bg-green-50' : 'border-gray-200'}`}
                        >
                            <Text className={`font-bold ${reason === r.value ? 'text-primary' : 'text-slate-700'}`}>{r.label}</Text>
                        </TouchableOpacity>
                    ))}

                    <TextInput
                        className="border border-gray-300 rounded-xl p-4 mt-2 mb-4 text-slate-900"
                        placeholder="Describe what went wrong (at least 10 characters)"
                        placeholderTextColor="#9CA3AF"
                        multiline
                        numberOfLines={4}
                        textAlignVertical="top"
                        value={description}
                        onChangeText={setDescription}
                        style={{ minHeight: 100 }}
                    />

                    <TouchableOpacity
                        onPress={submit}
                        disabled={loading || description.trim().length < 10}
                        className={`py-4 rounded-2xl items-center ${description.trim().length < 10 ? 'bg-gray-300' : 'bg-red-600'}`}
                    >
                        {loading ? <ActivityIndicator color="white" /> : <Text className="text-white font-bold text-base">Open dispute</Text>}
                    </TouchableOpacity>
                    <TouchableOpacity onPress={onClose} className="py-3 items-center">
                        <Text className="text-gray-500 font-bold">Cancel</Text>
                    </TouchableOpacity>
                </View>
            </KeyboardAvoidingView>
        </Modal>
    );
}
