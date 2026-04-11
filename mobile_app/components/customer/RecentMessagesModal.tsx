import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  FlatList,
  Image,
  Dimensions,
  TouchableWithoutFeedback,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '@/app/constants/Colors';
import { API_BASE_URL } from '@/app/config/api';
import { useTranslation } from 'react-i18next';
import { formatDistanceToNow } from 'date-fns';

const { width, height } = Dimensions.get('window');

interface RecentMessagesModalProps {
  visible: boolean;
  onClose: () => void;
  conversations: any[];
  onSelectConversation: (id: number) => void;
  onSeeAll: () => void;
}

export function RecentMessagesModal({
  visible,
  onSelectConversation,
  onSeeAll,
}: RecentMessagesModalProps) {
  const { t } = useTranslation();
  
  const renderItem = ({ item }: { item: any }) => {
    const provider = item.other_party;
    const latestMessage = item.latestMessage;
    if (!provider) return null;

    return (
      <TouchableOpacity
        style={styles.conversationItem}
        onPress={() => {
          onClose();
          onSelectConversation(provider.providerID || provider.id);
        }}
      >
        <Image
          source={{
            uri: provider.profilePicture
              ? (provider.profilePicture.startsWith('http')
                ? provider.profilePicture
                : `${API_BASE_URL.replace('/api', '')}/${provider.profilePicture}`)
              : 'https://via.placeholder.com/50'
          }}
          style={styles.avatar}
        />
        <View style={styles.content}>
          <View style={styles.header}>
            <Text style={styles.name} numberOfLines={1}>
              {provider.businessName || provider.fullname || t('common.provider', 'Provider')}
            </Text>
            {latestMessage && (
              <Text style={styles.time}>
                {formatDistanceToNow(new Date(latestMessage.created_at), { addSuffix: false })}
              </Text>
            )}
          </View>
          <Text 
            style={[styles.lastMessage, item.unread_count > 0 && styles.unreadMessage]} 
            numberOfLines={1}
          >
            {latestMessage?.message || t('chat.noMessagesYet', 'No messages yet')}
          </Text>
        </View>
        {item.unread_count > 0 && (
          <View style={styles.unreadBadge} />
        )}
      </TouchableOpacity>
    );
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <TouchableWithoutFeedback onPress={onClose}>
        <View style={styles.overlay}>
          <TouchableWithoutFeedback onPress={e => e.stopPropagation()}>
            <View style={styles.modalContent}>
              <View style={styles.modalHeader}>
                <View style={styles.modalTitleContainer}>
                  <Ionicons name="chatbubbles" size={20} color={Colors.primary} />
                  <Text style={styles.modalTitle}>{t('chat.recentMessages', 'Recent Messages')}</Text>
                </View>
                <TouchableOpacity onPress={onClose} style={styles.closeButton}>
                  <Ionicons name="close" size={24} color={Colors.text.secondary} />
                </TouchableOpacity>
              </View>

              {conversations.length > 0 ? (
                <>
                  <FlatList
                    data={conversations.slice(0, 5)}
                    renderItem={renderItem}
                    keyExtractor={(item) => item.conversationID.toString()}
                    scrollEnabled={false}
                  />
                  <TouchableOpacity style={styles.seeAllButton} onPress={onSeeAll}>
                    <Text style={styles.seeAllText}>{t('chat.seeAllMessages', 'See All Messages')}</Text>
                    <Ionicons name="arrow-forward" size={16} color={Colors.primary} />
                  </TouchableOpacity>
                </>
              ) : (
                <View style={styles.emptyContainer}>
                  <Ionicons name="chatbubble-outline" size={48} color={Colors.text.disabled} />
                  <Text style={styles.emptyText}>{t('chat.noRecentMessages', 'No recent messages')}</Text>
                  <TouchableOpacity style={styles.startChatButton} onPress={onSeeAll}>
                    <Text style={styles.startChatText}>{t('chat.browseProviders', 'Browse Providers')}</Text>
                  </TouchableOpacity>
                </View>
              )}
            </View>
          </TouchableWithoutFeedback>
        </View>
      </TouchableWithoutFeedback>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-start',
    alignItems: 'center',
    paddingTop: Platform.OS === 'ios' ? 120 : 100,
  },
  modalContent: {
    width: width - 40,
    backgroundColor: Colors.surface,
    borderRadius: 20,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.2,
    shadowRadius: 20,
    elevation: 10,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  modalTitleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.text.primary,
    marginLeft: 8,
  },
  closeButton: {
    padding: 4,
  },
  conversationItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  avatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
    marginRight: 12,
    backgroundColor: Colors.background,
  },
  content: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  name: {
    fontSize: 15,
    fontWeight: '600',
    color: Colors.text.primary,
    flex: 1,
    marginRight: 8,
  },
  time: {
    fontSize: 11,
    color: Colors.text.secondary,
  },
  lastMessage: {
    fontSize: 13,
    color: Colors.text.secondary,
  },
  unreadMessage: {
    color: Colors.text.primary,
    fontWeight: '600',
  },
  unreadBadge: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: Colors.primary,
    marginLeft: 8,
  },
  seeAllButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    backgroundColor: Colors.primary + '05',
  },
  seeAllText: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.primary,
    marginRight: 4,
  },
  emptyContainer: {
    padding: 32,
    alignItems: 'center',
  },
  emptyText: {
    marginTop: 12,
    fontSize: 14,
    color: Colors.text.secondary,
    textAlign: 'center',
  },
  startChatButton: {
    marginTop: 16,
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 20,
    backgroundColor: Colors.primary,
  },
  startChatText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '600',
  },
});
