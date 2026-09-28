import { Colors } from "@/constants/Colors";
import { marketAPI } from "@/lib/marketApi";
import { Ionicons } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter, useFocusEffect } from 'expo-router';
import { useVideoPlayer, VideoView } from 'expo-video';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
    ActivityIndicator,
    Animated,
    Dimensions,
    FlatList,
    Pressable,
    StyleSheet,
    Text,
    TouchableOpacity,
    TouchableWithoutFeedback,
    View
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const { height, width } = Dimensions.get('window');

interface Ad {
    id: number;
    name: string;
    price: number | string;
    video_url?: string;
    video?: string;
    description?: string;
    store_name?: string;
    store_logo?: string;
    [key: string]: any;
}

const getVideoUrl = (path: string) => {
    if (!path) return '';
    if (path.includes('cloudinary.com') && path.includes('/video/upload/')) {
        return path.replace('/video/upload/', '/video/upload/f_mp4,vc_h264,q_auto/');
    }
    if (path.startsWith('/media/')) {
        return `https://glappbackend.pythonanywhere.com${path}`;
    }
    return path;
};

const formatPrice = (price: number | string) => {
    const num = Number(price);
    if (isNaN(num)) return price;
    return num.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 });
};

const LikeButton = ({ initialCount = 0 }: { initialCount?: number }) => {
    const [liked, setLiked] = useState(false);
    const [count, setCount] = useState(initialCount);
    const scaleAnim = useRef(new Animated.Value(1)).current;

    const handlePress = () => {
        const newLiked = !liked;
        setLiked(newLiked);
        setCount(prev => newLiked ? prev + 1 : Math.max(0, prev - 1));

        Animated.sequence([
            Animated.spring(scaleAnim, { toValue: 0.7, useNativeDriver: true, speed: 50 }),
            Animated.spring(scaleAnim, { toValue: 1.15, useNativeDriver: true, speed: 30 }),
            Animated.spring(scaleAnim, { toValue: 1, useNativeDriver: true, speed: 40 }),
        ]).start();
    };

    return (
        <TouchableOpacity activeOpacity={0.7} onPress={handlePress} style={styles.actionButton}>
            <Animated.View style={{ transform: [{ scale: scaleAnim }] }}>
                <Ionicons name={liked ? "heart" : "heart-outline"} size={35} color={liked ? '#FF3B30' : 'white'} />
            </Animated.View>
            <Text style={styles.actionText}>{count > 999 ? `${(count / 1000).toFixed(1)}K` : count}</Text>
        </TouchableOpacity>
    );
};

const ProgressDots = ({ total, active }: { total: number; active: number }) => {
    if (total <= 1) return null;
    return (
        <View style={styles.progressContainer}>
            {Array.from({ length: Math.min(total, 20) }).map((_, i) => (
                <View
                    key={i}
                    style={[
                        styles.progressDot,
                        {
                            backgroundColor: i === active ? 'white' : 'rgba(255,255,255,0.35)',
                            width: i === active ? 16 : 6,
                        },
                    ]}
                />
            ))}
        </View>
    );
};

const VideoAdItem = ({ item, isVisible, screenActive }: { item: Ad; isVisible: boolean; screenActive: boolean }) => {
    const router = useRouter();
    const finalVideoUrl = getVideoUrl(item.video_url || item.video || '');
    const [isPlaying, setIsPlaying] = useState(true);
    const fadeAnim = useRef(new Animated.Value(0)).current;
    const slideAnim = useRef(new Animated.Value(30)).current;

    const player = useVideoPlayer(finalVideoUrl, (p) => {
        p.loop = true;
        p.muted = false;
        p.pause();
    });

    useEffect(() => {
        if (isVisible) {
            setIsPlaying(true);
            Animated.parallel([
                Animated.timing(fadeAnim, { toValue: 1, duration: 500, useNativeDriver: true }),
                Animated.timing(slideAnim, { toValue: 0, duration: 500, useNativeDriver: true }),
            ]).start();
        } else {
            fadeAnim.setValue(0);
            slideAnim.setValue(30);
        }
    }, [isVisible]);

    useEffect(() => {
        if (!screenActive || !isVisible) {
            player?.pause();
            return;
        }
        if (isPlaying && player && finalVideoUrl) {
            player.play();
        }
    }, [isVisible, isPlaying, player, finalVideoUrl, screenActive]);

    const togglePlay = () => setIsPlaying(prev => !prev);

    if (!finalVideoUrl) {
        return (
            <View style={[styles.itemContainer, { justifyContent: 'center', alignItems: 'center' }]}>
                <ActivityIndicator color="white" size="large" />
            </View>
        );
    }

    return (
        <TouchableWithoutFeedback onPress={togglePlay}>
            <View style={styles.itemContainer}>
                <VideoView
                    style={styles.video}
                    player={player}
                    contentFit="cover"
                    nativeControls={false}
                    surfaceType="textureView"
                />

                {/* Top gradient overlay */}
                <LinearGradient
                    colors={['rgba(0,0,0,0.5)', 'transparent']}
                    style={styles.topGradient}
                    pointerEvents="none"
                />

                {/* Play/Pause overlay */}
                {!isPlaying && (
                    <View style={styles.playOverlay}>
                        <View style={styles.playCircle}>
                            <Ionicons name="play" size={48} color="white" style={{ marginLeft: 4 }} />
                        </View>
                    </View>
                )}

                {/* Right Sidebar */}
                <Animated.View
                    style={[
                        styles.rightSidebar,
                        { opacity: fadeAnim, transform: [{ translateX: slideAnim }] }
                    ]}
                >
                    <View style={styles.profileContainer}>
                        <View style={styles.avatarBorder}>
                            <Image
                                source={{
                                    uri: item.store_logo ||
                                        `https://ui-avatars.com/api/?name=${item.store_name || 'Store'}&background=329629&color=fff&size=96`
                                }}
                                style={styles.avatar}
                                contentFit="cover"
                                transition={300}
                            />
                        </View>
                        <View style={styles.followBadge}>
                            <Ionicons name="add" size={14} color="white" />
                        </View>
                    </View>

                    <LikeButton initialCount={Math.floor(Math.random() * 500) + 50} />

                    <TouchableOpacity
                        style={styles.actionButton}
                        activeOpacity={0.7}
                        onPress={() => {
                            const sellerId = item.seller_id || item.store?.owner_id || item.store?.user_id;
                            if (sellerId) {
                                router.push({
                                    pathname: "/chat/[userId]",
                                    params: { userId: sellerId, name: item.store_name || "Seller" }
                                });
                            }
                        }}
                    >
                        <Ionicons name="chatbubble-ellipses" size={33} color="white" />
                        <Text style={styles.actionText}>Chat</Text>
                    </TouchableOpacity>

                    <TouchableOpacity style={styles.actionButton} activeOpacity={0.7}>
                        <Ionicons name="arrow-redo" size={33} color="white" />
                        <Text style={styles.actionText}>Share</Text>
                    </TouchableOpacity>
                </Animated.View>

                {/* Bottom Glassmorphism Card */}
                <Animated.View
                    style={[
                        styles.bottomCard,
                        { opacity: fadeAnim, transform: [{ translateY: slideAnim }] }
                    ]}
                >
                    <BlurView intensity={50} tint="dark" style={StyleSheet.absoluteFill} pointerEvents="none" />
                    <LinearGradient
                        colors={['transparent', 'rgba(0,0,0,0.3)']}
                        style={StyleSheet.absoluteFill}
                        pointerEvents="none"
                    />

                    <View style={styles.bottomContent}>
                        <TouchableOpacity style={styles.storeRow} activeOpacity={0.7} onPress={() => router.push(`/product/${item.id}`)}>
                            <View style={styles.storeBadge}>
                                <Ionicons name="storefront" size={14} color={Colors.primary} />
                                <Text style={styles.storeName}>@{item.store_name || 'GL Store'}</Text>
                            </View>
                            <View style={styles.verifiedBadge}>
                                <Ionicons name="checkmark-circle" size={14} color="#3B82F6" />
                            </View>
                        </TouchableOpacity>

                        <TouchableOpacity activeOpacity={0.7} onPress={() => router.push(`/product/${item.id}`)}>
                            <Text style={styles.productName}>{item.name}</Text>
                        </TouchableOpacity>

                        {item.description ? (
                            <Text numberOfLines={2} style={styles.description}>
                                {item.description}
                            </Text>
                        ) : null}

                        <View style={styles.priceRow}>
                            <Text style={styles.currencySymbol}>₦</Text>
                            <Text style={styles.price}>{formatPrice(item.price)}</Text>
                            {item.compare_at_price && Number(item.compare_at_price) > Number(item.price) && (
                                <Text style={styles.comparePrice}>
                                    ₦{formatPrice(item.compare_at_price)}
                                </Text>
                            )}
                        </View>

                        <TouchableOpacity
                            style={styles.shopNowBtn}
                            activeOpacity={0.85}
                            onPress={() => router.push(`/product/${item.id}`)}
                        >
                            <LinearGradient
                                colors={[Colors.primary, '#4ADE80']}
                                start={{ x: 0, y: 0 }}
                                end={{ x: 1, y: 0 }}
                                style={styles.shopGradient}
                            >
                                <Ionicons name="bag-handle" size={18} color="white" />
                                <Text style={styles.shopNowText}>Shop Now</Text>
                                <Ionicons name="arrow-forward" size={16} color="white" style={{ marginLeft: 4 }} />
                            </LinearGradient>
                        </TouchableOpacity>
                    </View>
                </Animated.View>
            </View>
        </TouchableWithoutFeedback>
    );
};

const ShimmerLoader = () => (
    <View style={[styles.itemContainer, { justifyContent: 'center', alignItems: 'center', backgroundColor: '#111' }]}>
        <View style={{ alignItems: 'center', gap: 16 }}>
            <View style={{ width: 60, height: 60, borderRadius: 30, backgroundColor: '#222' }} />
            <View style={{ width: 200, height: 16, borderRadius: 8, backgroundColor: '#222' }} />
            <View style={{ width: 150, height: 12, borderRadius: 6, backgroundColor: '#1a1a1a' }} />
        </View>
    </View>
);

export default function AdsScreen() {
    const insets = useSafeAreaInsets();
    const [ads, setAds] = useState<Ad[]>([]);
    const [activeIndex, setActiveIndex] = useState(0);
    const [page, setPage] = useState(1);
    const [loadingMore, setLoadingMore] = useState(false);
    const [hasMore, setHasMore] = useState(true);
    const [initialLoading, setInitialLoading] = useState(true);

    const loadAds = useCallback(async (pageNum: number) => {
        if (loadingMore || (!hasMore && pageNum > 1)) return;
        try {
            setLoadingMore(true);
            const res = await marketAPI.get('/market/products/', {
                params: { page: pageNum }
            });
            const products = res?.data?.results || res?.data || [];
            const videoAds = products.filter((p: any) => p.video_ad_url || p.video_url);
            if (videoAds.length === 0) {
                setHasMore(false);
                return;
            }
            const mapped: Ad[] = videoAds.map((p: any) => {
                const vidUrl = p.video_ad_url || p.video_url;
                return {
                    id: p.id,
                    name: p.name || p.title || '',
                    price: p.price ?? 0,
                    video_url: vidUrl,
                    video: vidUrl,
                    description: p.description || '',
                    store_name: p.store_name || p.store?.name || 'GL Store',
                    store_logo: p.store_logo || p.store?.logo,
                    seller_id: p.seller_id || p.store?.owner_id,
                };
            });
            setAds(prev => {
                if (pageNum === 1) return mapped;
                const existingIds = new Set(prev.map(item => item.id));
                const newItems = mapped.filter((item: Ad) => !existingIds.has(item.id));
                if (newItems.length === 0 && videoAds.length > 0) setHasMore(false);
                return [...prev, ...newItems];
            });
        } catch (e) {
            console.error("Failed to load ads", e);
            setHasMore(false);
        } finally {
            setLoadingMore(false);
            setInitialLoading(false);
        }
    }, [loadingMore, hasMore]);

    useEffect(() => { loadAds(1); }, []);

    const [screenActive, setScreenActive] = useState(true);

    useFocusEffect(
        useCallback(() => {
            setScreenActive(true);
            return () => setScreenActive(false);
        }, [])
    );

    const fetchMoreAds = () => {
        if (!loadingMore && hasMore) {
            const nextPage = page + 1;
            setPage(nextPage);
            loadAds(nextPage);
        }
    };

    const onViewableItemsChanged = useRef(({ viewableItems }: any) => {
        if (viewableItems.length > 0) {
            setActiveIndex(viewableItems[0].index);
        }
    }).current;

    const viewabilityConfig = useRef({
        itemVisiblePercentThreshold: 80,
        minimumViewTime: 100,
    }).current;

    const renderItem = useCallback(({ item, index }: { item: Ad; index: number }) => (
        <VideoAdItem item={item} isVisible={index === activeIndex} screenActive={screenActive} />
    ), [activeIndex, screenActive]);

    const keyExtractor = useCallback((item: Ad, index: number) =>
        item.id?.toString() || index.toString(), []);

    return (
        <View style={styles.container}>
            {/* Modern Header */}
            <LinearGradient
                colors={['rgba(0,0,0,0.6)', 'transparent']}
                style={[styles.header, { paddingTop: insets.top + 8 }]}
                pointerEvents="box-none"
            >
                <View style={styles.headerContent}>
                    <View style={styles.headerLeft}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                            <View style={styles.liveIndicator}>
                                <View style={styles.liveDot} />
                                <Text style={styles.liveText}>LIVE</Text>
                            </View>
                            <Text style={styles.headerTitle}>Ads</Text>
                        </View>
                    </View>
                    <View style={styles.headerRight}>
                        <TouchableOpacity style={styles.headerBtn} activeOpacity={0.7}>
                            <Ionicons name="search" size={22} color="white" />
                        </TouchableOpacity>
                        <TouchableOpacity style={styles.headerBtn} activeOpacity={0.7}>
                            <Ionicons name="ellipsis-vertical" size={22} color="white" />
                        </TouchableOpacity>
                    </View>
                </View>
                <ProgressDots total={ads.length} active={activeIndex} />
            </LinearGradient>

            {/* Single FlatList — never changes identity */}
            <FlatList
                data={initialLoading ? [1, 2, 3] as any : ads}
                keyExtractor={initialLoading ? (i: any) => `skeleton-${i}` : keyExtractor}
                renderItem={initialLoading ? () => <ShimmerLoader /> : renderItem}
                pagingEnabled
                ListEmptyComponent={
                    !initialLoading ? (
                        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', height }}>
                            <View style={styles.emptyIconWrap}>
                                <Ionicons name="videocam-off-outline" size={48} color="rgba(255,255,255,0.3)" />
                            </View>
                            <Text style={{ color: 'rgba(255,255,255,0.5)', fontSize: 16, marginTop: 16 }}>
                                No live ads available yet
                            </Text>
                            <TouchableOpacity
                                onPress={() => { setInitialLoading(true); setPage(1); loadAds(1); }}
                                style={styles.emptyRefreshBtn}
                                activeOpacity={0.8}
                            >
                                <Ionicons name="refresh" size={18} color="white" />
                                <Text style={{ color: 'white', fontWeight: '600', marginLeft: 8 }}>Refresh</Text>
                            </TouchableOpacity>
                        </View>
                    ) : null
                }
                onViewableItemsChanged={onViewableItemsChanged}
                viewabilityConfig={viewabilityConfig}
                snapToInterval={height}
                snapToAlignment="start"
                decelerationRate="fast"
                showsVerticalScrollIndicator={false}
                contentContainerStyle={{ paddingBottom: 0 }}
                onEndReached={initialLoading ? undefined : fetchMoreAds}
                onEndReachedThreshold={0.1}
                ListFooterComponent={() =>
                    !initialLoading && loadingMore && ads.length > 0 ? (
                        <View style={{ height: 80, justifyContent: 'center', alignItems: 'center' }}>
                            <ActivityIndicator color="white" size="small" />
                        </View>
                    ) : null
                }
                removeClippedSubviews={true}
                maxToRenderPerBatch={3}
                windowSize={3}
            />
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#000' },
    itemContainer: { width, height, position: 'relative' },
    video: { width: '100%', height: '100%' },

    // Header
    header: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        zIndex: 20,
        paddingHorizontal: 16,
        paddingBottom: 12,
    },
    headerContent: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 12,
    },
    headerLeft: { flexDirection: 'row', alignItems: 'center' },
    liveIndicator: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#FF3B30',
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: 20,
        gap: 6,
    },
    liveDot: {
        width: 8,
        height: 8,
        borderRadius: 4,
        backgroundColor: 'white',
    },
    liveText: {
        color: 'white',
        fontSize: 12,
        fontWeight: '800',
        letterSpacing: 1,
    },
    headerTitle: {
        color: 'white',
        fontSize: 18,
        fontWeight: '700',
        marginLeft: 12,
    },
    headerRight: { flexDirection: 'row', alignItems: 'center', gap: 8 },
    headerBtn: {
        width: 36,
        height: 36,
        borderRadius: 18,
        backgroundColor: 'rgba(255,255,255,0.15)',
        justifyContent: 'center',
        alignItems: 'center',
    },

    // Progress dots
    progressContainer: {
        flexDirection: 'row',
        justifyContent: 'center',
        gap: 4,
    },
    progressDot: {
        height: 3,
        borderRadius: 2,
    },

    // Top gradient
    topGradient: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        height: height * 0.35,
        zIndex: 2,
    },

    // Play overlay
    playOverlay: {
        ...StyleSheet.absoluteFill,
        justifyContent: 'center',
        alignItems: 'center',
        zIndex: 15,
        backgroundColor: 'rgba(0,0,0,0.25)',
    },
    playCircle: {
        width: 84,
        height: 84,
        borderRadius: 42,
        backgroundColor: 'rgba(255,255,255,0.2)',
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 2,
        borderColor: 'rgba(255,255,255,0.3)',
    },

    // Right Sidebar
    rightSidebar: {
        position: 'absolute',
        right: 12,
        bottom: 260,
        alignItems: 'center',
        zIndex: 10,
        gap: 4,
    },
    profileContainer: {
        marginBottom: 16,
        position: 'relative',
    },
    avatarBorder: {
        width: 52,
        height: 52,
        borderRadius: 26,
        borderWidth: 2.5,
        borderColor: Colors.primary,
        justifyContent: 'center',
        alignItems: 'center',
    },
    avatar: {
        width: 46,
        height: 46,
        borderRadius: 23,
    },
    followBadge: {
        position: 'absolute',
        bottom: -6,
        alignSelf: 'center',
        backgroundColor: Colors.primary,
        width: 20,
        height: 20,
        borderRadius: 10,
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 2,
        borderColor: '#000',
    },
    actionButton: {
        alignItems: 'center',
        marginBottom: 14,
    },
    actionText: {
        color: 'white',
        marginTop: 4,
        fontSize: 12,
        fontWeight: '600',
        textShadowColor: 'rgba(0,0,0,0.5)',
        textShadowOffset: { width: 1, height: 1 },
        textShadowRadius: 3,
    },

    // Bottom glassmorphism card
    bottomCard: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        zIndex: 10,
        overflow: 'hidden',
        borderTopLeftRadius: 24,
        borderTopRightRadius: 24,
    },
    bottomContent: {
        paddingHorizontal: 20,
        paddingTop: 16,
        paddingBottom: 40,
    },
    storeRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 8,
        gap: 6,
    },
    storeBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        backgroundColor: 'rgba(255,255,255,0.1)',
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: 20,
    },
    storeName: {
        color: 'rgba(255,255,255,0.9)',
        fontSize: 13,
        fontWeight: '600',
    },
    verifiedBadge: {
        width: 20,
        height: 20,
        borderRadius: 10,
        backgroundColor: 'rgba(59,130,246,0.2)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    productName: {
        color: 'white',
        fontSize: 22,
        fontWeight: '700',
        marginBottom: 6,
    },
    description: {
        color: 'rgba(255,255,255,0.7)',
        fontSize: 14,
        lineHeight: 20,
        marginBottom: 12,
    },
    priceRow: {
        flexDirection: 'row',
        alignItems: 'baseline',
        marginBottom: 16,
        gap: 8,
    },
    currencySymbol: {
        color: Colors.primary,
        fontSize: 18,
        fontWeight: '700',
    },
    price: {
        color: 'white',
        fontSize: 30,
        fontWeight: '800',
    },
    comparePrice: {
        color: 'rgba(255,255,255,0.4)',
        fontSize: 16,
        textDecorationLine: 'line-through',
    },
    shopNowBtn: {
        borderRadius: 14,
        overflow: 'hidden',
        elevation: 4,
        shadowColor: Colors.primary,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
    },
    shopGradient: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 14,
        paddingHorizontal: 24,
        gap: 8,
    },
    shopNowText: {
        color: 'white',
        fontSize: 16,
        fontWeight: '700',
    },

    // Empty state
    emptyIconWrap: {
        width: 96,
        height: 96,
        borderRadius: 48,
        backgroundColor: 'rgba(255,255,255,0.06)',
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.1)',
    },
    emptyRefreshBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        marginTop: 24,
        backgroundColor: Colors.primary,
        paddingHorizontal: 20,
        paddingVertical: 12,
        borderRadius: 24,
    },
});
