import { Colors } from "@/constants/Colors";
import { marketAPI } from "@/lib/marketApi";
import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect, useRouter } from "expo-router";
import { useCallback, useState } from "react";
import { ActivityIndicator, Alert, FlatList, Linking, StatusBar, Text, TouchableOpacity, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useT as useTranslation } from '@/lib/useT';
import { ErrorState } from "@/components/ErrorState";

export default function OrderListScreen() {
    const { t } = useTranslation();
    const router = useRouter();
    const insets = useSafeAreaInsets();
    const [orders, setOrders] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [loadError, setLoadError] = useState(false);

    const fetchOrders = async () => {
        try {
            setIsLoading(true);
            setLoadError(false);
            const data = await marketAPI.getMyOrders();
            setOrders(data.results || data);
        } catch (e) {
            setLoadError(true);
        } finally {
            setIsLoading(false);
        }
    };

    useFocusEffect(
        useCallback(() => { fetchOrders(); }, [])
    );

    const renderOrder = ({ item }: { item: any }) => (
        <View className="bg-white p-5 rounded-2xl mb-4 shadow-sm border border-gray-100">
            <View className="flex-row justify-between items-start mb-3">
                <View className="flex-1 mr-2">
                    <View className="flex-row items-center gap-2 mb-1">
                        <Text className="font-bold text-gray-900 text-lg">{t('order_hash')}{item.id}</Text>
                        {item.shop_logo && (
                            <View className="w-6 h-6 rounded-full bg-gray-100 overflow-hidden items-center justify-center">
                                <Text className="text-[8px]">{'🏪'}</Text>
                            </View>
                        )}
                    </View>
                    <Text className="text-primary font-bold text-sm">{item.shop_name || t('store')}</Text>
                    <Text className="text-gray-500 text-xs mt-0.5">{new Date(item.created_at).toDateString()}</Text>
                </View>
                <View className={`px-3 py-1 rounded-full ${
                    item.delivery_status === 'cancelled' ? 'bg-red-100'
                    : item.delivery_status === 'delivered' ? 'bg-primary-container'
                    : 'bg-orange-100'
                }`}>
                    <Text className={`text-[10px] font-bold uppercase ${
                        item.delivery_status === 'cancelled' ? 'text-red-700'
                        : item.delivery_status === 'delivered' ? 'text-primary-dark'
                        : 'text-orange-700'
                    }`}>
                        {item.delivery_status.replace("_", " ")}
                    </Text>
                </View>
            </View>

            <View className="h-[1px] bg-gray-50 w-full mb-3" />

            <View className="flex-row justify-between items-center">
                <View>
                    <Text className="text-primary font-bold text-xl">₦{Number(item.total_price).toLocaleString()}</Text>
                    {item.seller_phone && (
                        <TouchableOpacity
                            onPress={() => Linking.openURL(`tel:${item.seller_phone}`)}
                            className="flex-row items-center mt-1"
                        >
                            <Ionicons name="call" size={12} color="#2563EB" />
                            <Text className="text-blue-700 text-xs font-medium ml-1">{t('contact_seller')}</Text>
                        </TouchableOpacity>
                    )}
                </View>
                <TouchableOpacity
                    onPress={() => {
                        const orderId = item?.id;
                        if (orderId && !isNaN(orderId)) {
                            router.push(`/orders/${orderId}`);
                        } else {
                            Alert.alert(t('error'), t('order_id_invalid'));
                        }
                    }}
                    className="bg-gray-900 px-4 py-2 rounded-xl flex-row items-center"
                >
                    <Text className="text-white text-xs font-bold mr-1">{t('details')}</Text>
                    <Ionicons name="chevron-forward" size={14} color="white" />
                </TouchableOpacity>
            </View>
        </View>
    );

    return (
        <View className="flex-1 bg-gray-50">
            <StatusBar barStyle="dark-content" backgroundColor="#F9FAFB" />

            {/* Simple Header */}
            <View className="px-6 py-4 bg-white border-b border-gray-100 flex-row items-center" style={{ paddingTop: insets.top + 12 }}>
                <TouchableOpacity
                    onPress={() => router.back()}
                    hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                    accessibilityLabel="Go back"
                    accessibilityRole="button"
                    className="mr-4"
                >
                    <Ionicons name="arrow-back" size={24} color="black" />
                </TouchableOpacity>
                <Text className="text-xl font-bold text-gray-900">{t('my_orders')}</Text>
            </View>

            {isLoading ? (
                <View className="flex-1 justify-center items-center">
                    <ActivityIndicator color={Colors.primary} />
                </View>
            ) : loadError ? (
                <ErrorState
                    title="Couldn't load your orders"
                    description="Check your connection and try again."
                    onRetry={fetchOrders}
                />
            ) : (
                <FlatList
                    data={orders}
                    keyExtractor={(item, index) => item?.id?.toString() ?? `item-${index}`}
                    renderItem={renderOrder}
                    contentContainerStyle={{ padding: 24 }}
                    initialNumToRender={8}
                    maxToRenderPerBatch={8}
                    windowSize={7}
                    removeClippedSubviews
                    ListEmptyComponent={
                        <View className="items-center mt-20">
                            <Ionicons name="receipt-outline" size={48} color="#D1D5DB" />
                            <Text className="text-gray-400 mt-4">{t('you_have_no_orders')}</Text>
                        </View>
                    }
                />
            )}
        </View>
    );
}