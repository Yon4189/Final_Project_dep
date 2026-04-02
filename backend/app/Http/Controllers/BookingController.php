<?php
// app/Http/Controllers/BookingController.php

namespace App\Http\Controllers;

use App\Models\Booking;
use App\Models\Service;
use App\Models\ServiceProvider;
use App\Models\Notification;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Validator;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use App\Services\NotificationService;
use App\Models\Payment;
use App\Models\Wallet;
use App\Models\WalletTransaction;

class BookingController extends Controller
{
    /**
     * Customer creates a new booking
     */

    

    protected $notificationService;

    public function __construct(NotificationService $notificationService)
    {
    $this->notificationService = $notificationService;
    }
    public function store(Request $request)
    {
        // Validate input
        $validator = Validator::make($request->all(), [
            'providerID' => 'required|exists:service_providers,providerID,status,approved',
            'serviceID' => 'required|exists:services,serviceID,providerID,' . $request->providerID,
            'scheduledDate' => 'required|date|after:now',
            'agreed_price' => 'required|numeric|min:1',
            'service_address' => 'nullable|string|max:255',
            'service_latitude' => 'required_without:service_address|nullable|numeric|between:-90,90',
            'service_longitude' => 'required_with:service_latitude|nullable|numeric|between:-180,180',
            'notes' => 'nullable|string|max:500',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'message' => 'Validation errors',
                'errors' => $validator->errors()
            ], 422);
        }

        // Verify the service belongs to the provider
        $service = Service::where('serviceID', $request->serviceID)
                         ->where('providerID', $request->providerID)
                         ->first();

        if (!$service) {
            return response()->json([
                'success' => false,
                'message' => 'Invalid service for this provider'
            ], 422);
        }

        try {
            DB::beginTransaction();

            // Create the booking
            $customer = auth()->guard('customer')->user();
            $booking = Booking::create([
                'customerID' => $customer->customerID,
                'providerID' => $request->providerID,
                'serviceID' => $request->serviceID,
                'scheduledDate' => $request->scheduledDate,
                'agreed_price' => $request->agreed_price,
                'service_address' => $request->service_address,
                'service_latitude' => $request->service_latitude,
                'service_longitude' => $request->service_longitude,
                'notes' => $request->notes,
                'status' => 'pending',
                'expires_at' => now()->addHours(24), // 24 hours to respond
            ]);

            // Create notification for provider
            // Create notification for provider using service
            $this->notificationService->toProvider(
                $request->providerID,
                'booking_request',  // or NotificationService::TYPE_BOOKING_REQUEST
                'New Booking Request',
                'You have a new booking request from ' . $customer->fullname,
                [
                    'customer_name' => $customer->fullname,
                    'service_name' => $service->title,
                    'scheduled_date' => $booking->scheduledDate->format('Y-m-d H:i'),
                    'agreed_price' => $booking->agreed_price,
                    'address' => $booking->service_address ?? 'Location pinned on map'
                ],
                $booking->bookingID
            );

            DB::commit();

            // Load relationships for response
            $booking->load(['customer', 'service']);

            return response()->json([
                'success' => true,
                'message' => 'Booking created successfully',
                'data' => [
                    'bookingID' => $booking->bookingID,
                    'status' => $booking->status,
                    'expires_at' => $booking->expires_at,
                    'provider' => [
                        'id' => $booking->providerID,
                        'name' => $booking->provider->fullname ?? null
                    ],
                    'service' => [
                        'id' => $booking->service->serviceID,
                        'title' => $booking->service->title,
                        'price' => $booking->agreed_price
                    ],
                    'scheduledDate' => $booking->scheduledDate,
                    'service_city' => $booking->service_address ?? [
                        'latitude' => $booking->service_latitude,
                        'longitude' => $booking->service_longitude
                    ]
                ]
            ], 201);

        } catch (\Exception $e) {
            DB::rollBack();
            Log::error('Booking creation failed:', ['error' => $e->getMessage()]);
            
            return response()->json([
                'success' => false,
                'message' => 'Failed to create booking: ' . $e->getMessage()
            ], 500);
        }
    }

    /**
     * Provider accepts a booking (with database locking)
     */
    public function accept(Request $request, $bookingId)
    {
        // Ensure provider is authenticated
        $provider = auth()->guard('provider')->user();
        
        if (!$provider) {
            return response()->json([
                'success' => false,
                'message' => 'Unauthorized'
            ], 401);
        }

        try {
            // Use database transaction with row locking
            DB::beginTransaction();

            // Lock the booking row for update to prevent race conditions
            $booking = Booking::where('bookingID', $bookingId)
                        ->where('providerID', $provider->providerID)
                        ->where('status', 'pending')
                        ->lockForUpdate()
                        ->first();

            if (!$booking) {
                DB::rollBack();
                return response()->json([
                    'success' => false,
                    'message' => 'Booking not found or already processed'
                ], 404);
            }

            // Check if booking has expired
            if ($booking->expires_at < now()) {
                $booking->status = 'expired';
                $booking->save();
                DB::commit();
                
                return response()->json([
                    'success' => false,
                    'message' => 'Booking has expired'
                ], 400);
            }

            // Accept the booking
            $booking->status = 'accepted';
            $booking->accepted_at = now();
            $booking->save();

            // Increment provider's accepted jobs counter
            $provider->accepted_jobs = ($provider->accepted_jobs ?? 0) + 1;
            $provider->save();

            // Create notification for customer
            // Create notification for customer using service
            $this->notificationService->toCustomer(
                $booking->customerID,
                'booking_accepted',
                'Booking Accepted',
                'Your booking has been accepted by ' . $provider->fullname,
                [
                    'provider_name' => $provider->fullname,
                    'booking_id' => $booking->bookingID
                ],
                $booking->bookingID
            );
            DB::commit();

            return response()->json([
                'success' => true,
                'message' => 'Booking accepted successfully',
                'data' => [
                    'bookingID' => $booking->bookingID,
                    'status' => $booking->status,
                    'accepted_at' => $booking->accepted_at
                ]
            ]);

        } catch (\Exception $e) {
            DB::rollBack();
            Log::error('Booking acceptance failed:', ['error' => $e->getMessage()]);
            
            return response()->json([
                'success' => false,
                'message' => 'Failed to accept booking: ' . $e->getMessage()
            ], 500);
        }
    }

    /**
     * Provider rejects a booking
     */
    public function reject(Request $request, $bookingId)
    {
        $provider = auth()->guard('provider')->user();

        $validator = Validator::make($request->all(), [
            'reason' => 'nullable|string|max:255' // Optional reason
        ]);

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'errors' => $validator->errors()
            ], 422);
        }

        try {
            DB::beginTransaction();

            $booking = Booking::where('bookingID', $bookingId)
                        ->where('providerID', $provider->providerID)
                        ->where('status', 'pending')
                        ->first();

            if (!$booking) {
                DB::rollBack();
                return response()->json([
                    'success' => false,
                    'message' => 'Booking not found or already processed'
                ], 404);
            }

            // Check if expired
            if ($booking->expires_at < now()) {
                $booking->status = 'expired';
                $booking->save();
                DB::commit();
                
                return response()->json([
                    'success' => false,
                    'message' => 'Booking has already expired'
                ], 400);
            }

            // Reject the booking
            $booking->status = 'rejected';
            $booking->rejected_at = now();
            $booking->rejected_by = 'provider';
            $booking->rejection_reason = $request->reason;
            $booking->save();

            // Create notification for customer using service
            $this->notificationService->toCustomer(
                $booking->customerID,
                'booking_rejected',
                'Booking Rejected',
                'Your booking has been rejected by ' . $provider->fullname,
                [
                    'provider_name' => $provider->fullname,
                    'booking_id' => $booking->bookingID,
                    'reason' => $request->reason
                ],
                $booking->bookingID
            );
            DB::commit();

            return response()->json([
                'success' => true,
                'message' => 'Booking rejected successfully',
                'data' => [
                    'bookingID' => $booking->bookingID,
                    'status' => $booking->status
                ]
            ]);

        } catch (\Exception $e) {
            DB::rollBack();
            Log::error('Booking rejection failed:', ['error' => $e->getMessage()]);
            
            return response()->json([
                'success' => false,
                'message' => 'Failed to reject booking: ' . $e->getMessage()
            ], 500);
        }
    }




        /**
     * Customer confirms service completion
     * 
     * @param Request $request
     * @param int $id Booking ID
     * @return \Illuminate\Http\JsonResponse
     */

    /**
     * Get booking details
     */
    public function show(Request $request, $bookingId)
    {
        // Determine user type by checking guards
        $customer = auth()->guard('customer')->user();
        $provider = auth()->guard('provider')->user();
        
        $user = $customer ?? $provider;
        
        if (!$user) {
            return response()->json([
                'success' => false,
                'message' => 'Unauthorized'
            ], 401);
        }
        
        // Determine if user is customer or provider
        $userType = $customer ? 'customer' : 'provider';
        
        $query = Booking::where('bookingID', $bookingId)
                 ->with(['customer', 'provider', 'service', 'payment']);

        // Ensure user can only view their own bookings
        if ($userType === 'customer') {
            $query->where('customerID', $customer->customerID);
        } else {
            $query->where('providerID', $provider->providerID);
        }

        $booking = $query->first();

        if (!$booking) {
            return response()->json([
                'success' => false,
                'message' => 'Booking not found'
            ], 404);
        }

        return response()->json([
            'success' => true,
            'data' => [
                'bookingID' => $booking->bookingID,
                'id' => $booking->bookingID, // Add id for frontend compatibility
                'requestNumber' => 'REQ-' . str_pad($booking->bookingID, 6, '0', STR_PAD_LEFT),
                'status' => $booking->status,
                'scheduledDate' => $booking->scheduledDate ? $booking->scheduledDate->format('Y-m-d') : null,
                'scheduledTime' => $booking->scheduledDate ? $booking->scheduledDate->format('H:i') : null,
                'agreed_price' => $booking->agreed_price,
                'estimatedPrice' => $booking->agreed_price, // Add for frontend compatibility
                'notes' => $booking->notes,
                'description' => $booking->notes, // Add for frontend compatibility
                'specialInstructions' => $booking->notes, // Add for frontend compatibility
                'created_at' => $booking->created_at,
                'expires_at' => $booking->expires_at,
                'service_address' => $booking->service_address,
                'service_latitude' => $booking->service_latitude,
                'service_longitude' => $booking->service_longitude,
                'customerAddress' => $booking->service_address, // Add for frontend compatibility
                'customerLatitude' => $booking->service_latitude, // Add for frontend compatibility
                'customerLongitude' => $booking->service_longitude, // Add for frontend compatibility
                'customer' => $userType === 'provider' ? [
                    'id' => $booking->customer->customerID,
                    'customerId' => $booking->customer->customerID, // Add for frontend compatibility
                    'name' => $booking->customer->fullname,
                    'customerName' => $booking->customer->fullname, // Add for frontend compatibility
                    'phone' => $booking->customer->phone,
                    'customerPhone' => $booking->customer->phone, // Add for frontend compatibility
                    'profilePicture' => $booking->customer->profilePicture,
                    'customerImage' => $booking->customer->profilePicture // Add for frontend compatibility
                ] : null,
                'provider' => $userType === 'customer' ? [
                    'id' => $booking->provider->providerID,
                    'name' => $booking->provider->fullname,
                    'phone' => $booking->provider->phone,
                    'profilePicture' => $booking->provider->profilePicture,
                    'rating' => $booking->provider->rating
                ] : null,
                'service' => [
                    'id' => $booking->service->serviceID,
                    'title' => $booking->service->title,
                    'serviceName' => $booking->service->title, // Add for frontend compatibility
                    'description' => $booking->service->description,
                    'estimatedPrice' => $booking->service->estimatedPrice ?? $booking->agreed_price
                ],
                'timeline' => [
                    'accepted_at' => $booking->accepted_at,
                    'provider_started_at' => $booking->provider_started_at,
                    'provider_arrived_at' => $booking->provider_arrived_at,
                    'completed_at' => $booking->completed_at,
                    'cancelled_at' => $booking->cancelled_at,
                    'startedAt' => $booking->provider_started_at, // Add for frontend compatibility
                ],
                'payment' => $booking->payment ? [
                    'status' => $booking->payment->status,
                    'amount' => $booking->payment->amount
                ] : null
            ]
        ]);
    }

    /**
     * Get all bookings for the authenticated customer
     */
    public function customerBookings(Request $request)
    {
        $customer = auth()->guard('customer')->user();
        
        if (!$customer) {
            return response()->json([
                'success' => false,
                'message' => 'Unauthorized'
            ], 401);
        }
        
        $bookings = Booking::where('customerID', $customer->customerID)
                    ->with(['provider', 'service'])
                    ->orderBy('created_at', 'desc')
                    ->paginate(20);

        return response()->json([
            'success' => true,
            'data' => $bookings
        ]);
    }

    /**
     * Get all bookings for the authenticated provider
     */
    public function providerBookings(Request $request)
    {
        $provider = auth()->guard('provider')->user();
        
        if (!$provider) {
            return response()->json([
                'success' => false,
                'message' => 'Unauthorized'
            ], 401);
        }
        
        $query = Booking::where('providerID', $provider->providerID)
                 ->with(['customer', 'service']);

        // Filter by status if requested
        if ($request->has('status')) {
            $query->where('status', $request->status);
        }

        // Filter by date range
        if ($request->has('from_date')) {
            $query->whereDate('scheduledDate', '>=', $request->from_date);
        }
        if ($request->has('to_date')) {
            $query->whereDate('scheduledDate', '<=', $request->to_date);
        }

        $bookings = $query->orderBy('created_at', 'desc')
                    ->paginate(20);

        return response()->json([
            'success' => true,
            'data' => $bookings
        ]);
    }

    /**
     * Customer cancels a booking
     */
    public function cancel(Request $request, $bookingId)
    {
        $customer = auth()->guard('customer')->user();
        
        if (!$customer) {
            return response()->json([
                'success' => false,
                'message' => 'Unauthorized'
            ], 401);
        }

        $validator = Validator::make($request->all(), [
            'reason' => 'nullable|string|max:255'
        ]);

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'errors' => $validator->errors()
            ], 422);
        }

        try {
            DB::beginTransaction();

            $booking = Booking::where('bookingID', $bookingId)
                        ->where('customerID', $customer->customerID)
                        ->whereIn('status', ['pending', 'accepted'])
                        ->first();

            if (!$booking) {
                DB::rollBack();
                return response()->json([
                    'success' => false,
                    'message' => 'Booking not found or cannot be cancelled'
                ], 404);
            }

            // Calculate refund based on timing
            $refundAmount = 0;
            $cancellationDate = now();

            if ($booking->status === 'pending') {
                // Full refund if still pending (provider hasn't accepted)
                $refundAmount = $booking->agreed_price;
            } elseif ($booking->status === 'accepted') {
                // Check if cancellation is on service day
                $serviceDate = $booking->scheduledDate;
                
                if ($cancellationDate->format('Y-m-d') < $serviceDate->format('Y-m-d')) {
                    // Before service day: 100% refund
                    $refundAmount = $booking->agreed_price;
                } elseif ($cancellationDate->format('Y-m-d') == $serviceDate->format('Y-m-d')) {
                    // On service day: 50% refund
                    $refundAmount = $booking->agreed_price * 0.5;
                } else {
                    // After service day: cannot cancel, should dispute
                    DB::rollBack();
                    return response()->json([
                        'success' => false,
                        'message' => 'Service date has passed. Please open a dispute instead.'
                    ], 400);
                }
            }

            // Update booking
            $booking->status = 'cancelled';
            $booking->cancelled_at = $cancellationDate;
            $booking->cancellation_reason = $request->reason;
            $booking->refund_amount = $refundAmount;
            $booking->save();

            // Update customer wallet if refund applicable (with locking to prevent race conditions)
            if ($refundAmount > 0) {
                $lockedCustomer = Customer::where('customerID', $customer->customerID)
                    ->lockForUpdate()
                    ->first();
                $lockedCustomer->walletBalance = ($lockedCustomer->walletBalance ?? 0) + $refundAmount;
                $lockedCustomer->save();
            }

            // Notify provider
            // Notify provider using service
            $this->notificationService->toProvider(
                $booking->providerID,
                'booking_cancelled',
                'Booking Cancelled',
                'Booking cancelled by customer',
                [
                    'customer_name' => $customer->fullname,
                    'refund_amount' => $refundAmount
                ],
                $booking->bookingID
            );
            DB::commit();

            return response()->json([
                'success' => true,
                'message' => 'Booking cancelled successfully',
                'data' => [
                    'bookingID' => $booking->bookingID,
                    'status' => 'cancelled',
                    'refund_amount' => $refundAmount,
                    'refund_message' => $refundAmount > 0 ? 
                        ($refundAmount == $booking->agreed_price ? 
                            'Full refund processed' : 
                            '50% refund processed') : 
                        'No refund applicable'
                ]
            ]);

        } catch (\Exception $e) {
            DB::rollBack();
            Log::error('Booking cancellation failed:', ['error' => $e->getMessage()]);
            
            return response()->json([
                'success' => false,
                'message' => 'Failed to cancel booking: ' . $e->getMessage()
            ], 500);
        }
    }

    /**
     * Provider marks booking as completed
     */
    public function complete(Request $request, $bookingId)
    {
        $provider = auth()->guard('provider')->user();
        
        if (!$provider) {
            return response()->json([
                'success' => false,
                'message' => 'Unauthorized'
            ], 401);
        }

        try {
            DB::beginTransaction();

            $booking = Booking::where('bookingID', $bookingId)
                        ->where('providerID', $provider->providerID)
                        ->where('status', 'in_progress')
                        ->first();

            if (!$booking) {
                DB::rollBack();
                return response()->json([
                    'success' => false,
                    'message' => 'Booking not found or cannot be completed'
                ], 404);
            }

            $booking->status = 'waiting_customer_confirmation';
            $booking->completed_at = now();
            $booking->auto_release_at = now()->addHours(48);
            $booking->save();

            // Increment provider's completed jobs
            $provider->completed_jobs = ($provider->completed_jobs ?? 0) + 1;
            $provider->save();

            // Notify customer using service
            $this->notificationService->toCustomer(
                $booking->customerID,
                'booking_completed',
                'Service Completed',
                'Your service has been marked as completed. Please confirm and rate the provider.',
                [],
                $booking->bookingID
            );
            DB::commit();

            return response()->json([
                'success' => true,
                'message' => 'Booking marked as completed',
                'data' => [
                    'bookingID' => $booking->bookingID,
                    'status' => 'waiting_customer_confirmation',
                    'completed_at' => $booking->completed_at
                ]
            ]);

        } catch (\Exception $e) {
            DB::rollBack();
            Log::error('Booking completion failed:', ['error' => $e->getMessage()]);
            
            return response()->json([
                'success' => false,
                'message' => 'Failed to complete booking: ' . $e->getMessage()
            ], 500);
        }
    }

        /**
     * Get pending bookings for the authenticated provider
     * 
     * GET /api/provider/bookings/pending
     */
    public function pendingBookings(Request $request)
    {
        try {
            $provider = auth()->guard('provider')->user();
            
            if (!$provider) {
                return response()->json([
                    'success' => false,
                    'message' => 'Provider not authenticated'
                ], 401);
            }

            $bookings = Booking::where('providerID', $provider->providerID)
                ->where('status', 'pending')
                ->with(['customer', 'service.category'])
                ->orderBy('created_at', 'desc')
                ->get();

            return response()->json([
                'success' => true,
                'data' => $bookings
            ]);

        } catch (\Exception $e) {
            Log::error('Error fetching pending bookings: ' . $e->getMessage());
            
            return response()->json([
                'success' => false,
                'message' => 'Failed to fetch pending bookings'
            ], 500);
        }
    }


    /**
     * Provider starts the job
     * 
     * POST /api/provider/bookings/{id}/start
     */
    public function start(Request $request, $id)
    {
        try {
            $provider = auth()->guard('provider')->user();
            
            if (!$provider) {
                return response()->json([
                    'success' => false,
                    'message' => 'Provider not authenticated'
                ], 401);
            }

            // Find booking that belongs to this provider and is in 'paid' status
            $booking = Booking::where('bookingID', $id)
                ->where('providerID', $provider->providerID)
                ->whereIn('payment_status', ['paid', 'confirmed', 'held']) // Can start after payment
                ->first();

            if (!$booking) {
                return response()->json([
                    'success' => false,
                    'message' => 'Booking not found or cannot be started'
                ], 404);
            }

            // Update booking status
            $booking->status = 'in_progress';
            $booking->provider_started_at = now();
            $booking->save();

            // Log the action
            Log::info('Provider started job', [
                'booking_id' => $booking->bookingID,
                'provider_id' => $provider->providerID
            ]);

            return response()->json([
                'success' => true,
                'message' => 'Job started successfully',
                'data' => [
                    'bookingID' => $booking->bookingID,
                    'status' => $booking->status,
                    'started_at' => $booking->provider_started_at
                ]
            ]);

        } catch (\Exception $e) {
            Log::error('Error starting job: ' . $e->getMessage());
            
            return response()->json([
                'success' => false,
                'message' => 'Failed to start job'
            ], 500);
        }
    }

        public function arrive($id)
    {
        $provider = auth()->guard('provider')->user();
        
        if (!$provider) {
            return response()->json(['success' => false, 'message' => 'Unauthorized'], 401);
        }
        
        $booking = Booking::where('bookingID', $id)
            ->where('providerID', $provider->providerID)
            ->whereIn('status', ['accepted', 'confirmed', 'in_progress', 'started'])
            ->first();
            
        if (!$booking) {
            return response()->json([
                'success' => false,
                'message' => 'Booking not found or not active'
            ], 404);
        }
        
        $booking->status = 'arrived';
        $booking->provider_arrived_at = now();
        $booking->save();
        
        // Notify customer that provider has arrived
        $notification = new \App\Models\Notification();
        $notification->notifiable_type = 'customer';
        $notification->notifiable_id = $booking->customerID;
        $notification->type = 'provider_arrived';
        $notification->title = '📍 Provider has arrived';
        $notification->message = 'Your service provider has arrived at your location.';
        $notification->data = json_encode(['booking_id' => $booking->bookingID]);
        $notification->related_booking_id = $booking->bookingID;
        $notification->save();
        
        return response()->json([
            'success' => true,
            'message' => 'Arrival confirmed'
        ]);
    }

}