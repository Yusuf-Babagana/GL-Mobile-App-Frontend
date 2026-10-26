import { Button } from "@/components/ui/Button";
import { ScreenWrapper } from "@/components/ui/ScreenWrapper";
import { useAuth } from "@/context/AuthContext";
import { useCart } from "@/context/CartContext";
import { marketAPI } from "@/lib/marketApi";
import { Ionicons } from "@expo/vector-icons";
import { Image } from "expo-image";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useEffect, useState } from "react";
import { useContentWidth } from "@/lib/layout";
import { ActivityIndicator, Alert, FlatList, ScrollView, Text, TouchableOpacity, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useT as useTranslation } from '@/lib/useT';


export default function ProductDetailScreen() {
  const width = useContentWidth();
  const { t } = useTranslation();
  const { id } = useLocalSearchParams();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { addToCart } = useCart();
  const { isSignedIn } = useAuth();

  const [product, setProduct] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [quantity, setQuantity] = useState(1);
  const [addingToCart, setAddingToCart] = useState(false);

  useEffect(() => {
    marketAPI.getProductById(Number(id))
      .then(setProduct)
      .catch(console.log)
      .finally(() => setIsLoading(false));
  }, [id]);

  const handleAddToCart = async () => {
    // Guest Mode Check
    if (!isSignedIn) {
      Alert.alert(
        t('login_required'),
        t('login_cart_msg'),
        [
          { text: t('later'), style: "cancel" },
          { text: t('login'), onPress: () => router.push("/(auth)/login") }
        ]
      );
      return;
    }

    setAddingToCart(true);
    try {
      await addToCart(product.id, quantity);

      Alert.alert(
        t('added_to_cart'),
        t('add_cart_success', { name: product.name }),
        [
          {
            text: t('keep_browsing'),
            style: "cancel"
          },
          {
            text: t('view_cart'),
            onPress: () => router.push("/cart"),
            style: "default"
          }
        ]
      );
    } catch (error) {
      Alert.alert(t('error'), t('add_cart_failed'));
    } finally {
      setAddingToCart(false);
    }
  };

  if (isLoading) {
    return (
      <View className="flex-1 bg-white justify-center items-center">
        <ActivityIndicator size="large" color="#1DB954" />
      </View>
    );
  }

  if (!product) return <View className="flex-1 bg-white" />;

  return (
    <ScreenWrapper safeAreaTop={false} safeAreaBottom={false}>
      {/* Header (Absolute) */}
      <View className="absolute left-6 z-10" style={{ top: insets.top + 12 }}>
        <TouchableOpacity
          onPress={() => router.back()}
          activeOpacity={0.7}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          accessibilityLabel="Go back"
          accessibilityRole="button"
          className="w-10 h-10 bg-white/90 rounded-full items-center justify-center shadow-sm backdrop-blur-md border border-gray-100"
        >
          <Ionicons name="arrow-back" size={24} color="#1E293B" />
        </TouchableOpacity>
      </View>

      <ScrollView className="flex-1" contentContainerStyle={{ paddingBottom: 120 + insets.bottom }}>
        {/* Large Image */}
        {/* Image Gallery */}
        <View className="w-full h-96 bg-gray-100 relative">
          <FlatList
            data={(product.images && product.images.length > 0 ? product.images : [{ image: product.image }])
              .map((it: any) => (typeof it === "string" ? it : it?.image))
              .filter(Boolean)}
            horizontal
            pagingEnabled
            showsHorizontalScrollIndicator={false}
            keyExtractor={(_, index) => index.toString()}
            windowSize={3}
            removeClippedSubviews
            renderItem={({ item }) => (
              <Image
                source={{ uri: item as string }}
                style={{ width: width, height: 384 }} // 384 is h-96
                contentFit="cover"
              />
            )}
          />
          {/* Curve divider */}
          <View className="absolute -bottom-1 w-full h-6 bg-white rounded-t-3xl ponter-events-none" />
        </View>

        <View className="px-6 pt-2">

          {/* STORE INFO & CHAT BUTTON */}
          <View className="flex-row items-center justify-between mb-3">
            <View className="flex-row items-center">
              <Ionicons name="storefront" size={16} color="#6B7280" />
              <Text className="text-gray-500 font-medium ml-2">{product.store?.name || t('official_store')}</Text>
            </View>

            {/* Location Badge */}
            <View className="flex-row items-center mt-1 mb-2">
              <Ionicons name="location" size={12} color="#9CA3AF" />
              <Text className="text-gray-500 text-xs ml-1">{t('ships_from')} {product.store?.location || t('nigeria')}</Text>
            </View>

            {/* Chat Button (Only shows if seller info exists) */}
            {(product.seller_id || product.store?.owner_id || product.store?.user_id) && (
              <TouchableOpacity
                activeOpacity={0.7}
                onPress={async () => {
                  if (!isSignedIn) {
                    Alert.alert(t('login_required'), t('login_cart_msg'), [
                      { text: t('cancel'), style: "cancel" },
                      { text: t('login'), onPress: () => router.push("/(auth)/login") }
                    ]);
                    return;
                  }

                  const sellerId = product.seller_id || product.store?.owner_id || product.store?.user_id;

                  if (!sellerId) {
                    Alert.alert(t('error'), "Seller information is missing.");
                    return;
                  }

                  router.push({
                    pathname: "/chat/[id]",
                    params: { id: sellerId, name: product.store?.name || "Seller" }
                  });
                }}
                className="bg-blue-50 px-3 py-1.5 rounded-full flex-row items-center"
              >
                <Ionicons name="chatbubble-ellipses" size={16} color="#3B82F6" />
                <Text className="text-blue-600 font-bold text-xs ml-1">{t('chat')}</Text>
              </TouchableOpacity>
            )}
          </View>

          <Text className="text-3xl font-bold text-gray-900 mb-2">{product.name}</Text>
          <Text className="text-[#1DB954] text-2xl font-bold mb-6">₦{Number(product.price).toLocaleString()}</Text>

          {/* Divider */}
          <View className="h-[1px] bg-gray-100 w-full mb-6" />

          {/* Related Video */}
          {product.video_url && (
            <View className="mb-6">
              <Text className="text-slate-900 font-bold text-lg mb-3">{t('product_video')}</Text>
                <TouchableOpacity
                  onPress={() => router.push('/(tabs)/live')}
                  activeOpacity={0.7}
                  className="w-full h-48 rounded-2xl overflow-hidden bg-black items-center justify-center relative"
                >
                <Image
                  source={{ uri: product.image }}
                  className="w-full h-full opacity-60"
                />
                <View className="absolute bg-white/20 p-4 rounded-full backdrop-blur-md">
                  <Ionicons name="play" size={32} color="white" />
                </View>
              </TouchableOpacity>
            </View>
          )}

          <Text className="text-gray-900 font-bold text-lg mb-2">{t('description')}</Text>
          <Text className="text-gray-500 leading-6 text-base">{product.description}</Text>
        </View>
      </ScrollView>

      {/* Sticky Bottom Bar */}
      <View className="absolute bottom-0 w-full bg-white border-t border-gray-100 px-6 pt-4 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.1)]" style={{ paddingBottom: insets.bottom + 16 }}>
        <View className="flex-row items-center gap-4">
          {/* Quantity Stepper */}
          <View className="flex-row items-center bg-gray-100 rounded-xl px-2 py-2">
            <TouchableOpacity
              onPress={() => setQuantity(Math.max(1, quantity - 1))}
              className="w-10 h-10 bg-white rounded-lg items-center justify-center shadow-sm"
            >
              <Ionicons name="remove" size={20} color="black" />
            </TouchableOpacity>
            <Text className="w-8 text-center font-bold text-lg">{quantity}</Text>
            <TouchableOpacity
              onPress={() => setQuantity(quantity + 1)}
              className="w-10 h-10 bg-white rounded-lg items-center justify-center shadow-sm"
            >
              <Ionicons name="add" size={20} color="black" />
            </TouchableOpacity>
          </View>

          {/* Add Button */}
          <View className="flex-1">
            <Button
              title={t('add_to_cart')}
              onPress={handleAddToCart}
              loading={addingToCart}
              icon={<Ionicons name="cart" size={20} color="white" />}
              className="shadow-lg shadow-green-200"
            />
          </View>
        </View>
      </View>
    </ScreenWrapper>
  );
}