import { Colors } from "@/constants/Colors";
import { marketAPI } from "@/lib/marketApi";
import DisputeModal from "@/components/orders/DisputeModal";
import { Ionicons } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useEffect, useState } from "react";
import { ActivityIndicator, Alert, Linking, ScrollView, StatusBar, Text, TouchableOpacity, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

export default function OrderDetailScreen() {
    const { id, role } = useLocalSearchParams();
    const isSellerRole = role === 'seller';
    const router = useRouter();
    const insets = useSafeAreaInsets();
    const [order, setOrder] = useState<any>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [isUpdating, setIsUpdating] = useState(false);
    const [showDispute, setShowDispute] = useState(false);

    const fetchOrder = async () => {
        if (!id || isNaN(Number(id))) return;

        try {
            setIsLoading(true);
            if (isSellerRole) {
                const data = await marketAPI.getOrderDetail(String(id));
                setOrder(data);
            } else {
                const data = await marketAPI.getOrderById(Number(id));
                setOrder(data);
            }
        } catch {
            try {
                const data = await marketAPI.getOrderDetail(String(id));
                setOrder(data);
            } catch {

            }
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        if (id && id !== 'NaN') {
            fetchOrder();
        }
    }, [id]);

    // --- ACTIONS ---

    const handleWithdrawDispute = () => {
        Alert.alert("Withdraw dispute", "Withdraw your dispute? You will then be able to confirm receipt.", [
            { text: "No", style: "cancel" },
            {
                text: "Yes, withdraw",
                onPress: async () => {
                    setIsUpdating(true);
                    try {
                        await marketAPI.withdrawDispute(order.id);
                        fetchOrder();
                    } catch (err: any) {
                        Alert.alert("Error", err?.message || "Could not withdraw the dispute.");
                    } finally {
                        setIsUpdating(false);
                    }
                },
            },
        ]);
    };

    const handleDispatch = async () => {
        setIsUpdating(true);
        try {
            await marketAPI.markOrderDispatched(order.id);
            Alert.alert("Success", "Order marked as dispatched!");
            fetchOrder();
        } catch (err: any) {
            Alert.alert("Error", "Could not update status");
        } finally {
            setIsUpdating(false);
        }
    };

    const handleCancel = async () => {
        Alert.alert(
            "Cancel Order",
            "Cancel this order and get a full refund to your wallet? This can't be undone.",
            [
                { text: "No", style: "cancel" },
                {
                    text: "Yes, Cancel Order",
                    style: "destructive",
                    onPress: async () => {
                        setIsUpdating(true);
                        try {
                            await marketAPI.cancelOrder(Number(id));
                            setOrder((prev: any) => prev ? { ...prev, delivery_status: 'cancelled' } : prev);
                            Alert.alert("Order Cancelled", "Your refund has been credited to your wallet.");
                            fetchOrder();
                        } catch (err: any) {
                            Alert.alert("Error", err.message || err.error || "Could not cancel this order.");
                        } finally {
                            setIsUpdating(false);
                        }
                    }
                }
            ]
        );
    };

    const handleConfirm = async () => {
        Alert.alert(
            "Confirm Delivery",
            "Are you sure you have received this item? This will mark the order as completed.",
            [
                { text: "Cancel", style: "cancel" },
                {
                    text: "Yes, Received",
                    onPress: async () => {
                        setIsUpdating(true);
                        try {
                            await marketAPI.confirmOrderReceipt(Number(id));
                            setOrder((prev: any) => prev ? { ...prev, delivery_status: 'delivered' } : prev);
                            Alert.alert("Success", "Order completed!");
                            fetchOrder();
                        } catch (err: any) {
                            Alert.alert("Error", err.error || "Action failed");
                        } finally {
                            setIsUpdating(false);
                        }
                    }
                }
            ]
        );
    };

    if (isLoading || !order) {
        return (
            <View className="flex-1 justify-center items-center bg-white">
                <ActivityIndicator size="large" color={Colors.primary} />
                <Text className="mt-4 text-gray-500">Loading Order Details...</Text>
            </View>
        );
    }

    const isSeller = isSellerRole;
    const isBuyer = !isSellerRole;

    return (
        <View className="flex-1 bg-gray-50">
            <StatusBar barStyle="light-content" />

            {/* Header */}
            <View className="bg-slate-900 pb-6 px-6 rounded-b-[32px] z-10" style={{ paddingTop: insets.top + 12 }}>
                <View className="flex-row items-center mb-4">
                    <TouchableOpacity
                        activeOpacity={0.7}
                        onPress={() => router.back()}
                        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                        accessibilityLabel="Go back"
                        accessibilityRole="button"
                        className="mr-4 bg-slate-800 p-2 rounded-full"
                    >
                        <Ionicons name="arrow-back" size={24} color="white" />
                    </TouchableOpacity>
                    <Text className="text-white text-2xl font-bold">Order #{order.id}</Text>
                </View>
                <View className="flex-row gap-2">
                    <View className={`px-3 py-1 rounded-full ${
                        order.delivery_status === 'cancelled' ? 'bg-red-500'
                        : order.delivery_status === 'shipped' ? 'bg-blue-500'
                        : order.delivery_status === 'delivered' ? 'bg-primary'
                        : 'bg-orange-500'
                    }`}>
                        <Text className="text-white font-bold text-xs uppercase">{order.delivery_status}</Text>
                    </View>
                    <View className={`px-3 py-1 rounded-full ${order.payment_status === 'refunded' ? 'bg-red-500' : 'bg-primary'}`}>
                        <Text className="text-white font-bold text-xs uppercase">{order.payment_status}</Text>
                    </View>
                </View>
            </View>

            <ScrollView className="flex-1 px-6 pt-6">


                {/* Shipping Info */}
                <View className="bg-white p-5 rounded-3xl mb-4 border border-gray-100">
                    <View className="flex-row items-center mb-3">
                        <Ionicons name="location" size={20} color={Colors.primary} />
                        <Text className="font-bold text-slate-900 ml-2 text-lg">Delivery Address</Text>
                    </View>
                    <Text className="text-slate-900 text-base font-medium mb-1">{order.shipping_address_json?.address}</Text>
                    <Text className="text-gray-500 mb-3">{order.shipping_address_json?.city}</Text>
                    <TouchableOpacity
                        activeOpacity={0.7}
                        onPress={() => Linking.openURL(`tel:${order.shipping_address_json?.phone}`)}
                        className="flex-row items-center bg-gray-50 p-3 rounded-xl"
                    >
                        <Ionicons name="call" size={18} color="#2563EB" />
                        <Text className="text-blue-700 font-bold ml-2">{order.shipping_address_json?.phone}</Text>
                    </TouchableOpacity>
                </View>

                {/* Customer Info — visible only to seller */}
                {isSeller && (
                    <View className="bg-white p-5 rounded-3xl mb-4 border border-gray-100">
                        <View className="flex-row items-center mb-3">
                            <Ionicons name="person" size={20} color={Colors.primary} />
                            <Text className="font-bold text-slate-900 ml-2 text-lg">Customer Info</Text>
                        </View>
                        <Text className="text-slate-900 text-base font-medium mb-1">{order.buyer_name || order.shipping_address_json?.full_name || 'N/A'}</Text>
                        <Text className="text-gray-500 mb-1">{order.buyer_email}</Text>
                        <Text className="text-gray-500">{order.buyer_phone}</Text>
                    </View>
                )}

                {/* Shop Info — visible only to buyer */}
                {isBuyer && (
                    <View className="bg-white p-5 rounded-3xl mb-4 border border-gray-100">
                        <View className="flex-row items-center mb-3">
                            <View className="w-8 h-8 rounded-full bg-primary-container items-center justify-center mr-2">
                                <Text className="text-sm">{'🏪'}</Text>
                            </View>
                            <View>
                                <Text className="font-bold text-slate-900 text-lg">{order.shop_name || 'Store'}</Text>
                                <Text className="text-gray-500 text-xs">Sold by</Text>
                            </View>
                        </View>
                        {order.seller_phone && (
                            <TouchableOpacity
                                activeOpacity={0.7}
                                onPress={() => Linking.openURL(`tel:${order.seller_phone}`)}
                                className="flex-row items-center bg-gray-50 p-3 rounded-xl"
                            >
                                <Ionicons name="call" size={18} color="#2563EB" />
                                <Text className="text-blue-700 font-bold ml-2">Contact Seller — {order.seller_phone}</Text>
                            </TouchableOpacity>
                        )}
                    </View>
                )}

                {/* Items */}
                <Text className="font-bold text-slate-900 text-lg mb-3 ml-1">Products</Text>
                {order.items?.map((item: any) => (
                    <View key={item.id} className="flex-row items-center mb-3 bg-white p-4 rounded-2xl border border-gray-100">
                        <View className="w-12 h-12 bg-gray-100 rounded-xl items-center justify-center">
                            <Text className="font-bold text-primary">x{item.quantity}</Text>
                        </View>
                        <View className="ml-4 flex-1">
                            <Text className="font-bold text-slate-900" numberOfLines={1}>{item.product_name}</Text>
                            <Text className="text-gray-500 text-xs">₦{Number(item.price_at_purchase).toLocaleString()}</Text>
                        </View>
                        <Text className="font-bold text-slate-900">₦{(item.quantity * item.price_at_purchase).toLocaleString()}</Text>
                    </View>
                ))}

                {/* Pricing Breakdown */}
                {order.items?.length > 0 && (() => {
                    const subtotal = order.items.reduce(
                        (sum: number, item: any) => sum + (item.quantity * Number(item.price_at_purchase)),
                        0
                    );
                    const totalPaid = Number(order.total_price) || subtotal;
                    const processingFee = Math.max(0, totalPaid - subtotal);
                    const netYield = isSeller ? totalPaid - processingFee : null;

                    return (
                        <View className="bg-white p-5 rounded-3xl mb-4 border border-gray-100">
                            <Text className="font-bold text-slate-900 text-lg mb-4">Payment Summary</Text>

                            <View className="flex-row justify-between items-center mb-3">
                                <View className="flex-1">
                                    <Text className="text-slate-900 font-bold text-sm">Item Subtotal</Text>
                                    <Text className="text-gray-500 text-[10px] font-medium">Gross order value</Text>
                                </View>
                                <Text className="text-slate-900 font-bold">₦{subtotal.toLocaleString()}</Text>
                            </View>

                            <View className="h-px bg-gray-100 my-2" />

                            <View className="flex-row justify-between items-center mb-3">
                                <View className="flex-1">
                                    <Text className="text-slate-900 font-bold text-sm">Platform Processing Fee</Text>
                                    <Text className="text-gray-500 text-[10px] font-medium">Includes platform processing fee capped at ₦2,500</Text>
                                </View>
                                <Text className="text-gray-500 font-bold">─ ₦{processingFee.toLocaleString()}</Text>
                            </View>

                            {processingFee === 0 && (
                                <View className="bg-emerald-50 rounded-xl px-3 py-2 mb-3">
                                    <Text className="text-emerald-600 text-[10px] font-bold">No processing fee applied to this order.</Text>
                                </View>
                            )}

                            <View className="h-px bg-gray-100 my-2" />

                            <View className="flex-row justify-between items-center">
                                <View className="flex-1">
                                    <Text className="text-slate-900 font-bold text-base">
                                        {isSeller ? 'Total Estimated Net Yield' : 'Total Charged'}
                                    </Text>
                                    {isSeller && (
                                        <Text className="text-gray-500 text-[10px] font-medium">Vendor payout after fees</Text>
                                    )}
                                </View>
                                <Text className="text-slate-900 font-black text-lg">
                                    ₦{(isSeller ? netYield : totalPaid).toLocaleString()}
                                </Text>
                            </View>
                        </View>
                    );
                })()}

                <View style={{ height: 128 + insets.bottom }} />
            </ScrollView>

            {/* SELLER: Dispatch Button */}
            {isSeller && order.delivery_status === 'pending' && (
                <View className="absolute bottom-0 w-full px-6 pt-6 bg-white border-t border-gray-100" style={{ paddingBottom: insets.bottom + 24 }}>
                    <TouchableOpacity
                        activeOpacity={0.7}
                        onPress={handleDispatch}
                        disabled={isUpdating}
                        className="bg-blue-600 py-4 rounded-2xl items-center"
                    >
                        {isUpdating ? <ActivityIndicator color="white" /> : (
                            <Text className="text-white font-bold text-lg">Mark as Dispatched</Text>
                        )}
                    </TouchableOpacity>
                </View>
            )}

            {/* BUYER: Cancel Order — only while the seller hasn't dispatched yet */}
            {isBuyer && order.delivery_status === 'pending' && (
                <View className="absolute bottom-0 w-full px-6 pt-6 bg-white border-t border-gray-100" style={{ paddingBottom: insets.bottom + 24 }}>
                    <TouchableOpacity
                        activeOpacity={0.7}
                        onPress={handleCancel}
                        disabled={isUpdating}
                        className="bg-red-600 py-4 rounded-2xl items-center"
                    >
                        {isUpdating ? <ActivityIndicator color="white" /> : (
                            <Text className="text-white font-bold text-lg">Cancel Order & Refund</Text>
                        )}
                    </TouchableOpacity>
                </View>
            )}

            {/* BUYER: Track + Confirm Receipt — only when shipped */}
            {isBuyer && order.delivery_status === 'shipped' && order.payment_status === 'paid' && (
                <View className="absolute bottom-0 w-full px-6 pt-6 bg-white border-t border-gray-100" style={{ paddingBottom: insets.bottom + 24 }}>
                    <TouchableOpacity
                        activeOpacity={0.7}
                        onPress={() => router.push(`/orders/track?orderId=${order.id}` as any)}
                        className="bg-slate-900 py-4 rounded-2xl items-center flex-row justify-center mb-3"
                    >
                        <Ionicons name="location" size={18} color="white" />
                        <Text className="text-white font-black text-sm ml-2">Track Order</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                        activeOpacity={0.7}
                        onPress={handleConfirm}
                        disabled={isUpdating}
                        className="bg-emerald-600 py-5 rounded-2xl items-center flex-row justify-center"
                    >
                        {isUpdating ? (
                            <ActivityIndicator color="white" />
                        ) : (
                            <>
                                <Ionicons name="checkmark-circle" size={22} color="white" />
                                <Text className="text-white font-black text-lg ml-2">Confirm Material Received</Text>
                            </>
                        )}
                    </TouchableOpacity>
                    <TouchableOpacity activeOpacity={0.7} onPress={() => setShowDispute(true)} className="items-center pt-4">
                        <Text className="text-red-600 font-bold text-sm">Didn't get it / something's wrong? Report a problem</Text>
                    </TouchableOpacity>
                </View>
            )}

            {/* BUYER: dispute — paid + dispatched but not confirmed (the 'shipped' bar has its own link) */}
            {isBuyer && order.payment_status === 'paid' && ['ready_for_pickup', 'picked_up', 'in_transit', 'delivered'].includes(order.delivery_status) && (
                <View className="absolute bottom-0 w-full px-6 pt-6 bg-white border-t border-gray-100" style={{ paddingBottom: insets.bottom + 24 }}>
                    <TouchableOpacity activeOpacity={0.7} onPress={() => setShowDispute(true)} className="py-4 rounded-2xl items-center border-2 border-red-200">
                        <Text className="text-red-600 font-bold text-base">Report a problem</Text>
                    </TouchableOpacity>
                </View>
            )}

            {isBuyer && order.payment_status === 'disputed' && (
                <View className="absolute bottom-0 w-full px-6 pt-6 bg-amber-50 border-t border-amber-200" style={{ paddingBottom: insets.bottom + 24 }}>
                    <Text className="text-amber-800 font-black text-base mb-1">Dispute open</Text>
                    <Text className="text-amber-700 text-sm mb-3">Your payment is frozen while our team reviews this. The seller will not be paid until it is resolved.</Text>
                    <TouchableOpacity activeOpacity={0.7} onPress={handleWithdrawDispute} disabled={isUpdating} className="py-3 rounded-2xl items-center bg-white border border-amber-300">
                        <Text className="text-amber-800 font-bold">Withdraw dispute</Text>
                    </TouchableOpacity>
                </View>
            )}

            {isBuyer && order?.id && (
                <DisputeModal
                    visible={showDispute}
                    orderId={order.id}
                    onClose={() => setShowDispute(false)}
                    onOpened={() => { setShowDispute(false); Alert.alert("Dispute opened", "We'll review it and get back to you. Your payment is frozen until then."); fetchOrder(); }}
                />
            )}
        </View>
    );
}
