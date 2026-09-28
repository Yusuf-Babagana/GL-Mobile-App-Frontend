import React, { useState } from 'react';
import { Alert, Linking, View, Text, TouchableOpacity, ScrollView, Dimensions, ActivityIndicator } from 'react-native';
import { Store, Heart, ShoppingBag, MapPin, Grid3X3, Headset, ShoppingCart, User as UserIcon, Wallet, LogOut, Shield, ChevronRight, Lock, Trash2, FileText, Languages, Briefcase } from 'lucide-react-native';
import { useRouter } from 'expo-router';
import { useAuth } from '@/context/AuthContext';
import { ScreenWrapper } from '@/components/ui/ScreenWrapper';
import { marketAPI } from '@/lib/marketApi';
import { apiRequest } from '@/src/services/apiClient';
import LanguageSwitcher from '@/components/LanguageSwitcher';
import KYCBanner from '@/components/KYCBanner';
import { toUserFriendlyError } from '@/lib/errorMapper';
import { useT as useTranslation } from '@/lib/useT';

export default function MoreScreen() {
    const { t } = useTranslation();
    const router = useRouter();
    const { userRole, logout, isSignedIn, user } = useAuth();
    const [loading, setLoading] = useState(false);
    const [deleting, setDeleting] = useState(false);
    const isAdmin = userRole === 'admin' || user?.is_admin === true;

    const handleMyShopPress = async () => {
        if (!isSignedIn) { router.push('/(auth)/login'); return; }
        if (loading) return;
        try {
            setLoading(true);
            const res = await marketAPI.get('/market/shop/my-status/');
            const status = res.data?.status;
            if (status === 'approved' || status === 'pending') router.push('/merchant');
            else router.push('/merchant/personal-info');
        } catch {
            Alert.alert('Unable to load shop', 'Please check your connection and try again.');
        } finally { setLoading(false); }
    };

    const mainActions = [
        { name: t('orders'), icon: ShoppingBag, onPress: () => router.push('/orders'), color: '#3B82F6', bg: 'bg-blue-50' },
        { name: t('wallet'), icon: Wallet, onPress: () => router.push('/wallet'), color: '#F59E0B', bg: 'bg-amber-50' },
        { name: t('cart'), icon: ShoppingCart, onPress: () => router.push('/(tabs)/cart'), color: '#8B5CF6', bg: 'bg-purple-50' },
    ];

    const menuItems = [
        { name: t('wishlist'), icon: Heart, onPress: () => router.push('/(profile)/wishlist'), id: 'wishlist' },
        { name: t('addresses'), icon: MapPin, onPress: () => router.push('/profile/edit'), id: 'address' },
        { name: t('market'), icon: Grid3X3, onPress: () => router.push('/(tabs)/markets'), id: 'market' },
        { name: t('jobs'), icon: Briefcase, onPress: () => router.push('/jobs/dashboard' as any), id: 'jobs' },
        { name: t('support'), icon: Headset, onPress: () => router.push('/help'), id: 'support' },
        { name: t('profile'), icon: UserIcon, onPress: () => router.push('/profile/edit'), id: 'profile' },
        { name: t('privacy_security'), icon: Lock, onPress: () => router.push('/(profile)/privacy-security'), id: 'privacy' },
        { name: t('privacy_policy'), icon: FileText, onPress: () => Linking.openURL('https://yusuf-babagana.github.io/glapp-privacy-policy/'), id: 'privacy-policy' },
    ];

    if (isAdmin) {
        menuItems.push({ name: t('admin_panel'), icon: Shield, onPress: () => router.push('/admin/dashboard'), id: 'admin' });
    }

    return (
        <ScreenWrapper>
            <View className="px-6 pt-4 pb-4">
                <Text className="text-2xl font-black text-gray-900">{t('more')}</Text>
            </View>

            <ScrollView contentContainerStyle={{ paddingBottom: 130 }} showsVerticalScrollIndicator={false}>
                {/* My Shop / Seller Dashboard — promoted to its own prominent entry point */}
                <View className="px-6 mb-6">
                    <TouchableOpacity
                        activeOpacity={0.85}
                        onPress={handleMyShopPress}
                        disabled={loading}
                        className="bg-primary rounded-3xl px-5 py-5 flex-row items-center"
                        style={{ shadowColor: '#329629', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.25, shadowRadius: 10, elevation: 4 }}
                    >
                        <View className="bg-white/20 w-14 h-14 rounded-2xl items-center justify-center mr-4">
                            <Store size={26} color="#FFFFFF" />
                        </View>
                        <View className="flex-1">
                            <Text className="text-white font-black text-lg">{t('my_shop')}</Text>
                            <Text className="text-white/80 text-xs font-semibold mt-0.5">{t('my_shop_subtitle')}</Text>
                        </View>
                        {loading ? (
                            <ActivityIndicator size="small" color="#FFFFFF" />
                        ) : (
                            <ChevronRight size={22} color="#FFFFFF" />
                        )}
                    </TouchableOpacity>
                </View>

                {/* Quick Actions Grid */}
                <View className="px-6 mb-6">
                    <View className="flex-row gap-3">
                        {mainActions.map((item) => {
                            const Icon = item.icon;
                            return (
                                <TouchableOpacity
                                    key={item.name}
                                    onPress={item.onPress}
                                    className={`${item.bg} rounded-2xl p-4 items-center justify-center flex-1`}
                                    style={{ shadowColor: item.color, shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.12, shadowRadius: 6, elevation: 3 }}
                                >
                                    <View className="bg-white/80 w-12 h-12 rounded-xl items-center justify-center mb-2">
                                        <Icon size={24} color={item.color} />
                                    </View>
                                    <Text className="text-gray-900 text-xs font-bold text-center">{item.name}</Text>
                                </TouchableOpacity>
                            );
                        })}
                    </View>
                </View>

                <KYCBanner />

                {/* Menu List */}
                <View className="mx-6 bg-white rounded-2xl overflow-hidden" style={{ shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 8, elevation: 2 }}>
                    {menuItems.map((item, index) => {
                        const Icon = item.icon;
                        return (
                            <TouchableOpacity
                                key={item.id}
                                onPress={item.onPress}
                                className={`flex-row items-center px-5 py-4 ${index < menuItems.length - 1 ? 'border-b border-gray-50' : ''}`}
                            >
                                <View className="bg-gray-50 w-10 h-10 rounded-xl items-center justify-center mr-4">
                                    <Icon size={20} color="#329629" />
                                </View>
                                <Text className="text-gray-900 font-bold text-base flex-1">{item.name}</Text>
                                <ChevronRight size={18} color="#CBD5E1" />
                            </TouchableOpacity>
                        );
                    })}
                </View>

                {/* Language Switcher */}
                <View className="mx-6 mt-6 bg-white rounded-2xl px-5 py-4" style={{ shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 8, elevation: 2 }}>
                    <View className="flex-row items-center mb-2">
                        <View className="bg-gray-50 w-10 h-10 rounded-xl items-center justify-center mr-4">
                            <Languages size={20} color="#329629" />
                        </View>
                        <Text className="text-gray-900 font-bold text-base flex-1">{t('language')}</Text>
                    </View>
                    <LanguageSwitcher variant="dark" />
                </View>

                {/* Sign Out / Sign In */}
                <View className="px-6 mt-4">
                    {isSignedIn ? (
                        <TouchableOpacity
                            onPress={async () => { await logout(); }}
                            className="flex-row items-center justify-center bg-red-50 py-4 rounded-2xl border-2 border-red-100"
                        >
                            <LogOut size={20} color="#EF4444" />
                            <Text className="text-red-500 font-bold ml-2 text-base">{t('sign_out')}</Text>
                        </TouchableOpacity>
                    ) : (
                        <TouchableOpacity
                            onPress={() => router.push('/(auth)/login')}
                            className="flex-row items-center justify-center bg-primary py-4 rounded-2xl"
                            style={{ shadowColor: '#329629', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.25, shadowRadius: 8, elevation: 4 }}
                        >
                            <UserIcon size={20} color="#FFFFFF" />
                            <Text className="text-white font-bold ml-2 text-base">{t('sign_in_continue')}</Text>
                        </TouchableOpacity>
                    )}
                </View>

                {isSignedIn && (
                    <View className="px-6 mt-4 mb-8">
                        <TouchableOpacity
                            onPress={() => {
                                Alert.alert(
                                                t('delete_account_title'),
                                                t('delete_account_msg'),
                                                [
                                                    { text: t('cancel'), style: 'cancel' },
                                                    {
                                                        text: t('request_deletion'),
                                            style: 'destructive',
                                            onPress: () => {
                                                setDeleting(true);
                                                apiRequest('/users/request-deletion/', { method: 'POST' })
                                                  .then(() => Alert.alert(t('deletion_submitted'), t('deletion_email')))
                                                  .catch((e: any) => Alert.alert(t('error'), toUserFriendlyError(e, t)))
                                                  .finally(() => setDeleting(false));
                                            },
                                        },
                                    ],
                                );
                            }}
                            disabled={deleting}
                            className={`flex-row items-center justify-center py-4 rounded-2xl border-2 border-red-200 ${deleting ? 'bg-red-50' : 'bg-red-50/50'}`}
                        >
                            {deleting ? (
                                <ActivityIndicator size="small" color="#F87171" />
                            ) : (
                                <Text className="text-red-400 font-bold text-sm">{t('delete_account')}</Text>
                            )}
                        </TouchableOpacity>
                    </View>
                )}

                <Text className="text-center text-gray-300 text-xs mt-6 mb-2">{t('version')}</Text>
            </ScrollView>
        </ScreenWrapper>
    );
}
