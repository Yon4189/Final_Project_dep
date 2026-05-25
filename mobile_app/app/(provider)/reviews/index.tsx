// app/(provider)/reviews/index.tsx
import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  FlatList,
  TextInput,
  Modal,
  Alert,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { useTheme } from '@/app/context/ThemeContext';
import { ThemeColors } from '@/app/constants/Colors';
import { useProviderReviews } from '@/hooks/useProviderReviews';
import { LoadingSpinner } from '../../../components/common/LoadingSpinner';
import { EmptyState } from '../../../components/common/EmptyState';
import { formatTimeAgo } from '../../utils/formatters';
import type { CustomerReview } from '../../types/provider.types';

export default function ProviderReviews() {
  const router = useRouter();
  const { t } = useTranslation();
  const { colors, isDark } = useTheme();

  const RATING_DISTRIBUTION = [
    { stars: 5, label: t('reviews.distribution.excellent', 'Excellent') },
    { stars: 4, label: t('reviews.distribution.veryGood', 'Very Good') },
    { stars: 3, label: t('reviews.distribution.average', 'Average') },
    { stars: 2, label: t('reviews.distribution.belowAverage', 'Below Average') },
    { stars: 1, label: t('reviews.distribution.poor', 'Poor') },
  ];
  const styles = useMemo(() => getStyles(colors, isDark), [colors, isDark]);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedReview, setSelectedReview] = useState<CustomerReview | null>(null);
  const [showResponseModal, setShowResponseModal] = useState(false);
  const [responseText, setResponseText] = useState('');
  const [filterRating, setFilterRating] = useState<number | null>(null);
  const [sortBy, setSortBy] = useState<'newest' | 'oldest' | 'highest' | 'lowest'>('newest');

  const {
    reviews,
    stats,
    isLoading,
    refetch,
    respondToReview,
    isResponding,
  } = useProviderReviews();

  const onRefresh = async () => {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  };

  const getFilteredAndSortedReviews = () => {
    let filtered = reviews ? [...reviews] : [];

    // Apply rating filter
    if (filterRating) {
      filtered = filtered.filter(r => Math.floor(r.rating) === filterRating);
    }

    // Apply sorting
    filtered.sort((a, b) => {
      switch (sortBy) {
        case 'newest':
          return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
        case 'oldest':
          return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
        case 'highest':
          return b.rating - a.rating;
        case 'lowest':
          return a.rating - b.rating;
        default:
          return 0;
      }
    });

    return filtered;
  };

  const handleRespond = (review: CustomerReview) => {
    setSelectedReview(review);
    setResponseText(review.response?.message || '');
    setShowResponseModal(true);
  };

  const handleSubmitResponse = async () => {
    if (!selectedReview || !responseText.trim()) return;

    try {
      await respondToReview.mutateAsync({
        reviewId: selectedReview.id,
        message: responseText.trim(),
      });
      setShowResponseModal(false);
      setResponseText('');
      setSelectedReview(null);
      Alert.alert(t('common.success', 'Success'), t('reviews.responsePosted', 'Your response has been posted'));
    } catch (error) {
      Alert.alert(t('common.error', 'Error'), t('providerRequests.startError', 'Failed to post response'));
    }
  };

  const renderHeader = () => (
    <View style={styles.header}>
      <View style={styles.headerTop}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={colors.surface} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{t('reviews.title', 'Reviews & Ratings')}</Text>
        <View style={{ width: 24 }} />
      </View>
    </View>
  );

  const renderRatingSummary = () => (
    <View style={styles.ratingSummary}>
      <View style={styles.overallRating}>
        <Text style={styles.ratingValue}>{stats?.averageRating?.toFixed(1) || '0.0'}</Text>
        <View style={styles.starsContainer}>
          {[1, 2, 3, 4, 5].map((star) => (
            <Ionicons
              key={star}
              name={star <= Math.floor(stats?.averageRating || 0) ? 'star' : 'star-outline'}
              size={20}
              color={colors.warning}
            />
          ))}
        </View>
        <Text style={styles.totalReviews}>{t('reviews.basedOn', 'Based on {{count}} reviews').replace('{{count}}', (stats?.total || 0).toString())}</Text>
      </View>

      <View style={styles.ratingDistribution}>
  {RATING_DISTRIBUTION.map(({ stars, label }) => {
    const distribution = stats?.distribution as { [key: number]: number } | undefined;
    const count = distribution?.[stars] || 0;
    const percentage = stats?.total ? (count / stats.total) * 100 : 0;

    return (
      <TouchableOpacity
        key={stars}
         style={styles.distributionRow}
        onPress={() => setFilterRating(filterRating === stars ? null : stars)}
      >
        <Text style={styles.distributionLabel}>{stars} {t('reviews.star', 'star')}</Text>
        <View style={styles.progressBarContainer}>
          <View 
            style={[
              styles.progressBar,
              { width: `${percentage}%` },
              filterRating === stars && styles.progressBarActive,
            ]} 
          />
        </View>
      </TouchableOpacity>
    );
  })}
</View>

      <View style={styles.sortContainer}>
        <Text style={styles.sortLabel}>{t('reviews.sortBy', 'Sort by:')}</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          {(['newest', 'oldest', 'highest', 'lowest'] as const).map((option) => (
            <TouchableOpacity
              key={option}
              style={[
                styles.sortChip,
                sortBy === option && styles.sortChipActive,
              ]}
              onPress={() => setSortBy(option)}
            >
              <Text style={[
                styles.sortChipText,
                sortBy === option && styles.sortChipTextActive,
              ]}>
                {t(`reviews.sortOptions.${option}`, option.charAt(0).toUpperCase() + option.slice(1))}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>
    </View>
  );

  const renderCriteriaRatings = (criteria?: any) => {
    if (!criteria) return null;

    return (
      <View style={styles.criteriaContainer}>
        {[
          { label: t('reviews.criteria.punctuality', 'Punctuality'), value: criteria.punctuality },
          { label: t('reviews.criteria.quality', 'Quality'), value: criteria.quality },
          { label: t('reviews.criteria.professionalism', 'Professionalism'), value: criteria.professionalism },
          { label: t('reviews.criteria.communication', 'Communication'), value: criteria.communication },
          { label: t('reviews.criteria.valueForMoney', 'Value for Money'), value: criteria.valueForMoney },
        ].map(({ label, value }) => (
          <View key={label} style={styles.criteriaRow}>
            <Text style={styles.criteriaLabel}>{label}</Text>
            <View style={styles.criteriaStars}>
              {[1, 2, 3, 4, 5].map((star) => (
                <Ionicons key={star} name={star <= value ? 'star' : 'star-outline'} size={12} color={colors.warning} />
              ))}
            </View>
          </View>
        ))}
      </View>
    );
  };

  const renderReviewCard = ({ item }: { item: CustomerReview }) => (
    <View style={styles.reviewCard}>
      <View style={styles.reviewHeader}>
        <View style={styles.reviewerInfo}>
          <Image
            source={{ uri: item.customerImage || 'https://via.placeholder.com/40' }}
            style={styles.reviewerImage}
          />
          <View>
            <Text style={styles.reviewerName}>{item.customerName}</Text>
            <Text style={styles.reviewDate}>{formatTimeAgo(item.createdAt)}</Text>
          </View>
        </View>
        
        <View style={styles.ratingBadge}>
          <Text style={styles.ratingBadgeText}>{item.rating.toFixed(1)}</Text>
          <Ionicons name="star" size={12} color={colors.warning} />
        </View>
      </View>

      {item.criteriaRatings && renderCriteriaRatings(item.criteriaRatings)}

      <Text style={styles.reviewComment}>{item.comment}</Text>

      {item.images && item.images.length > 0 && (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.reviewImages}>
          {item.images.map((uri, index) => (
            <TouchableOpacity key={index}>
              <Image source={{ uri }} style={styles.reviewImage} />
            </TouchableOpacity>
          ))}
        </ScrollView>
      )}

      {item.response ? (
        <View style={styles.responseContainer}>
          <View style={styles.responseHeader}>
            <Ionicons name="chatbubble" size={14} color={colors.primary} />
            <Text style={styles.responseTitle}>{t('reviews.yourResponse', 'Your response')}</Text>
            <Text style={styles.responseDate}>{formatTimeAgo(item.response.createdAt)}</Text>
          </View>
          <Text style={styles.responseText}>{item.response.message}</Text>
        </View>
      ) : (
        <TouchableOpacity style={styles.respondButton} onPress={() => handleRespond(item)}>
          <Ionicons name="chatbubble-outline" size={16} color={colors.primary} />
          <Text style={styles.respondButtonText}>{t('reviews.respond', 'Respond to this review')}</Text>
        </TouchableOpacity>
      )}

      <View style={styles.reviewFooter}>
        <TouchableOpacity style={styles.helpfulButton}>
          <Ionicons name="thumbs-up-outline" size={14} color={colors.text.secondary} />
        </TouchableOpacity>
        <TouchableOpacity style={styles.shareButton}>
          <Ionicons name="share-outline" size={14} color={colors.text.secondary} />
        </TouchableOpacity>
      </View>
    </View>
  );

  const renderResponseModal = () => (
    <Modal
      visible={showResponseModal}
      animationType="slide"
      transparent
      onRequestClose={() => setShowResponseModal(false)}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>{t('reviews.respondToReview', 'Respond to Review')}</Text>
            <TouchableOpacity onPress={() => setShowResponseModal(false)}>
              <Ionicons name="close" size={24} color={colors.text.primary} />
            </TouchableOpacity>
          </View>

          {selectedReview && (
            <>
              <View style={styles.modalReviewPreview}>
                <View style={styles.modalReviewHeader}>
                  <Image
                    source={{ uri: selectedReview.customerImage || 'https://via.placeholder.com/30' }}
                    style={styles.modalReviewerImage}
                  />
                  <View>
                    <Text style={styles.modalReviewerName}>{selectedReview.customerName}</Text>
                    <View style={styles.modalRating}>
                      <Text style={styles.modalRatingValue}>{selectedReview.rating.toFixed(1)}</Text>
                      <Ionicons name="star" size={12} color={colors.warning} />
                    </View>
                  </View>
                </View>
                <Text style={styles.modalReviewComment}>{selectedReview.comment}</Text>
              </View>

              <TextInput
                style={styles.modalInput}
                placeholder={t('reviews.writeResponse', 'Write your response...')}
                placeholderTextColor={colors.text.secondary}
                value={responseText}
                onChangeText={setResponseText}
                multiline
                numberOfLines={6}
                textAlignVertical="top"
              />

              <View style={styles.modalActions}>
                <TouchableOpacity
                  style={styles.modalCancelButton}
                  onPress={() => setShowResponseModal(false)}
                >
                  <Text style={styles.modalCancelText}>{t('common.cancel', 'Cancel')}</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[
                    styles.modalSubmitButton,
                    (!responseText.trim() || isResponding) && styles.modalSubmitDisabled,
                  ]}
                  onPress={handleSubmitResponse}
                  disabled={!responseText.trim() || isResponding}
                >
                  {isResponding ? (
                    <ActivityIndicator size="small" color={colors.surface} />
                  ) : (
                    <Text style={styles.modalSubmitText}>{t('reviews.postResponse', 'Post Response')}</Text>
                  )}
                </TouchableOpacity>
              </View>
            </>
          )}
        </View>
      </View>
    </Modal>
  );

  const renderEmptyState = () => (
    <EmptyState
      icon="star-outline"
      title={t('reviews.noReviews', 'No reviews yet')}
      message={t('reviews.noReviewsMsg', "When customers review your services, they'll appear here")}
    />
  );

  const filteredReviews = getFilteredAndSortedReviews();

  if (isLoading && !refreshing) {
    return <LoadingSpinner fullScreen />;
  }

  return (
    <View style={styles.container}>
      <FlatList
        data={filteredReviews}
        renderItem={renderReviewCard}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContainer}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        ListHeaderComponent={
          <>
            {renderHeader()}
            {renderRatingSummary()}
          </>
        }
        ListEmptyComponent={renderEmptyState}
        ListFooterComponent={<View style={styles.bottomPadding} />}
        showsVerticalScrollIndicator={false}
      />

      {renderResponseModal()}
    </View>
  );
}

const getStyles = (colors: ThemeColors, isDark: boolean) => StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  header: { backgroundColor: colors.primary, paddingTop: 100, paddingBottom: 30, paddingHorizontal: 20, borderBottomLeftRadius: 30, borderBottomRightRadius: 30, marginBottom: 20 },
  headerTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  backButton: { padding: 4 },
  headerTitle: { fontSize: 20, fontWeight: '600', color: colors.surface },
  ratingSummary: { backgroundColor: colors.surface, marginHorizontal: 20, marginTop: -20, borderRadius: 20, padding: 20, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.1, shadowRadius: 8, elevation: 4 },
  overallRating: { alignItems: 'center', marginBottom: 24 },
  ratingValue: { fontSize: 48, fontWeight: 'bold', color: colors.text.primary, marginBottom: 8 },
  starsContainer: { flexDirection: 'row', marginBottom: 8, gap: 4 },
  totalReviews: { fontSize: 14, color: colors.text.secondary },
  ratingDistribution: { marginBottom: 24 },
  distributionRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 8, gap: 8 },
  distributionLabel: { fontSize: 12, color: colors.text.secondary, width: 45 },
  progressBarContainer: { flex: 1, height: 8, backgroundColor: colors.background, borderRadius: 4, overflow: 'hidden' },
  progressBar: { height: '100%', backgroundColor: colors.warning + '40' },
  progressBarActive: { backgroundColor: colors.warning },
  distributionCount: { fontSize: 12, color: colors.text.secondary, width: 30, textAlign: 'right' },
  sortContainer: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  sortLabel: { fontSize: 13, color: colors.text.secondary },
  sortChip: { paddingHorizontal: 14, paddingVertical: 6, backgroundColor: colors.background, borderRadius: 16, marginRight: 8, borderWidth: 1, borderColor: colors.border },
  sortChipActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  sortChipText: { fontSize: 12, color: colors.text.secondary },
  sortChipTextActive: { color: colors.surface },
  listContainer: { flexGrow: 1 },
  reviewCard: { backgroundColor: colors.surface, marginHorizontal: 20, marginBottom: 12, padding: 16, borderRadius: 16, borderWidth: 1, borderColor: colors.border },
  reviewHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  reviewerInfo: { flexDirection: 'row', alignItems: 'center' },
  reviewerImage: { width: 40, height: 40, borderRadius: 20, marginRight: 12 },
  reviewerName: { fontSize: 15, fontWeight: '600', color: colors.text.primary, marginBottom: 2 },
  reviewDate: { fontSize: 11, color: colors.text.secondary },
  ratingBadge: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.warning + '20', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 12, gap: 4 },
  ratingBadgeText: { fontSize: 12, fontWeight: '600', color: colors.warning },
  criteriaContainer: { backgroundColor: colors.background, borderRadius: 12, padding: 12, marginBottom: 12 },
  criteriaRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 },
  criteriaLabel: { fontSize: 12, color: colors.text.secondary },
  criteriaStars: { flexDirection: 'row', gap: 2 },
  reviewComment: { fontSize: 14, color: colors.text.primary, lineHeight: 20, marginBottom: 12 },
  reviewImages: { flexDirection: 'row', marginBottom: 12 },
  reviewImage: { width: 80, height: 80, borderRadius: 8, marginRight: 8, borderWidth: 1, borderColor: colors.border },
  responseContainer: { backgroundColor: colors.primary + '08', borderRadius: 12, padding: 12, marginBottom: 12, borderWidth: 1, borderColor: colors.primary + '20' },
  responseHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 6, gap: 6 },
  responseTitle: { fontSize: 12, fontWeight: '500', color: colors.primary },
  responseDate: { fontSize: 10, color: colors.text.secondary, marginLeft: 'auto' },
  responseText: { fontSize: 13, color: colors.text.primary, lineHeight: 18 },
  respondButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: colors.primary + '10', paddingVertical: 10, borderRadius: 12, marginBottom: 12, gap: 6, borderWidth: 1, borderColor: colors.primary + '30', borderStyle: 'dashed' },
  respondButtonText: { fontSize: 13, color: colors.primary, fontWeight: '500' },
  reviewFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingTop: 12, borderTopWidth: 1, borderTopColor: colors.border },
  helpfulButton: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  helpfulText: { fontSize: 12, color: colors.text.secondary },
  shareButton: { padding: 4 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalContent: { backgroundColor: colors.surface, borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 20, maxHeight: '80%' },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  modalTitle: { fontSize: 18, fontWeight: '600', color: colors.text.primary },
  modalReviewPreview: { backgroundColor: colors.background, borderRadius: 12, padding: 16, marginBottom: 20 },
  modalReviewHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
  modalReviewerImage: { width: 30, height: 30, borderRadius: 15, marginRight: 10 },
  modalReviewerName: { fontSize: 14, fontWeight: '500', color: colors.text.primary, marginBottom: 2 },
  modalRating: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  modalRatingValue: { fontSize: 12, color: colors.text.secondary },
  modalReviewComment: { fontSize: 13, color: colors.text.primary, lineHeight: 18 },
  modalInput: { backgroundColor: colors.background, borderRadius: 12, padding: 16, fontSize: 14, color: colors.text.primary, minHeight: 120, borderWidth: 1, borderColor: colors.border, marginBottom: 20, textAlignVertical: 'top' },
  modalActions: { flexDirection: 'row', justifyContent: 'flex-end', gap: 12 },
  modalCancelButton: { paddingVertical: 12, paddingHorizontal: 20, borderRadius: 12, borderWidth: 1, borderColor: colors.border },
  modalCancelText: { fontSize: 14, color: colors.text.secondary, fontWeight: '500' },
  modalSubmitButton: { backgroundColor: colors.primary, paddingVertical: 12, paddingHorizontal: 24, borderRadius: 12 },
  modalSubmitDisabled: { opacity: 0.5 },
  modalSubmitText: { fontSize: 14, color: colors.surface, fontWeight: '600' },
  bottomPadding: { height: 40 },
});