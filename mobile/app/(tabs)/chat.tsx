import { Colors } from '@/constants/Colors';
import { getConversations } from '@/src/services/chatService';
import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { useFocusEffect, useRouter } from 'expo-router';
import React, { useCallback, useRef, useState } from 'react';
import {
    Animated,
    FlatList,
    RefreshControl,
    StyleSheet,
    Text,
    TouchableOpacity,
    View
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const formatTimeAnchor = (dateStr: string): string => {
    if (!dateStr) return '';
    const date = new Date(dateStr);
    const now = new Date();
    const diffDays = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24));

    if (diffDays === 0) {
        return date.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit', hour12: true });
    }
    if (diffDays === 1) return 'Yesterday';
    if (diffDays < 7) {
        return date.toLocaleDateString([], { weekday: 'long' });
    }
    if (date.getFullYear() === now.getFullYear()) {
        return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
    }
    return date.toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' });
};

const BUBBLE_COLORS = ['#329629', '#1E88E5', '#E53935', '#8E24AA', '#FB8C00', '#00897B', '#6D4C41', '#3949AB'];

const ConversationCard = ({ item, index }: { item: any; index: number }) => {
    const router = useRouter();
    const scaleAnim = useRef(new Animated.Value(1)).current;
    const unread = item.unread_count || 0;

    const onPressIn = () => {
        Animated.spring(scaleAnim, { toValue: 0.97, useNativeDriver: true }).start();
    };
    const onPressOut = () => {
        Animated.spring(scaleAnim, { toValue: 1, useNativeDriver: true, friction: 5 }).start();
    };

    const avatarColor = BUBBLE_COLORS[index % BUBBLE_COLORS.length];

    return (
        <Animated.View style={{ transform: [{ scale: scaleAnim }] }}>
            <TouchableOpacity
                activeOpacity={1}
                onPressIn={onPressIn}
                onPressOut={onPressOut}
                onPress={() => router.push({
                    pathname: "/chat/[userId]",
                    params: { userId: item.other_user_id, name: item.other_user_name }
                })}
                style={styles.card}
            >
                {/* Avatar */}
                <View style={[styles.avatarWrap, { backgroundColor: avatarColor + '18' }]}>
                    {item.other_user_avatar ? (
                        <Image
                            source={{ uri: item.other_user_avatar }}
                            style={styles.avatar}
                            contentFit="cover"
                            transition={250}
                        />
                    ) : (
                        <View style={[styles.avatarFallback, { backgroundColor: avatarColor }]}>
                            <Text style={styles.avatarInitial}>
                                {item.other_user_name?.charAt(0).toUpperCase() || '?'}
                            </Text>
                        </View>
                    )}
                    {item.online && <View style={styles.onlineDot} />}
                </View>

                {/* Content */}
                <View style={styles.cardContent}>
                    <View style={styles.cardTop}>
                        <Text style={[styles.name, unread > 0 && styles.nameUnread]} numberOfLines={1}>
                            {item.other_user_name || 'Unknown'}
                        </Text>
                        <Text style={styles.timeAnchor}>{formatTimeAnchor(item.updated_at)}</Text>
                    </View>
                    <View style={styles.cardBottom}>
                        <Text
                            style={[styles.lastMsg, unread > 0 && styles.lastMsgUnread]}
                            numberOfLines={1}
                        >
                            {item.last_message || 'No messages yet'}
                        </Text>
                        {unread > 0 && (
                            <View style={styles.badge}>
                                <Text style={styles.badgeText}>{unread > 99 ? '99+' : unread}</Text>
                            </View>
                        )}
                    </View>
                </View>
            </TouchableOpacity>
        </Animated.View>
    );
};

export default function InboxScreen() {
    const insets = useSafeAreaInsets();
    const [conversations, setConversations] = useState<any[]>([]);
    const [isRefreshing, setIsRefreshing] = useState(false);
    const [isLoading, setIsLoading] = useState(true);
    const router = useRouter();

    const fetchInbox = useCallback(async () => {
        try {
            const data = await getConversations();
            setConversations(data.results || data || []);
        } catch (e) {

        } finally {
            setIsLoading(false);
        }
    }, []);

    useFocusEffect(useCallback(() => { fetchInbox(); }, [fetchInbox]));

    const onRefresh = async () => {
        setIsRefreshing(true);
        await fetchInbox();
        setIsRefreshing(false);
    };

    const renderItem = useCallback(({ item, index }: { item: any; index: number }) => (
        <ConversationCard item={item} index={index} />
    ), []);

    const keyExtractor = useCallback((item: any) =>
        (item.id || item.other_user_id)?.toString() || Math.random().toString(), []);

    return (
        <View style={[styles.container, { paddingTop: insets.top }]}>
            {/* Header */}
            <View style={styles.header}>
                <View style={styles.headerRow}>
                    <Text style={styles.headerTitle}>Messages</Text>
                    <TouchableOpacity style={styles.composeBtn} activeOpacity={0.7}>
                        <Ionicons name="square-outline" size={22} color={Colors.primary} />
                    </TouchableOpacity>
                </View>
                <Text style={styles.headerSub}>
                    {conversations.length > 0
                        ? `${conversations.length} conversation${conversations.length > 1 ? 's' : ''}`
                        : 'No conversations'}
                </Text>
            </View>

            <FlatList
                data={conversations}
                keyExtractor={keyExtractor}
                renderItem={renderItem}
                contentContainerStyle={styles.listContent}
                initialNumToRender={12}
                windowSize={7}
                removeClippedSubviews
                refreshControl={
                    <RefreshControl
                        refreshing={isRefreshing}
                        onRefresh={onRefresh}
                        tintColor={Colors.primary}
                        colors={[Colors.primary]}
                        progressBackgroundColor="#fff"
                    />
                }
                showsVerticalScrollIndicator={false}
                ListEmptyComponent={
                    isLoading ? (
                        <View style={styles.emptyState}>
                            {[1, 2, 3, 4].map(i => (
                                <View key={i} style={styles.skeletonRow}>
                                    <View style={styles.skeletonAvatar} />
                                    <View style={styles.skeletonLines}>
                                        <View style={styles.skeletonName} />
                                        <View style={styles.skeletonMsg} />
                                    </View>
                                </View>
                            ))}
                        </View>
                    ) : (
                        <View style={styles.emptyState}>
                            <View style={styles.emptyIconWrap}>
                                <Ionicons name="chatbubbles-outline" size={48} color="#CBD5E1" />
                            </View>
                            <Text style={styles.emptyTitle}>No messages yet</Text>
                            <Text style={styles.emptySub}>Start a conversation from a product listing</Text>
                        </View>
                    )
                }
                ItemSeparatorComponent={() => <View style={styles.separator} />}
            />
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#FAFAFA' },

    // Header
    header: { paddingHorizontal: 20, paddingTop: 8, paddingBottom: 12 },
    headerRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    headerTitle: { fontSize: 30, fontWeight: '800', color: Colors.text.primary },
    headerSub: { fontSize: 14, color: Colors.text.secondary, marginTop: 2 },
    composeBtn: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: Colors.primaryContainer,
        justifyContent: 'center',
        alignItems: 'center',
    },

    // Card
    card: {
        flexDirection: 'row',
        paddingHorizontal: 20,
        paddingVertical: 14,
        alignItems: 'center',
        backgroundColor: '#FAFAFA',
    },
    avatarWrap: {
        width: 56,
        height: 56,
        borderRadius: 28,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 14,
        position: 'relative',
    },
    avatar: { width: 56, height: 56, borderRadius: 28 },
    avatarFallback: {
        width: 56,
        height: 56,
        borderRadius: 28,
        justifyContent: 'center',
        alignItems: 'center',
    },
    avatarInitial: { color: '#fff', fontSize: 22, fontWeight: '700' },
    onlineDot: {
        position: 'absolute',
        bottom: 2,
        right: 2,
        width: 12,
        height: 12,
        borderRadius: 6,
        backgroundColor: Colors.primary,
        borderWidth: 2.5,
        borderColor: '#FAFAFA',
    },
    cardContent: { flex: 1, gap: 4 },
    cardTop: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    name: { fontSize: 16, fontWeight: '600', color: Colors.text.primary, flex: 1, marginRight: 8 },
    nameUnread: { fontWeight: '800' },
    timeAnchor: { fontSize: 12, color: Colors.text.secondary, fontWeight: '500' },
    cardBottom: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    lastMsg: { fontSize: 14, color: Colors.text.secondary, flex: 1, marginRight: 8 },
    lastMsgUnread: { color: Colors.text.primary, fontWeight: '600' },
    badge: {
        backgroundColor: Colors.primary,
        minWidth: 22,
        height: 22,
        borderRadius: 11,
        justifyContent: 'center',
        alignItems: 'center',
        paddingHorizontal: 6,
    },
    badgeText: { color: '#fff', fontSize: 11, fontWeight: '700' },

    separator: { height: 1, backgroundColor: '#F0F0F0', marginLeft: 90 },

    listContent: { paddingBottom: 100 },

    // Empty / Skeleton
    emptyState: { paddingHorizontal: 20, paddingTop: 40, gap: 4 },
    emptyIconWrap: {
        width: 88,
        height: 88,
        borderRadius: 44,
        backgroundColor: '#F1F5F9',
        justifyContent: 'center',
        alignItems: 'center',
        alignSelf: 'center',
        marginBottom: 16,
    },
    emptyTitle: { textAlign: 'center', fontSize: 18, fontWeight: '700', color: Colors.text.primary },
    emptySub: { textAlign: 'center', fontSize: 14, color: Colors.text.secondary, marginTop: 4 },
    skeletonRow: {
        flexDirection: 'row',
        paddingVertical: 16,
        paddingHorizontal: 20,
        alignItems: 'center',
    },
    skeletonAvatar: {
        width: 56, height: 56, borderRadius: 28,
        backgroundColor: '#E8E8E8', marginRight: 14,
    },
    skeletonLines: { flex: 1, gap: 8 },
    skeletonName: { height: 14, width: '40%', borderRadius: 7, backgroundColor: '#E8E8E8' },
    skeletonMsg: { height: 12, width: '70%', borderRadius: 6, backgroundColor: '#F0F0F0' },
});
