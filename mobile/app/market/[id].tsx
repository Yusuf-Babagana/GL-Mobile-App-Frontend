import { Colors } from "@/constants/Colors";
import { useAuth } from "@/context/AuthContext";
import { marketAPI } from "@/lib/marketApi";
import { Ionicons } from "@expo/vector-icons";
import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import { useLocalSearchParams, useRouter } from "expo-router";
import React, { useEffect, useState } from "react";
import { ActivityIndicator, Alert, FlatList, Text, TouchableOpacity, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { ErrorState } from "@/components/ErrorState";

export default function StorePublicView() {
    const { id } = useLocalSearchParams();
    const router = useRouter();
    const insets = useSafeAreaInsets();
    const { isSignedIn, user } = useAuth();
    const [store, setStore] = useState<any>(null);
    const [products, setProducts] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [loadError, setLoadError] = useState(false);

    const fetchStoreData = async () => {
        try {
            setLoading(true);
            setLoadError(false);
            // Fetch store details and all products
            const [storeData, data] = await Promise.all([
                marketAPI.getStoreDetail(id as string),
                marketAPI.getProducts(null, null, id as string)
            ]);
            setStore(storeData);
            const storeProducts = data?.results ?? [];
            setProducts(storeProducts);
        } catch (e) {
            console.error(e);
            setLoadError(true);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchStoreData();
    }, [id]);

    if (loading) {
        return (
            <View className="flex-1 items-center justify-center bg-background">
                <ActivityIndicator size="large" color={Colors.primary} />
            </View>
        );
    }

    if (loadError) {
        return (
            <ErrorState
                title="Couldn't load this store"
                description="Check your connection and try again."
                onRetry={fetchStoreData}
            />
        );
    }

    return (
        <View className="flex-1 bg-background">
            {/* Header / Banner */}
            <LinearGradient
                colors={[Colors.primaryDark, Colors.primary]}
                start={{ x: 0, y: 0 }}
                end={{ x: 0, y: 1 }}
                className="pb-10 px-6 rounded-b-[40px] shadow-lg shadow-primary/30"
                style={{ paddingTop: insets.top + 12 }}
            >
                <TouchableOpacity
                    onPress={() => router.back()}
                    activeOpacity={0.7}
                    hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                    accessibilityLabel="Go back"
                    accessibilityRole="button"
                    className="mb-6 w-10 h-10 bg-white/20 rounded-full items-center justify-center backdrop-blur-md"
                >
                    <Ionicons name="arrow-back" size={24} color="white" />
                </TouchableOpacity>

                <View className="flex-row items-center">
                    <View className="w-20 h-20 bg-white rounded-2xl overflow-hidden mr-5 border-2 border-white/20 shadow-md">
                        <Image source={{ uri: store?.logo }} className="w-full h-full" contentFit="cover" />
                    </View>
                    <View className="flex-1 justify-center">
                        <View className="flex-row items-center mb-1">
                            <Text className="text-white text-2xl font-black mr-2 tracking-tight leading-7">{store?.name}</Text>
                            {store?.is_verified && <Ionicons name="checkmark-circle" size={18} color={Colors.primaryContainer} />}
                        </View>
                        <Text className="text-primary-container text-xs font-medium bg-primary-dark/30 self-start px-2 py-1 rounded-lg overflow-hidden border border-white/10">
                            {store?.product_count} Products Available
                        </Text>
                    </View>
                </View>
                <Text numberOfLines={3} className="text-primary-container mt-5 text-sm font-medium leading-6 opacity-90 pl-1 border-l-2 border-white/30">{store?.description}</Text>

                {store?.owner_id && store.owner_id !== user?.id && (
                    <TouchableOpacity
                        activeOpacity={0.7}
                        onPress={() => {
                            if (!isSignedIn) {
                                Alert.alert("Login Required", "You need to sign in to message this seller.", [
                                    { text: "Cancel", style: "cancel" },
                                    { text: "Login", onPress: () => router.push("/(auth)/login") }
                                ]);
                                return;
                            }
                            router.push({
                                pathname: "/chat/[id]",
                                params: { id: store.owner_id, name: store?.name || "Seller" }
                            });
                        }}
                        className="flex-row items-center justify-center bg-white/20 mt-5 py-3 rounded-2xl backdrop-blur-md self-start px-6"
                    >
                        <Ionicons name="chatbubble-ellipses" size={16} color="white" />
                        <Text className="text-white font-bold text-xs ml-2">Message Seller</Text>
                    </TouchableOpacity>
                )}
            </LinearGradient>

            {/* Products Grid */}
            <FlatList
                data={products}
                keyExtractor={(item, index) => item?.id?.toString() ?? `item-${index}`}
                numColumns={2}
                columnWrapperStyle={{ justifyContent: 'space-between' }}
                contentContainerStyle={{ padding: 16, paddingBottom: 100 }}
                initialNumToRender={8}
                maxToRenderPerBatch={8}
                windowSize={7}
                removeClippedSubviews
                ListHeaderComponent={<Text className="text-slate-900 font-black text-xl mb-4 ml-1">Store Collection</Text>}
                renderItem={({ item }) => (
                    <TouchableOpacity
                        onPress={() => router.push(`/product/${item.id}`)}
                        activeOpacity={0.7}
                        className="w-[48%] mb-4 bg-white rounded-[24px] shadow-sm border border-slate-100 overflow-hidden"
                        style={{
                            shadowColor: "#64748B",
                            shadowOffset: { width: 0, height: 4 },
                            shadowOpacity: 0.08,
                            shadowRadius: 12,
                            elevation: 4
                        }}
                    >
                        <View className="h-36 bg-slate-50 relative">
                            <Image
                                source={{ uri: item.image || item.images?.[0]?.image }}
                                className="w-full h-full"
                                contentFit="cover"
                                transition={300}
                            />
                        </View>
                        <View className="p-3">
                            <Text className="font-bold text-slate-800 text-sm mb-1" numberOfLines={1}>{item.name}</Text>
                            <Text className="text-primary font-black text-sm">₦{Number(item.price).toLocaleString()}</Text>
                        </View>
                    </TouchableOpacity>
                )}
                ListEmptyComponent={<Text className="text-center text-slate-400 mt-10">This store has no products yet.</Text>}
            />
        </View>
    );
}