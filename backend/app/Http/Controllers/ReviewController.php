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
                ->where('status', 'completed')
                ->first();

        if (!$booking) {
            return response()->json([
                'success' => false,
                'message' => 'Booking not found or not completed'
            ], 404);
        }

        // Check if already reviewed
        $existingReview = Review::where('bookingID', $bookingID)->first();
        if ($existingReview) {
            return response()->json([
                'success' => false,
                'message' => 'This booking has already been reviewed'
            ], 400);
        }
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
            $provider->average_rating = round($stats->avg_rating ?? 0, 2);
            $provider->total_reviews = $stats->total ?? 0;
            $provider->save();
        }
    }
}