import React, { useEffect, useMemo, useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, ScrollView, Alert, ActivityIndicator, StatusBar, KeyboardAvoidingView, Platform, Share } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Image } from 'expo-image';
import { Stack, useRouter } from 'expo-router';
import { ChevronLeft, Megaphone, Package, CheckCircle2, Tag, Sparkles } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import { marketAPI } from '@/lib/marketApi';
import { useAuth } from '@/context/AuthContext';
import { useWallet } from '@/context/WalletContext';

type DurationType = '24h' | '3days' | '1wk';
type Tier = { value: DurationType; label: string; price: number };
type PromotionType = 'product' | 'standalone';
type Category = { id: number; name: string };

const DEFAULT_TIERS: Tier[] = [
  { value: '24h', label: '24 Hours', price: 1000 },
  { value: '3days', label: '3 Days', price: 2000 },
  { value: '1wk', label: '1 Week', price: 4000 },
];

const MAX_CHARS = 300;
const PREVIEW_LINES = 3;

function getImageUrl(item: any): string | null {
  const path = item?.image || item?.images?.[0]?.image;
  if (!path) return null;
  if (path.startsWith('http')) return path;
  return `https://glappbackend.pythonanywhere.com/media/${path}`;
}

export default function CreatePromotedPost() {
  const router = useRouter();
  const { user } = useAuth();
  const { availableBalance: walletAvailableBalance, refreshWallet } = useWallet();
  const availableBalance = Number(walletAvailableBalance) || 0;

  const [tiers, setTiers] = useState<Tier[]>(DEFAULT_TIERS);
  const [promotionType, setPromotionType] = useState<PromotionType>('product');
  const [previewExpanded, setPreviewExpanded] = useState(false);

  // Existing-product flow
  const [products, setProducts] = useState<any[]>([]);
  const [loadingProducts, setLoadingProducts] = useState(true);
  const [selectedProductId, setSelectedProductId] = useState<number | null>(null);

  // Sell-an-item flow
  const [categories, setCategories] = useState<Category[]>([]);
  const [selectedCategoryId, setSelectedCategoryId] = useState<number | null>(null);
  const [itemTitle, setItemTitle] = useState('');
  const [itemDescription, setItemDescription] = useState('');
  const [itemPrice, setItemPrice] = useState('');
  const [itemLocation, setItemLocation] = useState('');
  const [itemPhone, setItemPhone] = useState(user?.phone_number || '');

  const [text, setText] = useState('');
  const [duration, setDuration] = useState<DurationType>('24h');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    refreshWallet();

    const fetchPricing = async () => {
      const data = await marketAPI.getPromotedPostPricing();
      if (Array.isArray(data) && data.length > 0) {
        const mapped: Tier[] = data.map((p: any) => ({
          value: p.duration_type,
          label: p.label,
          price: Number(p.price),
        }));
        setTiers(mapped);
      }
    };
    fetchPricing();

    const fetchProducts = async () => {
      try {
        const data = await marketAPI.getSellerProducts();
        const list = data.results || data;
        setProducts(Array.isArray(list) ? list : []);
      } catch {
        setProducts([]);
      } finally {
        setLoadingProducts(false);
      }
    };
    fetchProducts();

    marketAPI.getCategories().then((data: any) => {
      const list = data?.results || data;
      setCategories(Array.isArray(list) ? list : []);
    }).catch(() => setCategories([]));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const selectedTier = useMemo(
    () => tiers.find((t) => t.value === duration) || tiers[0],
    [tiers, duration]
  );
  const exceedsBalance = selectedTier.price > availableBalance;
  const remainingBalance = availableBalance - selectedTier.price;

  const canSubmit = useMemo(() => {
    if (submitting || exceedsBalance || text.trim().length === 0) return false;
    if (promotionType === 'product') return !!selectedProductId;
    return itemTitle.trim().length > 0;
  }, [submitting, exceedsBalance, text, promotionType, selectedProductId, itemTitle]);

  const resetForm = () => {
    setText('');
    setSelectedProductId(null);
    setDuration('24h');
    setItemTitle('');
    setItemDescription('');
    setItemPrice('');
    setItemLocation('');
    setSelectedCategoryId(null);
  };

  const handleSubmit = async () => {
    if (!canSubmit) return;
    setSubmitting(true);
    try {
      const basePayload = {
        text_content: text.trim(),
        duration_type: duration,
      };

      let created: any;
      if (promotionType === 'product') {
        created = await marketAPI.createPromotedPost({
          ...basePayload,
          promotion_type: 'product',
          product: selectedProductId as number,
        });
      } else {
        created = await marketAPI.createPromotedPost({
          ...basePayload,
          promotion_type: 'standalone',
          title: itemTitle.trim(),
          description: itemDescription.trim(),
          price: itemPrice ? Number(itemPrice) : undefined,
          location: itemLocation.trim(),
          phone_number: itemPhone.trim() || undefined,
          category: selectedCategoryId || undefined,
        });
      }

      const shareUrl: string | undefined = created?.data?.share_url;

      refreshWallet();
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      Alert.alert(
        'Success 🎉',
        shareUrl
          ? 'Your promotion is now live. Share its link so buyers can open it directly.'
          : 'Your promotion is now live.',
        [
          ...(shareUrl
            ? [{
                text: 'Share Link',
                onPress: () => {
                  Share.share({ message: `${itemTitle.trim() || 'Check out my promotion'} — ${shareUrl}`, url: shareUrl }).catch(() => {});
                  resetForm();
                },
              }]
            : []),
          { text: 'Create Another', onPress: resetForm },
          { text: 'Done', style: 'cancel', onPress: () => router.back() },
        ]
      );
    } catch (error: any) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      const data = error.response?.data;
      console.error('[promoted-post] submit failed:', error.response?.status, JSON.stringify(data));

      let msg: string | undefined;
      if (typeof data === 'string') {
        msg = data;
      } else if (data?.error || data?.detail || data?.message) {
        msg = data.error || data.detail || data.message;
      } else if (data && typeof data === 'object') {
        // DRF field validation errors come back as { field: ["msg", ...] }
        msg = Object.entries(data)
          .map(([field, val]) => `${field}: ${Array.isArray(val) ? val.join(' ') : val}`)
          .join('\n');
      }
      Alert.alert('Promotion Failed', msg || 'Could not publish your promotion. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const noProducts = !loadingProducts && products.length === 0;

  return (
    <SafeAreaView className="flex-1 bg-background">
      <Stack.Screen options={{ headerShown: false }} />
      <StatusBar barStyle="dark-content" backgroundColor="#F8FAFC" />

      <View className="flex-row items-center px-5 py-4 bg-white border-b border-slate-100">
        <TouchableOpacity
          activeOpacity={0.7}
          onPress={() => router.back()}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          accessibilityLabel="Go back"
          accessibilityRole="button"
          className="bg-slate-100 p-2 rounded-2xl mr-3"
        >
          <ChevronLeft size={22} color="#1A1A1A" />
        </TouchableOpacity>
        <Text className="flex-1 text-center text-lg font-black text-slate-900 tracking-tight mr-10">Promote</Text>
      </View>

      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView
          contentContainerStyle={{ padding: 24, paddingBottom: 100 }}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          <View className="bg-emerald-50/70 border border-emerald-100/40 p-4 rounded-3xl mb-6">
            <Text className="text-emerald-600 text-[10px] font-black uppercase tracking-widest mb-1">Wallet Balance</Text>
            <Text className="text-emerald-950 text-xl font-black tracking-tight">₦{availableBalance.toLocaleString()}</Text>
            <Text className="text-emerald-700/70 text-xs font-semibold mt-1">
              After payment: ₦{Math.max(remainingBalance, 0).toLocaleString()}
            </Text>
          </View>

          <Text className="text-slate-900 font-bold mb-4 uppercase tracking-wider text-xs ml-1">1. Promotion Type</Text>
          <View className="flex-row bg-white rounded-2xl border border-gray-100 p-1.5 mb-6">
            {(['product', 'standalone'] as PromotionType[]).map((type) => {
              const selected = promotionType === type;
              return (
                <TouchableOpacity
                  key={type}
                  activeOpacity={0.7}
                  onPress={() => setPromotionType(type)}
                  className={`flex-1 py-3 rounded-xl items-center ${selected ? 'bg-emerald-600' : ''}`}
                >
                  <Text className={`font-black text-sm ${selected ? 'text-white' : 'text-slate-500'}`}>
                    {type === 'product' ? 'Existing Product' : 'Sell an Item'}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>

          {promotionType === 'product' ? (
            <>
              <Text className="text-slate-900 font-bold mb-4 uppercase tracking-wider text-xs ml-1">2. Product to Promote</Text>
              {loadingProducts ? (
                <View className="items-center py-6 mb-6">
                  <ActivityIndicator color="#329629" />
                </View>
              ) : noProducts ? (
                <View className="bg-white rounded-3xl border border-gray-100 p-6 items-center mb-6">
                  <View className="bg-gray-100 w-14 h-14 rounded-full items-center justify-center mb-3">
                    <Package size={24} color="#9CA3AF" />
                  </View>
                  <Text className="text-slate-900 font-black text-base text-center mb-1">No products yet</Text>
                  <Text className="text-gray-500 text-sm text-center mb-4">
                    You don't have any listed products. You can still advertise something to sell.
                  </Text>
                  <TouchableOpacity
                    activeOpacity={0.7}
                    onPress={() => setPromotionType('standalone')}
                    className="bg-emerald-600 rounded-2xl px-6 py-3"
                  >
                    <Text className="text-white font-black text-sm">Sell an Item Instead</Text>
                  </TouchableOpacity>
                </View>
              ) : (
                <View className="bg-white rounded-3xl border border-gray-100 overflow-hidden mb-6" style={{ maxHeight: 300 }}>
                  <ScrollView nestedScrollEnabled showsVerticalScrollIndicator={false}>
                    {products.map((product, i) => {
                      const selected = selectedProductId === product.id;
                      const imageUrl = getImageUrl(product);
                      return (
                        <TouchableOpacity
                          key={product.id}
                          activeOpacity={0.7}
                          onPress={() => setSelectedProductId(product.id)}
                          style={{
                            backgroundColor: selected ? 'rgba(74, 222, 128, 0.07)' : '#FFFFFF',
                            padding: 12,
                            flexDirection: 'row',
                            alignItems: 'center',
                            borderBottomWidth: i === products.length - 1 ? 0 : 1,
                            borderBottomColor: '#F1F5F9',
                          }}
                        >
                          {imageUrl ? (
                            <Image source={{ uri: imageUrl }} className="w-12 h-12 rounded-xl mr-3" />
                          ) : (
                            <View className="w-12 h-12 rounded-xl bg-gray-100 items-center justify-center mr-3">
                              <Package size={18} color="#9CA3AF" />
                            </View>
                          )}
                          <View className="flex-1">
                            <Text
                              numberOfLines={1}
                              style={{ fontWeight: '700', color: selected ? '#15803d' : '#1F2937' }}
                            >
                              {product.name}
                            </Text>
                            <Text className="text-gray-500 text-xs font-semibold mt-0.5">
                              ₦{Number(product.price || 0).toLocaleString()}
                            </Text>
                          </View>
                          {selected && <CheckCircle2 color="#10B981" size={20} />}
                        </TouchableOpacity>
                      );
                    })}
                  </ScrollView>
                </View>
              )}
            </>
          ) : (
            <>
              <Text className="text-slate-900 font-bold mb-4 uppercase tracking-wider text-xs ml-1">2. Item Details</Text>
              <View className="bg-white rounded-3xl p-5 border border-gray-100 mb-6">
                <TextInput
                  className="bg-gray-50 border border-gray-200 rounded-2xl px-4 py-3 mb-3 text-slate-900 font-semibold"
                  placeholder="Item title (e.g. Toyota Corolla 2020)"
                  placeholderTextColor="#9CA3AF"
                  value={itemTitle}
                  onChangeText={setItemTitle}
                />

                {categories.length > 0 && (
                  <View className="flex-row flex-wrap mb-3" style={{ gap: 8 }}>
                    {categories.map((cat) => {
                      const selected = selectedCategoryId === cat.id;
                      return (
                        <TouchableOpacity
                          key={cat.id}
                          activeOpacity={0.7}
                          onPress={() => setSelectedCategoryId(selected ? null : cat.id)}
                          className={`flex-row items-center px-3 py-1.5 rounded-full border ${
                            selected ? 'bg-emerald-600 border-emerald-600' : 'bg-white border-gray-200'
                          }`}
                        >
                          <Tag size={12} color={selected ? '#fff' : '#9CA3AF'} />
                          <Text className={`ml-1 text-xs font-bold ${selected ? 'text-white' : 'text-slate-600'}`}>
                            {cat.name}
                          </Text>
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                )}

                <TextInput
                  className="bg-gray-50 border border-gray-200 rounded-2xl px-4 py-3 mb-3 text-slate-900 font-semibold"
                  placeholder="Description (optional)"
                  placeholderTextColor="#9CA3AF"
                  multiline
                  style={{ minHeight: 60, textAlignVertical: 'top' }}
                  value={itemDescription}
                  onChangeText={setItemDescription}
                />

                <TextInput
                  className="bg-gray-50 border border-gray-200 rounded-2xl px-4 py-3 mb-3 text-slate-900 font-semibold"
                  placeholder="Price in ₦ (optional)"
                  placeholderTextColor="#9CA3AF"
                  keyboardType="numeric"
                  value={itemPrice}
                  onChangeText={setItemPrice}
                />

                <TextInput
                  className="bg-gray-50 border border-gray-200 rounded-2xl px-4 py-3 mb-3 text-slate-900 font-semibold"
                  placeholder="Location (e.g. Kano)"
                  placeholderTextColor="#9CA3AF"
                  value={itemLocation}
                  onChangeText={setItemLocation}
                />

                <TextInput
                  className="bg-gray-50 border border-gray-200 rounded-2xl px-4 py-3 text-slate-900 font-semibold"
                  placeholder="Phone number (optional)"
                  placeholderTextColor="#9CA3AF"
                  keyboardType="phone-pad"
                  value={itemPhone}
                  onChangeText={setItemPhone}
                />
              </View>
            </>
          )}

          <Text className="text-slate-900 font-bold mb-2 uppercase tracking-wider text-xs ml-1">3. Your Advertisement</Text>
          <Text className="text-gray-500 text-xs mb-4 ml-1">
            Write a proper advertisement — buyers see this text on your promotion.
          </Text>
          <View className="bg-white rounded-3xl p-5 border border-gray-100 mb-6">
            <View className="flex-row items-start bg-gray-50 border border-gray-200 rounded-2xl px-4 py-3 mb-2">
              <Megaphone size={20} color="#9CA3AF" style={{ marginTop: 2 }} />
              <TextInput
                className="flex-1 ml-3 text-slate-900 font-semibold text-base"
                placeholder="Describe what you're advertising — what it is, why it's a great deal, and what buyers should do next."
                placeholderTextColor="#9CA3AF"
                multiline
                maxLength={MAX_CHARS}
                value={text}
                onChangeText={setText}
                style={{ minHeight: 160, textAlignVertical: 'top' }}
              />
            </View>
            <Text className="text-gray-400 text-xs text-right mr-1">{text.length}/{MAX_CHARS}</Text>
          </View>

          {/* Live preview — what buyers will see on the promotion */}
          {text.trim().length > 0 && (
            <>
              <Text className="text-slate-900 font-bold mb-4 uppercase tracking-wider text-xs ml-1">Preview</Text>
              <View className="bg-white rounded-3xl border border-gray-100 overflow-hidden mb-6">
                <View className="flex-row items-center px-4 pt-4 pb-2">
                  <View className="w-6 h-6 rounded-full bg-emerald-100 items-center justify-center mr-2">
                    <Text className="text-emerald-700 text-[10px] font-black">
                      {(user?.full_name || 'G').trim().charAt(0).toUpperCase()}
                    </Text>
                  </View>
                  <Text className="text-slate-500 text-[11px] font-bold uppercase tracking-wider flex-1" numberOfLines={1}>
                    {user?.full_name || 'You'}
                  </Text>
                  <View className="flex-row items-center bg-emerald-50 px-2 py-0.5 rounded-full">
                    <Sparkles size={9} color="#329629" />
                    <Text className="text-emerald-700 text-[9px] font-black uppercase tracking-widest ml-1">Sponsored</Text>
                  </View>
                </View>
                <View className="px-4 pb-4">
                  <Text
                    className="text-slate-800 text-sm leading-5"
                    numberOfLines={previewExpanded ? undefined : PREVIEW_LINES}
                  >
                    {text.trim()}
                  </Text>
                  {text.trim().length > 120 && (
                    <TouchableOpacity activeOpacity={0.7} onPress={() => setPreviewExpanded((v) => !v)} className="mt-1.5">
                      <Text className="text-emerald-700 font-bold text-xs">
                        {previewExpanded ? 'Show less' : 'Read more'}
                      </Text>
                    </TouchableOpacity>
                  )}
                </View>
              </View>
            </>
          )}

          <Text className="text-slate-900 font-bold mb-4 uppercase tracking-wider text-xs ml-1">4. Choose Duration</Text>
          <View className="mb-6">
            {tiers.map((tier) => {
              const selected = tier.value === duration;
              const disabled = tier.price > availableBalance;
              return (
                <TouchableOpacity
                  key={tier.value}
                  activeOpacity={0.7}
                  disabled={disabled}
                  onPress={() => setDuration(tier.value)}
                  className={`flex-row items-center justify-between p-4 rounded-2xl border mb-3 ${
                    selected ? 'bg-emerald-50 border-emerald-500' : 'bg-white border-gray-100'
                  } ${disabled ? 'opacity-40' : ''}`}
                >
                  <View>
                    <Text className="text-slate-900 font-black text-base">{tier.label}</Text>
                    <Text className="text-gray-500 text-xs font-semibold mt-0.5">₦{tier.price.toLocaleString()}</Text>
                  </View>
                  {selected ? (
                    <CheckCircle2 size={22} color="#10B981" />
                  ) : (
                    <View className="w-5 h-5 rounded-full border-2 border-gray-300" />
                  )}
                </TouchableOpacity>
              );
            })}
          </View>

          {exceedsBalance && (
            <View className="bg-red-50 border border-red-200 rounded-2xl p-4 mb-6">
              <Text className="text-red-700 font-bold text-sm mb-3">
                Insufficient wallet balance for this duration. Top up your wallet to continue.
              </Text>
              <TouchableOpacity
                activeOpacity={0.7}
                onPress={() => router.push('/wallet')}
                className="bg-red-600 rounded-xl py-2.5 items-center"
              >
                <Text className="text-white font-black text-sm">Fund Wallet</Text>
              </TouchableOpacity>
            </View>
          )}

          <TouchableOpacity
            activeOpacity={0.7}
            onPress={handleSubmit}
            disabled={!canSubmit}
            className={`rounded-[25px] h-14 items-center justify-center ${!canSubmit ? 'bg-gray-300' : 'bg-emerald-600'}`}
          >
            {submitting ? (
              <View className="flex-row items-center">
                <ActivityIndicator color="white" />
                <Text className="text-white font-black text-sm ml-2">Publishing...</Text>
              </View>
            ) : (
              <Text className={`font-black text-lg ${!canSubmit ? 'text-gray-500' : 'text-white'}`}>
                Pay ₦{selectedTier.price.toLocaleString()} & Go Live
              </Text>
            )}
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
