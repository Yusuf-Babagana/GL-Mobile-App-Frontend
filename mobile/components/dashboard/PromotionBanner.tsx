import React, { useCallback, useEffect, useRef, useState } from 'react';
import { initialContentWidth } from '@/lib/layout';
import { FlatList, Text, TouchableOpacity, View, ViewToken } from 'react-native';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { Sparkles, ShoppingBag, ArrowRight, Clock } from 'lucide-react-native';
import { useRouter } from 'expo-router';
import { marketAPI } from '@/lib/marketApi';
import { Colors } from '@/constants/Colors';

interface PromotedPost {
    id: number;
    code: string;
    text_content: string;
    promotion_type: 'product' | 'standalone';
    product_id: number | null;
    image: string | null;
    seller_name: string | null;
    time_remaining_seconds: number | null;
}

const CARD_WIDTH = initialContentWidth() - 40; // matches Home's px-5 (20px) container padding on each side
const CARD_HEIGHT = 172;
const AUTOPLAY_MS = 4500;

const shadow = {
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.16,
    shadowRadius: 20,
    elevation: 8,
};

function formatTimeRemaining(seconds: number | null): string | null {
    if (seconds == null) return null;
    if (seconds <= 0) return null;
    const hours = Math.floor(seconds / 3600);
    if (hours >= 24) return `${Math.floor(hours / 24)}d left`;
    if (hours >= 1) return `${hours}h left`;
    return `${Math.max(1, Math.floor(seconds / 60))}m left`;
}

function initials(name: string | null): string {
    if (!name) return 'G';
    return name.trim().charAt(0).toUpperCase();
}

export default function PromotionBanner() {
    const router = useRouter();
    const [posts, setPosts] = useState<PromotedPost[]>([]);
    const [activeIndex, setActiveIndex] = useState(0);
    const listRef = useRef<FlatList>(null);
    const autoplayTimer = useRef<ReturnType<typeof setInterval> | null>(null);

    useEffect(() => {
        let isMounted = true;
        marketAPI.getActivePromotedPosts().then((data) => {
            if (isMounted) setPosts(Array.isArray(data) ? data : []);
        });
        return () => { isMounted = false; };
    }, []);

    const stopAutoplay = useCallback(() => {
        if (autoplayTimer.current) {
            clearInterval(autoplayTimer.current);
            autoplayTimer.current = null;
        }
    }, []);

    const startAutoplay = useCallback(() => {
        stopAutoplay();
        if (posts.length <= 1) return;
        autoplayTimer.current = setInterval(() => {
            setActiveIndex((prev) => {
                const next = (prev + 1) % posts.length;
                listRef.current?.scrollToIndex({ index: next, animated: true });
                return next;
            });
        }, AUTOPLAY_MS);
    }, [posts.length, stopAutoplay]);

    useEffect(() => {
        startAutoplay();
        return stopAutoplay;
    }, [startAutoplay, stopAutoplay]);

    const onViewableItemsChanged = useRef(({ viewableItems }: { viewableItems: ViewToken[] }) => {
        if (viewableItems.length > 0 && viewableItems[0].index != null) {
            setActiveIndex(viewableItems[0].index);
        }
    }).current;

    const goToDestination = (post: PromotedPost) => {
        // Every promotion has its own page (with Share / Copy link / Chat);
        // product promos link on to the product from there.
        if (!post.code) return;
        router.push({ pathname: '/promotion/[code]', params: { code: post.code } });
    };

    if (posts.length === 0) {
        return (
            <TouchableOpacity
                activeOpacity={0.9}
                onPress={() => router.push('/promoted-post/create')}
                style={{ height: CARD_HEIGHT, marginBottom: 16 }}
                className="rounded-[28px] overflow-hidden"
            >
                <LinearGradient
                    colors={[Colors.primary, Colors.primaryDark]}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={{ flex: 1, ...shadow }}
                    className="items-center justify-center px-6"
                >
                    <View
                        className="absolute rounded-full"
                        style={{ width: 160, height: 160, right: -50, top: -60, backgroundColor: 'rgba(255,255,255,0.08)' }}
                    />
                    <View className="flex-row items-center justify-between w-full">
                        <View className="flex-1 pr-4">
                            <View className="flex-row items-center bg-white/15 self-start px-2.5 py-1 rounded-full mb-2">
                                <Sparkles size={10} color="#fff" />
                                <Text className="text-white text-[9px] font-black uppercase tracking-widest ml-1">Sponsored Slot</Text>
                            </View>
                            <Text className="text-white text-lg font-black leading-tight tracking-tight">Shop Smarter</Text>
                            <Text className="text-white/75 text-[11px] mt-1 font-semibold leading-4">
                                Promote your business today and reach thousands of customers
                            </Text>
                        </View>
                        <View className="w-12 h-12 rounded-2xl bg-white/15 items-center justify-center border border-white/20">
                            <ShoppingBag size={22} color="white" />
                        </View>
                    </View>
                </LinearGradient>
            </TouchableOpacity>
        );
    }

    return (
        <View style={{ marginBottom: 16 }}>
            <FlatList
                ref={listRef}
                data={posts}
                horizontal
                pagingEnabled
                showsHorizontalScrollIndicator={false}
                keyExtractor={(item) => String(item.id)}
                snapToInterval={CARD_WIDTH}
                decelerationRate="fast"
                onScrollBeginDrag={stopAutoplay}
                onMomentumScrollEnd={startAutoplay}
                onViewableItemsChanged={onViewableItemsChanged}
                viewabilityConfig={{ itemVisiblePercentThreshold: 60 }}
                getItemLayout={(_, index) => ({ length: CARD_WIDTH, offset: CARD_WIDTH * index, index })}
                renderItem={({ item }) => {
                    const timeLabel = formatTimeRemaining(item.time_remaining_seconds);
                    return (
                        <TouchableOpacity
                            activeOpacity={0.92}
                            onPress={() => goToDestination(item)}
                            style={{ width: CARD_WIDTH, height: CARD_HEIGHT, ...shadow }}
                            className="rounded-[28px] overflow-hidden border border-black/5"
                        >
                            {item.image ? (
                                <Image source={{ uri: item.image }} style={{ width: '100%', height: '100%' }} contentFit="cover" transition={300} cachePolicy="memory-disk" />
                            ) : (
                                <LinearGradient
                                    colors={[Colors.primary, Colors.primaryDark]}
                                    start={{ x: 0, y: 0 }}
                                    end={{ x: 1, y: 1 }}
                                    style={{ width: '100%', height: '100%' }}
                                />
                            )}

                            {/* Legibility gradient — richer + brand-tinted at the base */}
                            <LinearGradient
                                colors={['rgba(15,23,42,0.05)', 'rgba(15,23,42,0.35)', 'rgba(6,20,10,0.92)']}
                                locations={[0, 0.45, 1]}
                                style={{ position: 'absolute', left: 0, right: 0, bottom: 0, top: 0 }}
                            />

                            <View className="absolute top-3 left-3 flex-row items-center bg-white px-2.5 py-1 rounded-full" style={{ shadowColor: '#000', shadowOpacity: 0.15, shadowRadius: 4, shadowOffset: { width: 0, height: 1 } }}>
                                <Sparkles size={10} color={Colors.primary} />
                                <Text className="text-[9px] font-black uppercase tracking-widest ml-1" style={{ color: Colors.primaryDark }}>Sponsored</Text>
                            </View>

                            {!!timeLabel && (
                                <View className="absolute top-3 right-3 flex-row items-center bg-black/45 px-2.5 py-1 rounded-full">
                                    <Clock size={9} color="#fff" />
                                    <Text className="text-white text-[9px] font-bold ml-1">{timeLabel}</Text>
                                </View>
                            )}

                            <View className="absolute bottom-3 left-3.5 right-3.5">
                                <View className="flex-row items-center mb-1.5">
                                    <View className="w-5 h-5 rounded-full bg-white/20 items-center justify-center border border-white/30 mr-1.5">
                                        <Text className="text-white text-[9px] font-black">{initials(item.seller_name)}</Text>
                                    </View>
                                    <Text numberOfLines={1} className="text-white/75 text-[10px] font-bold uppercase tracking-wider flex-1">
                                        {item.seller_name || 'Verified Seller'}
                                    </Text>
                                </View>

                                <View className="flex-row items-end justify-between">
                                    <Text numberOfLines={3} className="text-white text-[15px] font-black leading-5 flex-1 mr-3">
                                        {item.text_content}
                                    </Text>
                                    <View className="flex-row items-center bg-white pl-2.5 pr-1.5 py-1.5 rounded-full">
                                        <Text className="text-slate-900 text-[10px] font-black mr-1">View</Text>
                                        <View className="w-4 h-4 rounded-full items-center justify-center" style={{ backgroundColor: Colors.primary }}>
                                            <ArrowRight size={10} color="#fff" />
                                        </View>
                                    </View>
                                </View>
                            </View>
                        </TouchableOpacity>
                    );
                }}
            />

            {posts.length > 1 && (
                <View className="flex-row justify-center mt-3" style={{ gap: 5 }}>
                    {posts.map((_, i) => (
                        <View
                            key={i}
                            style={{
                                width: i === activeIndex ? 18 : 6,
                                height: 6,
                                borderRadius: 3,
                                backgroundColor: i === activeIndex ? Colors.primary : '#D1D5DB',
                            }}
                        />
                    ))}
                </View>
            )}
        </View>
    );
}
