import { ScreenWrapper } from "@/components/ui/ScreenWrapper";
import { useAuth } from "@/context/AuthContext";
import { marketAPI } from "@/lib/marketApi";
import type { Promotion } from "@/types";
import { Ionicons } from "@expo/vector-icons";
import * as ExpoClipboard from "expo-clipboard";
import * as Haptics from "expo-haptics";
import { Image } from "expo-image";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useCallback, useEffect, useRef, useState } from "react";
import { useContentWidth } from "@/lib/layout";
import { ActivityIndicator, Alert, ScrollView, Share, Text, TouchableOpacity, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

const SHARE_FALLBACK_BASE = 'https://glappbackend.pythonanywhere.com';
// text_content is capped at 300 chars server-side; clamp long ones so the
// screen never opens as a wall of text, with a toggle to see the rest.
const READ_MORE_THRESHOLD = 220;
const CLAMP_LINES = 6;

type LoadState = 'loading' | 'ready' | 'unavailable' | 'error';

export default function PromotionDetailScreen() {
  const width = useContentWidth();
  const { code } = useLocalSearchParams<{ code: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { isSignedIn } = useAuth();

  const [ad, setAd] = useState<Promotion | null>(null);
  const [state, setState] = useState<LoadState>('loading');
  const [expanded, setExpanded] = useState(false);
  const [copied, setCopied] = useState(false);
  const copyTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const load = useCallback(async () => {
    if (!code) { setState('unavailable'); return; }
    setState('loading');
    try {
      const data = await marketAPI.getPromotionByCode(String(code));
      setAd(data);
      setState('ready');
    } catch (err: any) {
      const s = err?.response?.status;
      // 404 = unknown code, 410 = expired/removed → genuinely unavailable.
      // Anything else (offline, 5xx, timeout) is transient → offer a retry.
      setState(s === 404 || s === 410 ? 'unavailable' : 'error');
    }
  }, [code]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => () => {
    if (copyTimer.current) clearTimeout(copyTimer.current);
  }, []);

  if (state === 'loading') {
    return (
      <View className="flex-1 bg-white justify-center items-center">
        <ActivityIndicator size="large" color="#1DB954" />
      </View>
    );
  }

  if (state === 'unavailable' || (state === 'ready' && !ad)) {
    return (
      <ScreenWrapper>
        <View className="flex-1 items-center justify-center px-10">
          <View className="bg-gray-100 w-20 h-20 rounded-full items-center justify-center mb-5">
            <Ionicons name="pricetag-outline" size={34} color="#9CA3AF" />
          </View>
          <Text className="text-slate-900 font-black text-xl text-center mb-2">Promotion Unavailable</Text>
          <Text className="text-gray-500 text-sm text-center mb-8">
            This promotion has expired, been removed, or the link is incorrect.
          </Text>
          <TouchableOpacity
            activeOpacity={0.7}
            onPress={() => router.replace('/(tabs)')}
            className="bg-emerald-600 rounded-2xl px-8 py-3.5"
          >
            <Text className="text-white font-black text-sm">Back to Home</Text>
          </TouchableOpacity>
        </View>
      </ScreenWrapper>
    );
  }

  if (state === 'error') {
    return (
      <ScreenWrapper>
        <View className="flex-1 items-center justify-center px-10">
          <View className="bg-gray-100 w-20 h-20 rounded-full items-center justify-center mb-5">
            <Ionicons name="cloud-offline-outline" size={34} color="#9CA3AF" />
          </View>
          <Text className="text-slate-900 font-black text-xl text-center mb-2">Couldn&apos;t load this promotion</Text>
          <Text className="text-gray-500 text-sm text-center mb-8">
            Check your connection and try again.
          </Text>
          <TouchableOpacity
            activeOpacity={0.7}
            onPress={load}
            className="bg-emerald-600 rounded-2xl px-8 py-3.5"
          >
            <Text className="text-white font-black text-sm">Try Again</Text>
          </TouchableOpacity>
        </View>
      </ScreenWrapper>
    );
  }

  // state === 'ready' && ad
  const promo = ad as Promotion;
  const images: string[] = promo.images?.length ? promo.images : (promo.image ? [promo.image] : []);
  const shareUrl: string = promo.share_url || `${SHARE_FALLBACK_BASE}/promotion/${promo.code}`;
  const isProductPromo = promo.promotion_type === 'product' && !!promo.product_id;
  const canReadMore = (promo.text_content?.length || 0) > READ_MORE_THRESHOLD;

  const openSellerChat = () => {
    if (!isSignedIn) {
      Alert.alert('Login required', 'Please log in to chat with the seller.', [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Login', onPress: () => router.push('/(auth)/login') },
      ]);
      return;
    }
    if (!promo.seller_id) {
      Alert.alert('Unavailable', 'Seller information is missing for this promotion.');
      return;
    }
    router.push({ pathname: '/chat/[id]', params: { id: String(promo.seller_id), name: promo.seller_name || 'Seller' } });
  };

  const sharePromotion = async () => {
    try {
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      // Android ignores `url`; keep the link in `message` so it always travels.
      await Share.share({
        message: `${promo.title || 'Check out this promotion'} — ${shareUrl}`,
        url: shareUrl,
        title: promo.title || 'GLAPP Promotion',
      });
    } catch {
      // user dismissed the sheet — nothing to do
    }
  };

  const copyLink = async () => {
    try {
      await ExpoClipboard.setStringAsync(shareUrl);
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch {
      // clipboard unavailable — still show the confirmation, the URL is on screen
    }
    setCopied(true);
    if (copyTimer.current) clearTimeout(copyTimer.current);
    copyTimer.current = setTimeout(() => setCopied(false), 1800);
  };

  return (
    <ScreenWrapper safeAreaTop={false} safeAreaBottom={false}>
      <View className="absolute left-6 z-10" style={{ top: insets.top + 12 }}>
        <TouchableOpacity
          onPress={() => (router.canGoBack() ? router.back() : router.replace('/(tabs)'))}
          activeOpacity={0.7}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          accessibilityLabel="Go back"
          accessibilityRole="button"
          className="w-10 h-10 bg-white/90 rounded-full items-center justify-center shadow-sm backdrop-blur-md border border-gray-100"
        >
          <Ionicons name="arrow-back" size={24} color="#1E293B" />
        </TouchableOpacity>
      </View>

      <View className="absolute z-10 bg-emerald-600 px-3 py-1 rounded-full" style={{ top: insets.top + 12, right: 24 }}>
        <Text className="text-white text-[10px] font-black uppercase tracking-widest">Sponsored</Text>
      </View>

      <ScrollView className="flex-1" contentContainerStyle={{ paddingBottom: 150 + insets.bottom }}>
        <View className="w-full h-96 bg-gray-100 relative">
          {images.length > 0 ? (
            <ScrollView
              horizontal
              pagingEnabled
              showsHorizontalScrollIndicator={false}
            >
              {images.map((uri, index) => (
                <Image key={index} source={{ uri }} style={{ width, height: 384 }} contentFit="cover" />
              ))}
            </ScrollView>
          ) : (
            <View className="w-full h-full items-center justify-center">
              <Ionicons name="image-outline" size={48} color="#CBD5E1" />
            </View>
          )}
          <View className="absolute -bottom-1 w-full h-6 bg-white rounded-t-3xl pointer-events-none" />
        </View>

        <View className="px-6 pt-2">
          <View className="flex-row items-center justify-between mb-3">
            <View className="flex-row items-center flex-1">
              <Ionicons name="person-circle-outline" size={16} color="#6B7280" />
              <Text className="text-gray-500 font-medium ml-2" numberOfLines={1}>{promo.seller_name || 'Seller'}</Text>
            </View>
            {!!promo.location && (
              <View className="flex-row items-center">
                <Ionicons name="location" size={12} color="#9CA3AF" />
                <Text className="text-gray-500 text-xs ml-1">{promo.location}</Text>
              </View>
            )}
          </View>

          <Text className="text-3xl font-bold text-gray-900 mb-2">{promo.title}</Text>
          {promo.price != null && (
            <Text className="text-[#1DB954] text-2xl font-bold mb-6">₦{Number(promo.price).toLocaleString()}</Text>
          )}

          <View className="h-[1px] bg-gray-100 w-full mb-6" />

          <Text className="text-gray-900 font-bold text-lg mb-2">Sponsored Message</Text>
          <Text
            className="text-gray-600 leading-6 text-base"
            numberOfLines={canReadMore && !expanded ? CLAMP_LINES : undefined}
          >
            {promo.text_content}
          </Text>
          {canReadMore && (
            <TouchableOpacity activeOpacity={0.7} onPress={() => setExpanded((v) => !v)} className="mt-1.5">
              <Text className="text-emerald-700 font-bold text-sm">{expanded ? 'Show less' : 'Read more'}</Text>
            </TouchableOpacity>
          )}

          {/* Share / Copy link */}
          <View className="flex-row mt-5" style={{ gap: 10 }}>
            <TouchableOpacity
              activeOpacity={0.7}
              onPress={sharePromotion}
              className="flex-1 flex-row items-center justify-center border border-gray-200 rounded-2xl py-3"
            >
              <Ionicons name="share-social-outline" size={16} color="#334155" />
              <Text className="text-slate-700 font-bold text-sm ml-2">Share Promotion</Text>
            </TouchableOpacity>
            <TouchableOpacity
              activeOpacity={0.7}
              onPress={copyLink}
              className="flex-1 flex-row items-center justify-center border border-gray-200 rounded-2xl py-3"
            >
              <Ionicons name={copied ? 'checkmark' : 'copy-outline'} size={16} color={copied ? '#15803d' : '#334155'} />
              <Text className={`font-bold text-sm ml-2 ${copied ? 'text-emerald-700' : 'text-slate-700'}`}>
                {copied ? 'Link Copied' : 'Copy Link'}
              </Text>
            </TouchableOpacity>
          </View>

          {!!promo.description && (
            <View className="mt-6">
              <Text className="text-gray-900 font-bold text-lg mb-2">Description</Text>
              <Text className="text-gray-600 leading-6 text-base">{promo.description}</Text>
            </View>
          )}
        </View>
      </ScrollView>

      <View className="absolute bottom-0 w-full bg-white border-t border-gray-100 px-6 pt-4 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.1)]" style={{ paddingBottom: insets.bottom + 16 }}>
        <View className="flex-row items-center" style={{ gap: 12 }}>
          {isProductPromo && (
            <TouchableOpacity
              onPress={() => router.push({ pathname: '/product/[id]', params: { id: String(promo.product_id) } })}
              activeOpacity={0.7}
              className="flex-1 h-14 rounded-2xl items-center justify-center flex-row bg-slate-900"
            >
              <Ionicons name="bag-handle-outline" size={20} color="white" />
              <Text className="text-white font-black text-base ml-2">View Product</Text>
            </TouchableOpacity>
          )}
          <TouchableOpacity
            onPress={openSellerChat}
            activeOpacity={0.7}
            className={`${isProductPromo ? 'flex-1' : 'w-full'} h-14 rounded-2xl items-center justify-center flex-row`}
            style={{ backgroundColor: '#329629' }}
          >
            <Ionicons name="chatbubble-ellipses-outline" size={20} color="white" />
            <Text className="text-white font-black text-base ml-2">Chat with Seller</Text>
          </TouchableOpacity>
        </View>
      </View>
    </ScreenWrapper>
  );
}
