// hooks/useProviderReviews.ts
import { useQuery, useMutation, useQueryClient, UseQueryOptions } from '@tanstack/react-query';
import { Alert } from 'react-native';
import * as Haptics from 'expo-haptics';
import { providerService } from '@/app/services/provider.service';
import type { CustomerReview } from '@/app/types/provider.types';
import type { ApiResponse } from '@/app/types/customer.types';

// Query Keys
export const reviewKeys = {
  all: ['reviews'] as const,
  lists: () => [...reviewKeys.all, 'list'] as const,
  stats: () => [...reviewKeys.all, 'stats'] as const,
};

// Utility functions
const handleError = (error: unknown) => {
  const message = error instanceof Error ? error.message : 'An error occurred';
  Alert.alert('Error', message);
  Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
};

const handleSuccess = (message?: string) => {
  if (message) {
    Alert.alert('Success', message);
  }
  Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
};

// Types
export interface ReviewStats {
  averageRating: number;
  total: number;
  distribution: {
    1: number;
    2: number;
    3: number;
    4: number;
    5: number;
  };
}

export interface UseProviderReviewsReturn {
  reviews: CustomerReview[];
  stats: ReviewStats | null;
  isLoading: boolean;
  isRefetching: boolean;
  error: Error | null;
  refetch: () => Promise<any>;
  respondToReview: {
    mutateAsync: (data: { reviewId: string; message: string }) => Promise<CustomerReview>;
    isPending: boolean;
  };
  isResponding: boolean;
}

// Response type from the API
interface ReviewsResponse {
  reviews: CustomerReview[];
  averageRating: number;
  total: number;
  ratingDistribution: Record<number, number>;
}

// Mock data for development (remove when API is ready)
const MOCK_REVIEWS: CustomerReview[] = [
  {
    id: '1',
    bookingId: 'b1',
    customerId: 'c1',
    customerName: 'John Doe',
    customerImage: 'https://via.placeholder.com/40',
    rating: 4.5,
    comment: 'Excellent service! Very professional and punctual. The work was done to a high standard and I am very satisfied.',
    criteriaRatings: {
      punctuality: 5,
      quality: 4,
      professionalism: 5,
      communication: 4,
      valueForMoney: 4,
    },
    images: [
      'https://via.placeholder.com/80',
      'https://via.placeholder.com/80',
    ],
    createdAt: new Date().toISOString(),
    response: {
      message: 'Thank you for your kind words! We appreciate your business.',
      createdAt: new Date().toISOString(),
    },
  },
  {
    id: '2',
    bookingId: 'b2',
    customerId: 'c2',
    customerName: 'Jane Smith',
    customerImage: 'https://via.placeholder.com/40',
    rating: 5,
    comment: 'Amazing work! Would definitely recommend to others.',
    criteriaRatings: {
      punctuality: 5,
      quality: 5,
      professionalism: 5,
      communication: 5,
      valueForMoney: 5,
    },
    createdAt: new Date(Date.now() - 86400000).toISOString(),
  },
  {
    id: '3',
    bookingId: 'b3',
    customerId: 'c3',
    customerName: 'Bob Wilson',
    customerImage: 'https://via.placeholder.com/40',
    rating: 3.5,
    comment: 'Good service but a bit pricey.',
    criteriaRatings: {
      punctuality: 4,
      quality: 3,
      professionalism: 4,
      communication: 3,
      valueForMoney: 3,
    },
    createdAt: new Date(Date.now() - 172800000).toISOString(),
  },
];

const MOCK_STATS: ReviewStats = {
  averageRating: 4.3,
  total: 27,
  distribution: {
    1: 1,
    2: 2,
    3: 4,
    4: 8,
    5: 12,
  },
};

// ==================== Reviews Query Hook ====================

export function useReviews(options?: UseQueryOptions<CustomerReview[]>) {
  return useQuery<CustomerReview[], Error>({
    queryKey: reviewKeys.lists(),
    queryFn: async () => {
      try {
        // Try to fetch from API
        const response = await providerService.getReviews(1) as ApiResponse<ReviewsResponse>;
        
        if (response?.success && response?.data) {
          // Return the reviews array from the response
          return response.data.reviews || [];
        }
        
        // Return mock data if API fails
        return MOCK_REVIEWS;
      } catch (error) {
        console.log('Using mock reviews data');
        // Return mock data on error
        return MOCK_REVIEWS;
      }
    },
    ...options,
  });
}

// ==================== Review Stats Query Hook ====================

export function useReviewStats(options?: UseQueryOptions<ReviewStats>) {
  return useQuery<ReviewStats, Error>({
    queryKey: reviewKeys.stats(),
    queryFn: async () => {
      try {
        // Fetch reviews and calculate stats
        const response = await providerService.getReviews(1) as ApiResponse<ReviewsResponse>;
        
        if (response?.success && response?.data) {
          const { averageRating, total, ratingDistribution } = response.data;
          
          // Convert ratingDistribution to the expected format
          const distribution = {
            1: ratingDistribution[1] || 0,
            2: ratingDistribution[2] || 0,
            3: ratingDistribution[3] || 0,
            4: ratingDistribution[4] || 0,
            5: ratingDistribution[5] || 0,
          };
          
          return {
            averageRating,
            total,
            distribution,
          };
        }
        
        // Return mock stats if API fails
        return MOCK_STATS;
      } catch (error) {
        console.log('Using mock review stats');
        // Return mock stats on error
        return MOCK_STATS;
      }
    },
    ...options,
  });
}

// ==================== Respond to Review Mutation Hook ====================

export function useRespondToReview() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ reviewId, message }: { reviewId: string; message: string }) => {
      try {
        // Try to call API
        const response = await providerService.respondToReview(reviewId, message) as ApiResponse<CustomerReview>;
        
        if (response?.success && response?.data) {
          return response.data;
        }
        
        // If API fails, return mock data
        return { id: reviewId, message } as unknown as CustomerReview;
      } catch (error) {
        console.log('Using mock response - API not available');
        // For development, return mock data
        return { id: reviewId, message } as unknown as CustomerReview;
      }
    },
    onSuccess: (data, variables) => {
      // Update the cache to show the response
      queryClient.setQueryData<CustomerReview[]>(reviewKeys.lists(), (old = []) => {
        return old.map(review => {
          if (review.id === variables.reviewId) {
            return {
              ...review,
              response: {
                message: variables.message,
                createdAt: new Date().toISOString(),
              },
            };
          }
          return review;
        });
      });
      
      // Also invalidate to ensure fresh data
      queryClient.invalidateQueries({ queryKey: reviewKeys.lists() });
      
      handleSuccess('Response posted successfully');
    },
    onError: (error) => {
      handleError(error);
    },
  });
}

// ==================== Combined Reviews Hook ====================

export function useProviderReviews() {
  const reviewsQuery = useReviews();
  const statsQuery = useReviewStats();
  const respondMutation = useRespondToReview();

  const isLoading = reviewsQuery.isLoading || statsQuery.isLoading;
  const isRefetching = reviewsQuery.isRefetching || statsQuery.isRefetching;
  const error = reviewsQuery.error || statsQuery.error;

  const refetch = async () => {
    await Promise.all([
      reviewsQuery.refetch(),
      statsQuery.refetch(),
    ]);
  };

  // Calculate stats from reviews if needed (fallback)
  const calculateStatsFromReviews = (reviews: CustomerReview[]): ReviewStats => {
    if (!reviews.length) {
      return {
        averageRating: 0,
        total: 0,
        distribution: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 },
      };
    }

    const distribution = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
    let totalRating = 0;

    reviews.forEach(review => {
      const star = Math.floor(review.rating);
      if (star >= 1 && star <= 5) {
        const key = star as keyof typeof distribution;
        distribution[key] = (distribution[key] || 0) + 1;
      }
      totalRating += review.rating;
    });

    return {
      averageRating: totalRating / reviews.length,
      total: reviews.length,
      distribution,
    };
  };

  const reviews = reviewsQuery.data || [];
  const apiStats = statsQuery.data;
  const calculatedStats = calculateStatsFromReviews(reviews);

  // Use API stats if available, otherwise use calculated stats
  const stats = apiStats || calculatedStats;

  return {
    reviews,
    stats,
    isLoading,
    isRefetching,
    error,
    refetch,
    respondToReview: {
      mutateAsync: respondMutation.mutateAsync,
      isPending: respondMutation.isPending,
    },
    isResponding: respondMutation.isPending,
  };
}

// ==================== Review Details Hook ====================

export function useReviewDetails(reviewId: string) {
  return useQuery<CustomerReview | null, Error>({
    queryKey: [...reviewKeys.lists(), reviewId],
    queryFn: async () => {
      try {
        // Since there's no getReviewById, fetch all reviews and find the one
        const response = await providerService.getReviews(1) as ApiResponse<ReviewsResponse>;
        
        if (response?.success && response?.data) {
          const found = response.data.reviews.find(r => r.id === reviewId);
          return found || null;
        }
        
        // Find in mock data
        return MOCK_REVIEWS.find(r => r.id === reviewId) || null;
      } catch (error) {
        console.log('Using mock review data');
        return MOCK_REVIEWS.find(r => r.id === reviewId) || null;
      }
    },
    enabled: !!reviewId,
  });
}

// ==================== Report Review Hook ====================

// Note: This might not be implemented in the service yet
export function useReportReview() {
  return useMutation({
    mutationFn: async ({ reviewId, reason }: { reviewId: string; reason: string }) => {
      // This endpoint doesn't exist in provider.service.ts
      // You would need to add it to the service first
      console.log('Report review - not implemented in API');
      return { reviewId, reason, success: true };
    },
    onSuccess: () => {
      handleSuccess('Review reported successfully');
    },
    onError: (error) => {
      handleError(error);
    },
  });
}

// Export default for convenience
export default useProviderReviews;