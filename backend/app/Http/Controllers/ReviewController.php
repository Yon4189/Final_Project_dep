<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use App\Models\Review;
use App\Models\Booking;
use App\Models\ServiceProvider;
use Illuminate\Support\Facades\DB;

class ReviewController extends Controller
{
    /**
     * Store a new review for a completed booking
     */
    public function store(Request $request, $bookingID)
    {
        $request->validate([
            'rating' => 'required|integer|min:1|max:5',
            'comment' => 'nullable|string|max:1000',
            'is_anonymous' => 'boolean'
        ]);

            $customer = auth()->guard('customer')->user();
            if (!$customer) {
                return response()->json(['error' => 'Unauthorized'], 401);
            }

            $booking = Booking::where('bookingID', $bookingID)
                ->where('customerID', $customer->customerID)
                ->where(function($query) {
                    $query->where('status', 'completed')
                          ->orWhere('payment_status', 'completed');
                })
                ->first();

        if (!$booking) {
            return response()->json([
                'success' => false,
                'message' => 'Booking not found or not completed'
            ], 404);
        }

        // Check if already reviewed by this customer
        $existingReview = Review::where('bookingID', $bookingID)
            ->where('customerID', $customer->customerID)
            ->first();
        
        if ($existingReview) {
            \Log::info('Duplicate review attempt detected', [
                'bookingID' => $bookingID,
                'customerID' => $customer->customerID,
                'existing_review_id' => $existingReview->reviewID,
                'existing_review_created_at' => $existingReview->created_at
            ]);
            
            return response()->json([
                'success' => false,
                'message' => 'You have already reviewed this booking'
            ], 400);
        }
        
        \Log::info('Creating new review', [
            'bookingID' => $bookingID,
            'customerID' => $customer->customerID,
            'rating' => $request->rating
        ]);
        // Create the review
        $review = Review::create([
            'bookingID' => $bookingID,
            'customerID' => $booking->customerID,
            'providerID' => $booking->providerID,
            'serviceID' => $booking->serviceID,
            'rating' => $request->rating,
            'comment' => $request->comment,
            'is_anonymous' => $request->is_anonymous ?? false
        ]);

        \Log::info('Review created successfully', [
            'reviewID' => $review->reviewID,
            'bookingID' => $bookingID,
            'customerID' => $booking->customerID,
            'providerID' => $booking->providerID,
            'rating' => $request->rating
        ]);

        // Update provider's average rating
        $this->updateProviderRating($booking->providerID);

        // Load relationships for response
        $review->load(['customer', 'service']);

        return response()->json([
            'success' => true,
            'message' => 'Review submitted successfully',
            'data' => $review
        ]);
    }

    /**
     * Get all reviews for a specific provider
     */
    public function providerReviews($providerID)
    {
        $reviews = Review::with(['customer' => function($q) {
                $q->select('customerID', 'full_name', 'profile_photo');
            }, 'service'])
            ->where('providerID', $providerID)
            ->orderBy('created_at', 'desc')
            ->paginate(10);

        // Get provider rating stats
        $stats = Review::where('providerID', $providerID)
            ->selectRaw('AVG(rating) as average_rating, COUNT(*) as total_reviews')
            ->first();

        return response()->json([
            'success' => true,
            'data' => [
                'reviews' => $reviews,
                'stats' => [
                    'average_rating' => round($stats->average_rating ?? 0, 1),
                    'total_reviews' => $stats->total_reviews ?? 0
                ]
            ]
        ]);
    }

    /**
     * Update provider's average rating
     */
    private function updateProviderRating($providerID)
    {
        $stats = Review::where('providerID', $providerID)
            ->selectRaw('AVG(rating) as avg_rating, COUNT(*) as total')
            ->first();

        $provider = ServiceProvider::find($providerID);
        if ($provider) {
            $avg = round($stats->avg_rating ?? 0, 2);
            $total = $stats->total ?? 0;
            
            \Log::info('Updating provider rating', [
                'providerID' => $providerID,
                'old_rating' => $provider->rating,
                'new_rating' => $avg,
                'old_total_reviews' => $provider->total_reviews,
                'new_total_reviews' => $total
            ]);
            
            $provider->average_rating = $avg;
            $provider->rating = $avg;
            $provider->total_reviews = $total;
            $provider->save();
            
            \Log::info('Provider rating updated successfully', [
                'providerID' => $providerID,
                'rating' => $avg,
                'total_reviews' => $total
            ]);
        } else {
            \Log::error('Provider not found for rating update', ['providerID' => $providerID]);
        }
    }
}