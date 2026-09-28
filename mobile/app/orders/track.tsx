import { Colors } from "@/constants/Colors";
import { marketAPI } from '@/lib/marketApi';
import { Ionicons } from '@expo/vector-icons';
import * as Location from 'expo-location';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, Text, TouchableOpacity, View } from 'react-native';
import MapView, { Marker, PROVIDER_GOOGLE } from 'react-native-maps';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function OrderTrackingScreen() {
    const router = useRouter();
    const params = useLocalSearchParams();
    const { orderId } = params;

    const [order, setOrder] = useState<any>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [driverLocation, setDriverLocation] = useState<any>(null);
    const [destination, setDestination] = useState<any>(null);

    // Default region (e.g. Lagos)
    const [region, setRegion] = useState({
        latitude: 6.5244,
        longitude: 3.3792,
        latitudeDelta: 0.1,
        longitudeDelta: 0.1,
    });

    useEffect(() => {
        loadOrderData();
    }, [orderId]);

    const loadOrderData = async () => {
        try {
            setIsLoading(true);

            // 1. Fetch real order details
            if (!orderId) throw new Error("No Order ID provided");
            const data = await marketAPI.getOrderById(Number(orderId));
            setOrder(data);

            // 2. Request Permissions for Geocoding
            const { status } = await Location.requestForegroundPermissionsAsync();
            if (status !== 'granted') {
                Alert.alert('Permission to access location was denied');
                return;
            }

            // 3. Geocode Buyer Address
            let destCoords = null;
            if (data.shipping_address_json) {
                const addressStr = `${data.shipping_address_json.address}, ${data.shipping_address_json.city}`;
                const geocoded = await Location.geocodeAsync(addressStr);
                if (geocoded.length > 0) {
                    destCoords = {
                        latitude: geocoded[0].latitude,
                        longitude: geocoded[0].longitude,
                    };
                    setDestination(destCoords);
                }
            }

            // 4. Geocode Store Address (Simulated Driver Start/Location)
            let driverCoords = null;
            const storeStr = data.shop_address || data.shop_name;
            if (storeStr) {
                const geocodedStore = await Location.geocodeAsync(storeStr);
                if (geocodedStore.length > 0) {
                    driverCoords = {
                        latitude: geocodedStore[0].latitude,
                        longitude: geocodedStore[0].longitude
                    };
                    setDriverLocation(driverCoords);
                }
            }

            // 5. Center Map
            if (destCoords) {
                setRegion({
                    ...region,
                    latitude: destCoords.latitude,
                    longitude: destCoords.longitude,
                    latitudeDelta: 0.05,
                    longitudeDelta: 0.05,
                });
            } else if (driverCoords) {
                setRegion({
                    ...region,
                    latitude: driverCoords.latitude,
                    longitude: driverCoords.longitude,
                });
            }

        } catch (error) {
            Alert.alert("Error", "Failed to load tracking info.");
        } finally {
            setIsLoading(false);
        }
    };

    if (isLoading) {
        return (
            <View className="flex-1 items-center justify-center bg-white">
                <ActivityIndicator size="large" color={Colors.primary} />
                <Text className="text-gray-500 mt-4">Locating your order...</Text>
            </View>
        );
    }

    return (
        <View className="flex-1 bg-gray-100">
            <StatusBar style="dark" />

            {/* Header */}
            <SafeAreaView className="absolute top-0 w-full z-10 px-6 pointer-events-none">
                <View className="flex-row items-center justify-between mt-2 pointer-events-auto">
                    <TouchableOpacity
                        onPress={() => router.back()}
                        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                        accessibilityLabel="Go back"
                        accessibilityRole="button"
                        className="bg-white p-3 rounded-full shadow-sm"
                    >
                        <Ionicons name="arrow-back" size={24} color="black" />
                    </TouchableOpacity>
                    <View className="bg-white px-4 py-2 rounded-full shadow-sm">
                        <Text className="font-bold text-gray-900">Order #{orderId}</Text>
                    </View>
                    <View className="w-12" />
                </View>
            </SafeAreaView>

            {/* Live Map View */}
            <MapView
                provider={PROVIDER_GOOGLE}
                style={{ flex: 1 }}
                region={region}
                onRegionChangeComplete={setRegion}
            >
                {/* Store Marker */}
                {driverLocation && (
                    <Marker
                        coordinate={driverLocation}
                        title="Store"
                        description="Store Location"
                    >
                        <View className="bg-primary p-2 rounded-full border-2 border-white shadow-lg">
                            <Ionicons name="storefront" size={20} color="white" />
                        </View>
                    </Marker>
                )}

                {/* Destination Marker (Buyer) */}
                {destination && (
                    <Marker
                        coordinate={destination}
                        pinColor="blue"
                        title="Delivery Location"
                        description={order?.shipping_address_json?.address}
                    />
                )}
            </MapView>

            {/* Bottom Sheet / Rider Info */}
            <View className="bg-white rounded-t-[32px] p-6 shadow-2xl">
                <View className="items-center mb-6">
                    <View className="w-12 h-1.5 bg-gray-200 rounded-full" />
                </View>

                {/* Status Indicator */}
                <View className="flex-row items-center justify-between mb-8">
                    <View>
                        <Text className="text-gray-500 text-xs font-bold uppercase tracking-wider mb-1">Status</Text>
                        <Text className="text-2xl font-black text-gray-900 capitalize">
                            {order?.delivery_status?.replace('_', ' ') || "Processing"}
                        </Text>
                    </View>
                    <View className={`px-4 py-2 rounded-full bg-primary-container`}>
                        <Text className={`font-bold text-xs uppercase text-primary-dark`}>
                            {order?.delivery_status === 'delivered' ? "Arrived" : "On the way"}
                        </Text>
                    </View>
                </View>

                {/* Store Info */}
                <View className="flex-row items-center bg-gray-50 p-4 rounded-2xl mb-6 border border-gray-100">
                    <View className="w-12 h-12 bg-gray-200 rounded-full overflow-hidden items-center justify-center">
                        <Ionicons name="storefront" size={24} color="#9CA3AF" />
                    </View>
                    <View className="ml-3 flex-1">
                        <Text className="font-bold text-gray-900 text-lg">
                            {order?.shop_name || "Store"}
                        </Text>
                        <Text className="text-gray-500 text-xs">Order #{orderId}</Text>
                    </View>
                </View>

                {/* Delivery details */}
                <View>
                    <View className="flex-row items-center mb-4">
                        <View className="w-8 items-center">
                            <View className="w-3 h-3 bg-gray-300 rounded-full" />
                            <View className="w-0.5 h-8 bg-gray-200 my-1" />
                            <View className="w-3 h-3 bg-primary rounded-full" />
                        </View>
                        <View className="flex-1 ml-2">
                            <View className="h-10 justify-center">
                                <Text className="text-gray-500 text-xs">From</Text>
                                <Text className="font-bold text-gray-900">{order?.shop_name || "Store"}</Text>
                            </View>
                            <View className="h-10 justify-center mt-2">
                                <Text className="text-gray-500 text-xs">To</Text>
                                <Text className="font-bold text-gray-900" numberOfLines={1}>{order?.shipping_address_json?.address || "Address"}</Text>
                            </View>
                        </View>
                    </View>
                </View>
            </View>
        </View>
    );
}