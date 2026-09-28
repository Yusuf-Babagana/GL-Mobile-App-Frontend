import { Button } from "@/components/ui/Button";
import { ScreenWrapper } from "@/components/ui/ScreenWrapper";
import { useAuth } from "@/context/AuthContext";
import { JobPosting, jobsAPI } from "@/lib/jobsApi";
import { Ionicons } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import React, { useEffect, useState } from "react";
import { ActivityIndicator, Alert, ScrollView, Text, TextInput, TouchableOpacity, View } from "react-native";

const JOB_TYPE_LABELS: Record<string, string> = {
    full_time: "Full Time",
    part_time: "Part Time",
    contract: "Contract",
    freelance: "Freelance/Gig",
};

function formatBudget(job: JobPosting) {
    if (!job.budget) return "Negotiable";
    const amount = Number(job.budget).toLocaleString();
    return `${job.currency} ${amount}${job.is_negotiable ? " (negotiable)" : ""}`;
}

export default function JobDetailScreen() {
    const { id } = useLocalSearchParams();
    const router = useRouter();
    const { isSignedIn } = useAuth();

    const [job, setJob] = useState<JobPosting | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const [coverLetter, setCoverLetter] = useState("");
    const [applying, setApplying] = useState(false);
    const [applied, setApplied] = useState(false);

    useEffect(() => {
        jobsAPI.getJob(Number(id))
            .then(setJob)
            .catch(() => setError("Couldn't load this job. It may have been removed."))
            .finally(() => setLoading(false));
    }, [id]);

    const handleApply = async () => {
        if (!isSignedIn) {
            Alert.alert(
                "Sign in required",
                "You need to sign in to apply for jobs.",
                [
                    { text: "Later", style: "cancel" },
                    { text: "Sign in", onPress: () => router.push("/(auth)/login") },
                ]
            );
            return;
        }
        if (!coverLetter.trim()) {
            Alert.alert("Cover letter required", "Tell the employer why you're a good fit before applying.");
            return;
        }

        setApplying(true);
        try {
            await jobsAPI.applyToJob(Number(id), coverLetter.trim());
            setApplied(true);
            Alert.alert("Application sent", "Your application has been submitted successfully.");
        } catch (e: any) {
            const message = e?.response?.data?.detail || e?.response?.data?.error || "Failed to submit your application. Please try again.";
            Alert.alert("Couldn't apply", String(message));
        } finally {
            setApplying(false);
        }
    };

    if (loading) {
        return (
            <ScreenWrapper>
                <View className="flex-1 items-center justify-center">
                    <ActivityIndicator color="#329629" />
                </View>
            </ScreenWrapper>
        );
    }

    if (error || !job) {
        return (
            <ScreenWrapper>
                <View className="flex-1 items-center justify-center px-6">
                    <Ionicons name="alert-circle-outline" size={48} color="#D1D5DB" />
                    <Text className="text-gray-500 mt-2 text-center">{error || "Job not found."}</Text>
                    <TouchableOpacity onPress={() => router.back()} className="mt-4 bg-primary px-6 py-2 rounded-full">
                        <Text className="text-white font-bold">Go back</Text>
                    </TouchableOpacity>
                </View>
            </ScreenWrapper>
        );
    }

    return (
        <ScreenWrapper>
            <View className="bg-white border-b border-gray-100 px-6 pt-12 pb-4 flex-row items-center">
                <TouchableOpacity
                    onPress={() => router.back()}
                    hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                    className="mr-4 p-2 -ml-2 rounded-full active:bg-gray-50"
                >
                    <Ionicons name="arrow-back" size={24} color="#1E293B" />
                </TouchableOpacity>
                <Text className="text-xl font-bold text-gray-900 flex-1" numberOfLines={1}>{job.title}</Text>
            </View>

            <ScrollView contentContainerStyle={{ padding: 24, paddingBottom: 40 }}>
                <View className="flex-row justify-between items-start mb-4">
                    <View className="flex-1 mr-3">
                        <Text className="text-2xl font-bold text-gray-900">{job.title}</Text>
                        <Text className="text-gray-500 mt-1">{job.employer_name}</Text>
                    </View>
                    <View className="bg-primary/10 px-3 py-1.5 rounded-full">
                        <Text className="text-primary text-xs font-bold">{JOB_TYPE_LABELS[job.job_type] ?? job.job_type}</Text>
                    </View>
                </View>

                <View className="flex-row items-center mb-6">
                    <Ionicons name="location-outline" size={16} color="#9CA3AF" />
                    <Text className="text-gray-500 text-sm ml-1 mr-4">{job.location}</Text>
                    <Ionicons name="cash-outline" size={16} color="#9CA3AF" />
                    <Text className="text-gray-500 text-sm ml-1">{formatBudget(job)}</Text>
                </View>

                <Text className="text-gray-900 font-bold text-lg mb-2">Description</Text>
                <Text className="text-gray-600 text-sm leading-6 mb-6">{job.description}</Text>

                {job.requirements?.length > 0 && (
                    <>
                        <Text className="text-gray-900 font-bold text-lg mb-2">Requirements</Text>
                        {job.requirements.map((req, idx) => (
                            <View key={idx} className="flex-row items-start mb-2">
                                <Ionicons name="checkmark-circle-outline" size={18} color="#329629" style={{ marginTop: 1 }} />
                                <Text className="text-gray-600 text-sm ml-2 flex-1">{req}</Text>
                            </View>
                        ))}
                    </>
                )}

                {job.status !== 'open' ? (
                    <View className="mt-6 items-center justify-center py-6 border-2 border-dashed border-gray-100 rounded-2xl">
                        <Text className="text-gray-500 font-semibold">This job is no longer accepting applications.</Text>
                    </View>
                ) : applied ? (
                    <View className="mt-6 items-center justify-center py-6 bg-green-50 border border-green-100 rounded-2xl">
                        <Ionicons name="checkmark-circle" size={32} color="#329629" />
                        <Text className="text-primary font-bold mt-2">Application submitted</Text>
                    </View>
                ) : (
                    <View className="mt-6">
                        <Text className="text-gray-900 font-bold text-lg mb-2">Apply for this job</Text>
                        <TextInput
                            value={coverLetter}
                            onChangeText={setCoverLetter}
                            placeholder="Write a short cover letter explaining why you're a good fit..."
                            placeholderTextColor="#9CA3AF"
                            multiline
                            numberOfLines={5}
                            textAlignVertical="top"
                            className="bg-gray-50 border border-gray-200 rounded-xl p-4 text-gray-900 mb-4"
                            style={{ minHeight: 120 }}
                        />
                        <Button title="Submit Application" onPress={handleApply} loading={applying} />
                    </View>
                )}
            </ScrollView>
        </ScreenWrapper>
    );
}
