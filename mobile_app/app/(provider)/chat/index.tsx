import React, { useState, useEffect, useCallback } from 'react';
import {
    View,
    Text,
    StyleSheet,
    FlatList,
    TouchableOpacity,
    Image,
    RefreshControl,
    ActivityIndicator,
    SafeAreaView,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '@/app/constants/Colors';
import { api } from '@/app/services/api';
import { API_BASE_URL } from '@/app/config/api';
import { formatDistanceToNow } from 'date-fns';

export default function ProviderChatList() {
    const router = useRouter();
    const [conversations, setConversations] = useState([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);

    const fetchConversations = async () => {
        try {
            const response = await api.get<any>('/chat/conversations');
            if (response.success) {
                setConversations(response.data.data || []);
            }
        } catch (error) {
            console.error('Error fetching conversations:', error);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    useEffect(() => {
        fetchConversations();
    }, []);

    const onRefresh = useCallback(() => {
        setRefreshing(true);
        fetchConversations();
    }, []);

    const renderItem = ({ item }: { item: any }) => {
        const customer = item.other_party;
        const latestMessage = item.latestMessage;

        if (!customer) return null; // skip broken items

        return (
            <TouchableOpacity
                style={styles.conversationItem}
                onPress={() => router.push(`/(provider)/chat/${item.conversationID}`)}
            >
                <Image
                    source={{
                        uri: customer?.profilePicture
                            ? (customer.profilePicture.startsWith('http')
                                ? customer.profilePicture
                                : `${API_BASE_URL.replace('/api', '')}/${customer.profilePicture}`)
                            : 'https://via.placeholder.com/50',
                    }}
                    style={styles.avatar}
                />
                <View style={styles.content}>
                    <View style={styles.header}>
                        <Text style={styles.name}>{customer?.fullname || 'Customer'}</Text>
                        {latestMessage && (
                            <Text style={styles.time}>
                                {formatDistanceToNow(new Date(latestMessage.created_at), { addSuffix: true })}
                            </Text>
                        )}
                    </View>
                    <View style={styles.footer}>
                        <Text style={[styles.lastMessage, item.unread_count > 0 && styles.unreadMessage]} numberOfLines={1}>
                            {latestMessage?.message || 'No messages yet'}
                        </Text>
                        {item.unread_count > 0 && (
                            <View style={styles.badge}>
                                <Text style={styles.badgeText}>{item.unread_count}</Text>
                            </View>
                        )}
                    </View>
                </View>
            </TouchableOpacity>
        );
    };

    if (loading && !refreshing) {
        return (
            <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color={Colors.primary} />
            </View>
        );
    }

    return (
        <SafeAreaView style={styles.container}>
            <FlatList
                data={conversations}
                renderItem={renderItem}
                keyExtractor={(item, index) => item.conversationID?.toString() ?? `conv-${index}`}
                refreshControl={
                    <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[Colors.primary]} />
                }
                ListEmptyComponent={
                    <View style={styles.emptyContainer}>
                        <Ionicons name="chatbubbles-outline" size={64} color={Colors.text.secondary} />
                        <Text style={styles.emptyText}>No conversations yet</Text>
                        <Text style={styles.emptySubtitle}>When customers message you, they will appear here.</Text>
                    </View>
                }
            />
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: Colors.background,
    },
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    conversationItem: {
        flexDirection: 'row',
        padding: 15,
        backgroundColor: Colors.surface,
        borderBottomWidth: 1,
        borderBottomColor: Colors.border,
        alignItems: 'center',
    },
    avatar: {
        width: 60,
        height: 60,
        borderRadius: 30,
        marginRight: 15,
        backgroundColor: Colors.background,
    },
    content: {
        flex: 1,
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 5,
    },
    name: {
        fontSize: 16,
        fontWeight: '700',
        color: Colors.text.primary,
    },
    time: {
        fontSize: 12,
        color: Colors.text.secondary,
    },
    footer: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    lastMessage: {
        fontSize: 14,
        color: Colors.text.secondary,
        flex: 1,
        marginRight: 10,
    },
    unreadMessage: {
        color: Colors.text.primary,
        fontWeight: '700',
    },
    badge: {
        backgroundColor: Colors.primary,
        borderRadius: 12,
        minWidth: 24,
        height: 24,
        justifyContent: 'center',
        alignItems: 'center',
        paddingHorizontal: 6,
    },
    badgeText: {
        color: 'white',
        fontSize: 12,
        fontWeight: 'bold',
    },
    emptyContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        paddingTop: 150,
        paddingHorizontal: 40,
    },
    emptyText: {
        marginTop: 20,
        fontSize: 18,
        fontWeight: '600',
        color: Colors.text.primary,
    },
    emptySubtitle: {
        marginTop: 10,
        fontSize: 14,
        color: Colors.text.secondary,
        textAlign: 'center',
    },
});
