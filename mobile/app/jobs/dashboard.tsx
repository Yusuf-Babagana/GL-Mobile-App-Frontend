import { useAuth } from "@/context/AuthContext";
import { JobPosting, jobsAPI } from "@/lib/jobsApi";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import React, { useCallback, useEffect, useState } from "react";
import { ActivityIndicator, RefreshControl, ScrollView, Text, TextInput, TouchableOpacity, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

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

export default function JobSeekerDashboard() {
    const { logout } = useAuth();
    const router = useRouter();

    const [search, setSearch] = useState("");
    const [jobs, setJobs] = useState<JobPosting[]>([]);
    const [appliedCount, setAppliedCount] = useState(0);
    const [interviewingCount, setInterviewingCount] = useState(0);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const loadJobs = useCallback(async (searchTerm: string) => {
        try {
            const data = await jobsAPI.getJobs(searchTerm || undefined);
            setJobs(data.results);
            setError(null);
        } catch {
            setError("Couldn't load jobs. Check your connection and try again.");
        }
    }, []);

    const loadStats = useCallback(async () => {
        try {
            const data = await jobsAPI.getMyApplications();
            setAppliedCount(data.count);
            setInterviewingCount(data.results.filter((a) => a.status === "interviewing").length);
        } catch {
            // Non-fatal — stats just stay at their last known value.
        }
    }, []);

    useEffect(() => {
        setLoading(true);
        Promise.all([loadJobs(""), loadStats()]).finally(() => setLoading(false));
    }, [loadJobs, loadStats]);

    // Debounce search input before hitting the API.
    useEffect(() => {
        const handle = setTimeout(() => {
            loadJobs(search);
        }, 400);
        return () => clearTimeout(handle);
    }, [search, loadJobs]);

    const onRefresh = async () => {
        setRefreshing(true);
        await Promise.all([loadJobs(search), loadStats()]);
        setRefreshing(false);
    };

    return (
        <SafeAreaView className="flex-1 bg-white">
            {/* Header */}
            <View className="px-6 py-4 flex-row justify-between items-center border-b border-gray-100">
                <View>
                    <Text className="text-gray-500 text-xs uppercase font-bold">Job Seeker</Text>
                    <Text className="text-2xl font-bold text-gray-900">Find Work</Text>
                </View>
                <TouchableOpacity onPress={logout} className="bg-gray-100 p-2 rounded-full">
                    <Ionicons name="log-out-outline" size={20} color="#EF4444" />
                </TouchableOpacity>
            </View>

            <ScrollView
                contentContainerStyle={{ padding: 20 }}
                refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={["#329629"]} tintColor="#329629" />}
            >
                {/* Search Bar */}
                <View className="flex-row items-center bg-gray-50 p-4 rounded-xl border border-gray-200 mb-6">
                    <Ionicons name="search" size={20} color="#9CA3AF" />
                    <TextInput
                        value={search}
                        onChangeText={setSearch}
                        placeholder="Search for jobs, skills..."
                        placeholderTextColor="#9CA3AF"
                        className="flex-1 ml-2 text-gray-900"
                    />
                </View>

                {/* Stats */}
                <View className="flex-row gap-4 mb-8">
                    <View className="flex-1 bg-blue-50 p-4 rounded-xl border border-blue-100">
                        <Text className="text-blue-600 font-bold text-2xl">{appliedCount}</Text>
                        <Text className="text-blue-500 text-xs uppercase mt-1">Applied</Text>
                    </View>
                    <View className="flex-1 bg-purple-50 p-4 rounded-xl border border-purple-100">
                        <Text className="text-purple-600 font-bold text-2xl">{interviewingCount}</Text>
                        <Text className="text-purple-500 text-xs uppercase mt-1">Interviews</Text>
                    </View>
                </View>

                {/* Job List */}
                <Text className="text-lg font-bold text-gray-900 mb-4">
                    {search ? "Search results" : "Recommended for you"}
                </Text>

                {loading ? (
                    <View className="items-center justify-center py-10">
                        <ActivityIndicator color="#329629" />
                    </View>
                ) : error ? (
                    <View className="items-center justify-center py-10 border-2 border-dashed border-gray-100 rounded-2xl">
                        <Ionicons name="alert-circle-outline" size={48} color="#D1D5DB" />
                        <Text className="text-gray-500 mt-2 text-center px-6">{error}</Text>
                        <TouchableOpacity
                            onPress={() => loadJobs(search)}
                            className="mt-4 bg-primary px-6 py-2 rounded-full"
                        >
                            <Text className="text-white font-bold">Retry</Text>
                        </TouchableOpacity>
                    </View>
                ) : jobs.length === 0 ? (
                    <View className="items-center justify-center py-10 border-2 border-dashed border-gray-100 rounded-2xl">
                        <Ionicons name="briefcase-outline" size={48} color="#D1D5DB" />
                        <Text className="text-gray-500 mt-2">No jobs found yet</Text>
                        <TouchableOpacity onPress={() => loadJobs(search)} className="mt-4 bg-primary px-6 py-2 rounded-full">
                            <Text className="text-white font-bold">Refresh Feed</Text>
                        </TouchableOpacity>
                    </View>
                ) : (
                    jobs.map((job) => (
                        <TouchableOpacity
                            key={job.id}
                            onPress={() => router.push(`/jobs/${job.id}` as any)}
                            className="bg-white border border-gray-100 rounded-2xl p-4 mb-3 shadow-sm"
                        >
                            <View className="flex-row justify-between items-start">
                                <Text className="text-gray-900 font-bold text-base flex-1 mr-2">{job.title}</Text>
                                <View className="bg-primary/10 px-2 py-1 rounded-full">
                                    <Text className="text-primary text-xs font-bold">{JOB_TYPE_LABELS[job.job_type] ?? job.job_type}</Text>
                                </View>
                            </View>
                            <Text className="text-gray-500 text-sm mt-1">{job.employer_name}</Text>
                            <View className="flex-row items-center mt-3">
                                <Ionicons name="location-outline" size={14} color="#9CA3AF" />
                                <Text className="text-gray-400 text-xs ml-1 mr-4">{job.location}</Text>
                                <Ionicons name="cash-outline" size={14} color="#9CA3AF" />
                                <Text className="text-gray-400 text-xs ml-1">{formatBudget(job)}</Text>
                            </View>
                        </TouchableOpacity>
                    ))
                )}
            </ScrollView>
        </SafeAreaView>
    );
}
