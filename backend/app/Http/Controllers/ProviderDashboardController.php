<?php

namespace App\Http\Controllers;

use App\Models\ServiceProvider;
use App\Models\Service;
use App\Models\Transaction;
use App\Models\Booking;
use App\Models\Review;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;
use Carbon\Carbon;
use Illuminate\Support\Facades\DB;

class ProviderDashboardController extends Controller
{
    /**
     * Get statistics for the authenticated provider.
     */
    public function getStats(Request $request)
    {
        try {
            $providerID = $request->query('providerID');

            if (!$providerID) {
                return response()->json([
                    'success' => false,
                    'message' => 'Provider ID is required'
                ], 400);
            }

            $provider = ServiceProvider::find($providerID);
            if (!$provider) {
                return response()->json(['success' => false, 'message' => 'Provider not found'], 404);
            }

            $today = Carbon::today();
            $startOfWeek = Carbon::now()->startOfWeek();

            // Count pending requests
            $pendingRequests = Booking::where('providerID', $providerID)
                ->where('status', 'pending')
                ->count();

            // Count today's jobs (accepted or in-progress)
            $todayJobs = Booking::where('providerID', $providerID)
                ->whereDate('scheduledDate', $today)
                ->whereIn('status', ['accepted', 'in_progress'])
                ->count();

            // Calculate weekly earnings (sum of netAmount from transactions this week)
            $weeklyEarnings = Transaction::whereHas('booking', function($query) use ($providerID) {
                    $query->where('providerID', $providerID);
                })
                ->where('created_at', '>=', $startOfWeek)
                ->sum('netAmount');

            // Calculate average rating
            $avgRating = Review::whereHas('booking', function($query) use ($providerID) {
                    $query->where('providerID', $providerID);
                })
                ->avg('rating') ?: $provider->rating ?: 5.0;

            // Jobs completion rate (completed / total jobs that passed the scheduled date)
            $totalPastJobs = Booking::where('providerID', $providerID)
                ->where('scheduledDate', '<', Carbon::now())
                ->whereNotIn('status', ['pending', 'cancelled'])
                ->count();
            
            $completedJobsCount = Booking::where('providerID', $providerID)
                ->where('status', 'completed')
                ->count();

            $completionRate = $totalPastJobs > 0 ? ($completedJobsCount / $totalPastJobs) * 100 : 100;

            return response()->json([
                'success' => true,
                'data' => [
                    'pendingRequests' => $pendingRequests,
                    'todayJobs' => $todayJobs,
                    'weeklyEarnings' => (float)$weeklyEarnings,
                    'rating' => round((float)$avgRating, 1),
                    'completionRate' => round($completionRate),
                    'responseRate' => 100 // Mocked for now as we don't track message responses yet
                ]
            ]);
        } catch (\Exception $e) {
            Log::error("Provider Dashboard Stats Error: " . $e->getMessage());
            return response()->json([
                'success' => false,
                'message' => 'Failed to fetch dashboard stats: ' . $e->getMessage()
            ], 500);
        }
    }

    /**
     * Get today's schedule for the provider.
     */
    public function getTodaySchedule(Request $request)
    {
        try {
            $providerID = $request->query('providerID');
            if (!$providerID) {
                return response()->json(['success' => false, 'message' => 'Provider ID required'], 400);
            }

            $today = Carbon::today();
            
            $bookings = Booking::with(['customer', 'service'])
                ->where('providerID', $providerID)
                ->whereDate('scheduledDate', $today)
                ->whereIn('status', ['accepted', 'in_progress'])
                ->orderBy('scheduledDate', 'asc')
                ->get();

            $formattedBookings = $bookings->map(function($booking) {
                return [
                    'id' => (string)$booking->bookingID,
                    'customerName' => $booking->customer->fullname ?? $booking->customer->name ?? 'Customer',
                    'serviceName' => $booking->service->title ?? 'Service',
                    'status' => $booking->status,
                    'scheduledDate' => $booking->scheduledDate->format('Y-m-d'),
                    'scheduledTime' => $booking->scheduledDate->format('h:i A'),
                    'customerAddress' => $booking->notes ? explode("\n", $booking->notes)[0] : 'No address provided',
                    'estimatedPrice' => (float)$booking->agreed_price,
                    'customerImage' => $booking->customer->profilePicture ?? 'https://via.placeholder.com/40'
                ];
            });

            return response()->json([
                'success' => true,
                'data' => $formattedBookings
            ]);
        } catch (\Exception $e) {
            return response()->json(['success' => false, 'message' => $e->getMessage()], 500);
        }
    }

    /**
     * Get earnings summary for the provider.
     */
    public function getEarningsSummary(Request $request)
    {
        try {
            $providerID = $request->query('providerID');
            if (!$providerID) {
                return response()->json(['success' => false, 'message' => 'Provider ID required'], 400);
            }

            $currentMonth = Carbon::now()->month;
            $currentYear = Carbon::now()->year;
            $startOfWeek = Carbon::now()->startOfWeek();
            $lastMonth = Carbon::now()->subMonth();

            $totalEarnings = Transaction::whereHas('booking', function($q) use ($providerID) {
                $q->where('providerID', $providerID);
            })->sum('netAmount');

            $thisMonthEarnings = Transaction::whereHas('booking', function($q) use ($providerID) {
                $q->where('providerID', $providerID);
            })->whereMonth('created_at', $currentMonth)->whereYear('created_at', $currentYear)->sum('netAmount');

            $thisWeekEarnings = Transaction::whereHas('booking', function($q) use ($providerID) {
                $q->where('providerID', $providerID);
            })->where('created_at', '>=', $startOfWeek)->sum('netAmount');

            $lastMonthEarnings = Transaction::whereHas('booking', function($q) use ($providerID) {
                $q->where('providerID', $providerID);
            })->whereMonth('created_at', $lastMonth->month)->whereYear('created_at', $lastMonth->year)->sum('netAmount');

            $completedJobsCount = Booking::where('providerID', $providerID)
                ->where('status', 'completed')
                ->count();

            return response()->json([
                'success' => true,
                'data' => [
                    'totalEarnings' => (float)$totalEarnings,
                    'thisMonth' => (float)$thisMonthEarnings,
                    'thisWeek' => (float)$thisWeekEarnings,
                    'lastMonth' => (float)$lastMonthEarnings,
                    'availableForWithdrawal' => (float)$totalEarnings, // Assuming all is available for now
                    'pendingClearance' => 0.0,
                    'completedJobs' => $completedJobsCount
                ]
            ]);
        } catch (\Exception $e) {
            return response()->json(['success' => false, 'message' => $e->getMessage()], 500);
        }
    }

    /**
     * Get service requests for the provider.
     */
    public function getRequests(Request $request)
    {
        try {
            $providerID = $request->query('providerID');
            $status = $request->query('status', 'pending');

            if (!$providerID) {
                return response()->json(['success' => false, 'message' => 'Provider ID required'], 400);
            }

            $bookings = Booking::with(['customer', 'service'])
                ->where('providerID', $providerID)
                ->when($status, function($query) use ($status) {
                    $query->where('status', $status);
                })
                ->orderBy('created_at', 'desc')
                ->get();

            $formattedRequests = $bookings->map(function($booking) {
                return [
                    'id' => (string)$booking->bookingID,
                    'customerName' => $booking->customer->fullname ?? $booking->customer->name ?? 'Customer',
                    'serviceName' => $booking->service->title ?? 'Service',
                    'status' => $booking->status,
                    'scheduledDate' => $booking->scheduledDate ? $booking->scheduledDate->format('Y-m-d') : null,
                    'scheduledTime' => $booking->scheduledDate ? $booking->scheduledDate->format('h:i A') : null,
                    'description' => $booking->notes ?? '',
                    'address' => $booking->notes ? explode("\n", $booking->notes)[0] : 'No address provided'
                ];
            });

            return response()->json([
                'success' => true,
                'data' => $formattedRequests
            ]);
        } catch (\Exception $e) {
            return response()->json(['success' => false, 'message' => $e->getMessage()], 500);
        }
    }

    /**
     * Get reviews for the provider.
     */
    public function getReviews(Request $request)
    {
        try {
            $providerID = $request->query('providerID');
            if (!$providerID) {
                return response()->json(['success' => false, 'message' => 'Provider ID required'], 400);
            }

            $perPage = $request->query('per_page', 10);

            $reviews = Review::whereHas('booking', function($query) use ($providerID) {
                    $query->where('providerID', $providerID);
                })
                ->with('booking.customer')
                ->orderBy('created_at', 'desc')
                ->paginate($perPage);

            $formattedReviews = collect($reviews->items())->map(function($review) {
                return [
                    'id' => (string)$review->reviewID,
                    'customerName' => $review->booking->customer->fullname ?? $review->booking->customer->name ?? 'Anonymous',
                    'rating' => $review->rating,
                    'comment' => $review->comment,
                    'date' => $review->created_at->format('Y-m-d')
                ];
            });

            $averageRating = Review::whereHas('booking', function($query) use ($providerID) {
                    $query->where('providerID', $providerID);
                })->avg('rating');

            return response()->json([
                'success' => true,
                'data' => [
                    'reviews' => $formattedReviews,
                    'averageRating' => round((float)$averageRating, 1) ?: 5.0,
                    'total' => $reviews->total()
                ],
                'pagination' => [
                    'current_page' => $reviews->currentPage(),
                    'last_page' => $reviews->lastPage(),
                    'per_page' => $reviews->perPage(),
                    'total' => $reviews->total()
                ]
            ]);
        } catch (\Exception $e) {
            return response()->json(['success' => false, 'message' => $e->getMessage()], 500);
        }
    }
}
