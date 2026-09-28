import React, { useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, ActivityIndicator, Alert, TextInput, StatusBar, KeyboardAvoidingView, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Stack, useRouter } from 'expo-router';
import { useCart } from '@/context/CartContext';
import { useWallet } from '@/context/WalletContext';
import { marketAPI } from '@/lib/marketApi';
import { Ionicons } from '@expo/vector-icons';
import { useT as useTranslation } from '@/lib/useT';

export default function CheckoutScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const { cartItems, cartTotal, refreshCart } = useCart();
  const { availableBalance, refreshWallet } = useWallet();
  const [submitting, setSubmitting] = useState(false);
  const [address, setAddress] = useState('');
  const [city, setCity] = useState('');
  const [phone, setPhone] = useState('');
  const [pin, setPin] = useState('');

  const walletBalance = parseFloat(availableBalance) || 0;
  const orderTotal = Number(cartTotal) || 0;
  const sufficient = walletBalance >= orderTotal;
  const shortfall = orderTotal - walletBalance;

  const handlePayWithWallet = async () => {
    if (!address.trim() || !city.trim() || !phone.trim()) {
      Alert.alert(t('missing_info'), t('missing_info_msg'));
      return;
    }
    if (!pin || pin.length !== 4) {
      Alert.alert(t('invalid_pin'), t('invalid_pin_msg'));
      return;
    }

    try {
      setSubmitting(true);

      const items = cartItems.map((item) => ({
        product_id: item.product,
        quantity: item.quantity,
      }));

      await marketAPI.checkout({
        items,
        shipping_address: { address: address.trim(), city: city.trim(), phone: phone.trim() },
        payment_method: 'wallet',
        pin,
      });

      await refreshCart();
      await refreshWallet();

      Alert.alert(t('payment_successful'), t('order_placed'), [
        { text: t('view_orders'), onPress: () => router.replace('/orders') },
      ]);
    } catch (error: any) {
      const data = error?.response?.data ?? error;
      const isStockIssue =
        data?.status === 'out_of_stock' ||
        /insufficient stock volume/i.test(
          data?.message || data?.error || data?.detail || '',
        ) ||
        ((error?.response?.status ?? 0) === 400 &&
          /stock|quantity|inventory/i.test(
            JSON.stringify(data || {}),
          ));

      if (isStockIssue) {
        Alert.alert(
          t('stock_discrepancy'),
          data?.message ||
            data?.error ||
            'Requested quantity exceeds available stock limit.',
        );
      } else {
        const msg =
          data?.message ||
          data?.error ||
          data?.detail ||
          error?.error ||
          error?.message ||
          t('transaction_failed');
        Alert.alert(t('payment_failed'), msg);
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-background">
      <StatusBar barStyle="dark-content" backgroundColor="#F8FAFC" />
      <Stack.Screen options={{ headerShown: false }} />

      {submitting && (
        <View className="absolute inset-0 z-50 bg-white/80 items-center justify-center">
          <ActivityIndicator size="large" color="#16A34A" />
          <Text className="text-gray-500 font-bold text-xs mt-3">{t('processing_payment')}</Text>
        </View>
      )}

      <View className="px-6 py-4 bg-white border-b border-slate-100 flex-row items-center">
        <TouchableOpacity
          activeOpacity={0.7}
          onPress={() => router.back()}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          accessibilityLabel="Go back"
          accessibilityRole="button"
          className="mr-4"
        >
          <Ionicons name="arrow-back" size={24} color="#1E293B" />
        </TouchableOpacity>
        <Text className="text-xl font-black text-slate-900">{t('checkout')}</Text>
      </View>

      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView contentContainerStyle={{ padding: 24, paddingBottom: 40 }} showsVerticalScrollIndicator={false}>
        <Text className="text-slate-900 text-lg font-black mb-4">{t('order_summary')}</Text>

        <View className="bg-white rounded-3xl p-5 border border-gray-100 mb-6">
          {cartItems.map((item) => (
            <View key={item.id} className="flex-row justify-between items-center mb-3">
              <View className="flex-1 mr-4">
                <Text className="text-slate-900 font-bold text-sm" numberOfLines={1}>
                  {item.product_name}
                </Text>
                <Text className="text-gray-500 text-xs font-semibold mt-0.5">
                  {t('qty')}: {item.quantity} × ₦{Number(item.product_price).toLocaleString()}
                </Text>
              </View>
              <Text className="text-slate-900 font-black">
                ₦{(Number(item.product_price) * item.quantity).toLocaleString()}
              </Text>
            </View>
          ))}

          <View className="h-px bg-gray-100 my-3" />

          <View className="flex-row justify-between items-center">
            <Text className="text-slate-900 font-black text-lg">{t('order_total')}</Text>
            <Text className="text-primary font-black text-2xl">₦{orderTotal.toLocaleString()}</Text>
          </View>
        </View>

        <Text className="text-slate-900 text-lg font-black mb-3">{t('delivery_details')}</Text>

        <View className="mb-5">
          <Text className="text-gray-500 text-xs font-bold mb-1 ml-1 uppercase">{t('address')}</Text>
          <TextInput
            className="bg-white border border-gray-200 p-4 rounded-2xl text-slate-900 font-semibold"
            placeholder={t('address_placeholder')}
            placeholderTextColor="#94A3B8"
            value={address}
            onChangeText={setAddress}
            editable={!submitting}
          />
        </View>

        <View className="mb-5">
          <Text className="text-gray-500 text-xs font-bold mb-1 ml-1 uppercase">{t('city')}</Text>
          <TextInput
            className="bg-white border border-gray-200 p-4 rounded-2xl text-slate-900 font-semibold"
            placeholder={t('city_placeholder')}
            placeholderTextColor="#94A3B8"
            value={city}
            onChangeText={setCity}
            editable={!submitting}
          />
        </View>

        <View className="mb-8">
          <Text className="text-gray-500 text-xs font-bold mb-1 ml-1 uppercase">{t('phone_number')}</Text>
          <TextInput
            className="bg-white border border-gray-200 p-4 rounded-2xl text-slate-900 font-semibold"
            placeholder={t('phone_placeholder')}
            placeholderTextColor="#94A3B8"
            keyboardType="phone-pad"
            value={phone}
            onChangeText={setPhone}
            editable={!submitting}
          />
        </View>

        <Text className="text-slate-900 text-lg font-black mb-3">{t('payment_method')}</Text>

        <View className="bg-white rounded-3xl p-5 border border-gray-100 mb-6">
          <View className="flex-row items-center mb-4">
            <View className="w-12 h-12 rounded-2xl bg-primary-container items-center justify-center mr-3">
              <Ionicons name="wallet" size={24} color="#329629" />
            </View>
            <View className="flex-1">
              <Text className="text-slate-900 font-bold text-base">{t('glapp_wallet')}</Text>
              <Text className="text-gray-500 text-xs font-semibold">
                {t('balance')}: ₦{walletBalance.toLocaleString()}
              </Text>
            </View>
            <View className="bg-primary-container px-3 py-1 rounded-lg">
              <Text className="text-primary-dark font-black text-xs uppercase">{t('default')}</Text>
            </View>
          </View>

          <View className="h-px bg-gray-100 my-1" />

          <View className="flex-row justify-between items-center py-3">
            <Text className="text-gray-500 text-sm font-semibold">{t('wallet_balance')}</Text>
            <Text className="text-slate-900 font-black text-base">₦{walletBalance.toLocaleString()}</Text>
          </View>
          <View className="flex-row justify-between items-center pb-3">
            <Text className="text-gray-500 text-sm font-semibold">{t('order_total')}</Text>
            <Text className="text-slate-900 font-black text-base">₦{orderTotal.toLocaleString()}</Text>
          </View>

          {!sufficient && (
            <View className="bg-red-50 border border-red-100 rounded-2xl p-4 mt-2">
              <Text className="text-red-700 font-bold text-xs">
                {t('insufficient_balance')}
              </Text>
              <Text className="text-red-500 text-xs font-medium mt-1">
                {t('shortfall')}: ₦{shortfall.toLocaleString()}
              </Text>
              <TouchableOpacity
                activeOpacity={0.7}
                onPress={() => router.push('/wallet')}
                className="bg-red-600 mt-3 py-3 rounded-xl items-center"
              >
                <Text className="text-white font-bold text-xs">{t('fund_wallet')}</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>

        <Text className="text-slate-900 text-lg font-black mb-3">{t('transaction_pin')}</Text>

        <View className="bg-white rounded-3xl p-5 border border-gray-100 mb-6">
          <Text className="text-gray-500 text-xs font-bold mb-2 ml-1 uppercase">
            {t('enter_pin')}
          </Text>
          <TextInput
            className="bg-gray-50 border border-gray-200 p-4 rounded-2xl text-slate-900 font-black text-lg tracking-[8px] text-center"
            placeholder="• • • •"
            placeholderTextColor="#CBD5E1"
            secureTextEntry={true}
            keyboardType="numeric"
            maxLength={4}
            value={pin}
            onChangeText={setPin}
            editable={!submitting}
          />
        </View>

        <TouchableOpacity
          activeOpacity={0.7}
          onPress={handlePayWithWallet}
          disabled={!sufficient || submitting || pin.length !== 4}
          className={`w-full py-5 rounded-2xl items-center mb-6 ${!sufficient ? 'bg-gray-300' : 'bg-primary'}`}
        >
          <View className="flex-row items-center">
            <Ionicons name="lock-closed" size={18} color={!sufficient ? '#94A3B8' : '#FFFFFF'} />
            <Text
              className={`font-black text-sm ml-2 ${!sufficient ? 'text-gray-400' : 'text-white'}`}
            >
              {submitting
                ? t('processing')
                : `${t('pay')} ₦${orderTotal.toLocaleString()}`}
            </Text>
          </View>
        </TouchableOpacity>

        {!sufficient && (
          <Text className="text-gray-500 text-xs font-medium text-center mb-6">
            {t('insufficient_balance')}
          </Text>
        )}
      </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}