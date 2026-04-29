<?php

namespace App\Http\Controllers;

use App\Models\ServiceProvider;
use App\Models\Service;
use App\Models\Transaction;
use App\Models\Booking;
use App\Models\Review;
use App\Models\Wallet;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;
use Carbon\Carbon;
use Illuminate\Support\Facades\DB;
use App\Models\ProviderAvailability;
use Illuminate\Support\Facades\Validator;

class ProviderDashboardController extends Controller
{
    /**
     * Get statistics for the authenticated provider.
     */
    public function getStats(Request $request)
    {
        try {
            $provider = $request->user();
            if (!$provider) {
                return response()->json(['success' => false, 'message' => 'Unauthorized'], 401);
            }
            $providerID = $provider->providerID;

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

            // Count today's jobs (accepted, arrived, or in-progress)
            $todayJobs = Booking::where('providerID', $providerID)
                ->whereDate('scheduledDate', $today)
                ->whereIn('status', ['accepted', 'arrived', 'in_progress', 'waiting_customer_confirmation'])
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
                ->whereIn('status', ['completed', 'service_confirmed', 'waiting_customer_confirmation'])
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
            $provider = $request->user();
            if (!$provider) {
                return response()->json(['success' => false, 'message' => 'Unauthorized'], 401);
            }
            $providerID = $provider->providerID;

            $today = Carbon::today();
            
            $bookings = Booking::with(['customer', 'service'])
                ->where('providerID', $providerID)
                ->whereDate('scheduledDate', $today)
                ->whereIn('status', ['accepted', 'arrived', 'in_progress', 'waiting_customer_confirmation', 'service_confirmed'])
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
            $provider = $request->user();
            if (!$provider) {
                return response()->json(['success' => false, 'message' => 'Unauthorized'], 401);
            }
            $providerID = $provider->providerID;

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
                ->whereIn('status', ['completed', 'service_confirmed', 'waiting_customer_confirmation'])
                ->count();

            // Get actual wallet balance
            $wallet = Wallet::where('providerID', $providerID)->first();
            $availableBalance = $wallet ? (float)$wallet->available_balance : 0.0;
            $pendingBalance = $wallet ? (float)$wallet->pending_balance : 0.0;

            return response()->json([
                'success' => true,
                'data' => [
                    'totalEarnings' => (float)$totalEarnings,
                    'thisMonth' => (float)$thisMonthEarnings,
                    'thisWeek' => (float)$thisWeekEarnings,
                    'lastMonth' => (float)$lastMonthEarnings,
                    'availableForWithdrawal' => $availableBalance, // Use actual wallet balance
                    'pendingClearance' => $pendingBalance, // Use actual pending balance
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
            $provider = $request->user();
            
            if (!$provider) {
                return response()->json(['success' => false, 'message' => 'Unauthorized'], 401);
            }

            $providerID = $provider->providerID;
            $status = $request->query('status');

            $bookings = Booking::with(['customer', 'service', 'service.category', 'payment'])
                ->where('providerID', $providerID)
                ->when($status, function($query) use ($status) {
                    // Special handling for 'accepted' status - show all active jobs
                    if ($status === 'accepted') {
                        $query->whereIn('status', ['accepted', 'arrived', 'in_progress', 'waiting_customer_confirmation', 'service_confirmed']);
                    } else {
                        $query->where('status', $status);
                    }
                })
                ->orderBy('created_at', 'desc')
                ->get();

            $formattedRequests = $bookings->map(function($booking) {
                return [
                    'bookingID' => $booking->bookingID,
                    'id' => $booking->bookingID,
                    'requestNumber' => 'REQ-' . str_pad($booking->bookingID, 6, '0', STR_PAD_LEFT),
                    'status' => $booking->status,
                    
                    // Date and Time
                    'scheduledDate' => $booking->scheduledDate ? $booking->scheduledDate->format('Y-m-d') : null,
                    'scheduledTime' => $booking->scheduledDate ? $booking->scheduledDate->format('H:i') : null,
                    'scheduledDateTime' => $booking->scheduledDate ? $booking->scheduledDate->toISOString() : null,
                    
                    // Price
                    'agreed_price' => (float)$booking->agreed_price,
                    'estimatedPrice' => (float)$booking->agreed_price,
                    
                    // Location
                    'service_address' => $booking->service_address,
                    'customerAddress' => $booking->service_address ?? $booking->address_text,
                    'address_text' => $booking->address_text ?? $booking->service_address,
                    'service_latitude' => $booking->service_latitude ? (float)$booking->service_latitude : null,
                    'service_longitude' => $booking->service_longitude ? (float)$booking->service_longitude : null,
                    'customerLatitude' => $booking->service_latitude ? (float)$booking->service_latitude : null,
                    'customerLongitude' => $booking->service_longitude ? (float)$booking->service_longitude : null,
                    
                    // Notes
                    'notes' => $booking->notes,
                    'description' => $booking->notes,
                    'specialInstructions' => $booking->notes,
                    
                    // Customer Info
                    'customerID' => $booking->customer->customerID ?? null,
                    'customerId' => $booking->customer->customerID ?? null,
                    'customerName' => $booking->customer->fullname ?? 'Unknown',
                    'customerPhone' => $booking->customer->phone ?? null,
                    'customerImage' => $booking->customer->profilePicture ?? null,
                    
                    // Service Info
                    'serviceID' => $booking->service->serviceID ?? null,
                    'serviceName' => $booking->service->title ?? 'Unknown Service',
                    'serviceDescription' => $booking->service->description ?? null,
                    
                    // Payment Status - Add this for frontend
                    'payment_status' => $booking->payment_status,
                    
                    // Timestamps
                    'created_at' => $booking->created_at,
                    'createdAt' => $booking->created_at,
                    'expires_at' => $booking->expires_at,
                    'accepted_at' => $booking->accepted_at,
                    'provider_started_at' => $booking->provider_started_at,
                    'provider_arrived_at' => $booking->provider_arrived_at,
                    'completed_at' => $booking->completed_at,
                    'cancelled_at' => $booking->cancelled_at,
                    
                    // Nested objects for compatibility
                    'customer' => [
                        'id' => $booking->customer->customerID ?? null,
                        'customerId' => $booking->customer->customerID ?? null,
                        'name' => $booking->customer->fullname ?? 'Unknown',
                        'customerName' => $booking->customer->fullname ?? 'Unknown',
                        'phone' => $booking->customer->phone ?? null,
                        'customerPhone' => $booking->customer->phone ?? null,
                        'profilePicture' => $booking->customer->profilePicture ?? null,
                        'customerImage' => $booking->customer->profilePicture ?? null,
                    ],
                    'service' => [
                        'id' => $booking->service->serviceID ?? null,
                        'title' => $booking->service->title ?? 'Unknown Service',
                        'serviceName' => $booking->service->title ?? 'Unknown Service',
                        'description' => $booking->service->description ?? null,
                        'estimatedPrice' => $booking->service->estimatedPrice ?? $booking->agreed_price,
                    ],
                    'payment' => $booking->payment ? [
                        'status' => $booking->payment->status,
                        'amount' => $booking->payment->amount,
                        'paymentID' => $booking->payment->paymentID,
                    ] : null,
                ];
            });

            \Log::info('Provider requests formatted:', [
                'count' => $formattedRequests->count(),
                'sample' => $formattedRequests->first()
            ]);

            return response()->json([
                'success' => true,
                'data' => $formattedRequests
            ]);
        } catch (\Exception $e) {
            \Log::error('Provider getRequests error:', [
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString()
            ]);
            return response()->json(['success' => false, 'message' => $e->getMessage()], 500);
        }
    }

    /**
     * Get reviews for the provider.
     */
    public function getReviews(Request $request)
    {
        try {
            $provider = $request->user();
            if (!$provider) {
                return response()->json(['success' => false, 'message' => 'Unauthorized'], 401);
            }
            $providerID = $provider->providerID;

            $perPage = $request->query('per_page', 100);

            $reviews = Review::where('providerID', $providerID)
                ->with('booking.customer')
                ->orderBy('created_at', 'desc')
                ->paginate($perPage);

            $formattedReviews = collect($reviews->items())->map(function($review) {
                $customer = $review->booking?->customer;
                return [
                    'id'            => (string)$review->reviewID,
                    'bookingId'     => (string)$review->bookingID,
                    'customerId'    => (string)$review->customerID,
                    'customerName'  => $customer->fullname ?? $customer->name ?? 'Anonymous',
                    'customerImage' => $customer->profilePicture ?? $customer->profile_photo ?? null,
                    'rating'        => (float)$review->rating,
                    'comment'       => $review->comment ?? '',
                    'createdAt'     => $review->created_at->toISOString(),
                    'date'          => $review->created_at->format('Y-m-d'),
                ];
            });

            // Calculate average and distribution
            $allRatings = Review::where('providerID', $providerID)->pluck('rating');
            $averageRating = $allRatings->count() ? round($allRatings->avg(), 1) : 0;

            $distribution = [1 => 0, 2 => 0, 3 => 0, 4 => 0, 5 => 0];
            foreach ($allRatings as $r) {
                $star = (int)round($r);
                if ($star >= 1 && $star <= 5) {
                    $distribution[$star]++;
                }
            }

            return response()->json([
                'success' => true,
                'data' => [
                    'reviews'            => $formattedReviews,
                    'averageRating'      => $averageRating,
                    'total'              => $reviews->total(),
                    'ratingDistribution' => $distribution,
                ],
                'pagination' => [
                    'current_page' => $reviews->currentPage(),
                    'last_page'    => $reviews->lastPage(),
                    'per_page'     => $reviews->perPage(),
                    'total'        => $reviews->total(),
                ]
            ]);
        } catch (\Exception $e) {
            return response()->json(['success' => false, 'message' => $e->getMessage()], 500);
        }
    }

    /**
     * Get the provider's weekly schedule configuration.
     */
    public function getSchedule(Request $request)
    {
        try {
            $provider = $request->user();
            if (!$provider) return response()->json(['success' => false, 'message' => 'Unauthorized'], 401);

            $availabilities = ProviderAvailability::where('providerID', $provider->providerID)->get();

            $schedule = [];
            for ($day = 0; $day < 7; $day++) {
                $dayRecord = $availabilities->firstWhere('day_of_week', $day);
                
                $schedule[] = [
                    'day_of_week' => $day,
                    // Strip the seconds from time strings for frontend (e.g. 08:00:00 -> 08:00)
                    'start_time' => $dayRecord ? substr($dayRecord->start_time, 0, 5) : '08:00',
                    'end_time' => $dayRecord ? substr($dayRecord->end_time, 0, 5) : '17:00',
                    'is_active' => $dayRecord ? $dayRecord->is_active : false,
                ];
            }

            return response()->json([
                'success' => true,
                'data' => $schedule
            ]);
        } catch (\Exception $e) {
            return response()->json(['success' => false, 'message' => $e->getMessage()], 500);
        }
    }

    /**
     * Update the provider's weekly schedule.
     */
    public function updateSchedule(Request $request)
    {
        try {
            $provider = $request->user();
            if (!$provider) return response()->json(['success' => false, 'message' => 'Unauthorized'], 401);

            $validator = Validator::make($request->all(), [
                'schedule' => 'required|array|size:7',
                'schedule.*.day_of_week' => 'required|integer|min:0|max:6',
                'schedule.*.is_active' => 'required|boolean',
                'schedule.*.start_time' => 'required|date_format:H:i',
                'schedule.*.end_time' => 'required|date_format:H:i|after:schedule.*.start_time',
            ]);

            if ($validator->fails()) {
                return response()->json([
                    'success' => false,
                    'message' => 'Validation errors',
                    'errors' => $validator->errors()
                ], 422);
            }

            DB::beginTransaction();

            foreach ($request->schedule as $day) {
                ProviderAvailability::updateOrCreate(
                    [
                        'providerID' => $provider->providerID,
                        'day_of_week' => $day['day_of_week']
                    ],
                    [
                        'start_time' => $day['start_time'] . ':00',
                        'end_time' => $day['end_time'] . ':00',
                        'is_active' => $day['is_active']
                    ]
                );
            }

            DB::commit();

            return response()->json([
                'success' => true,
                'message' => 'Schedule updated successfully'
            ]);
        } catch (\Exception $e) {
            DB::rollBack();
            Log::error('Schedule update error: ' . $e->getMessage());
            return response()->json(['success' => false, 'message' => $e->getMessage()], 500);
        }
    }
}
