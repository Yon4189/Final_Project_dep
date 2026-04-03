<?php

use Illuminate\Support\Facades\Route;
use Illuminate\Support\Facades\Broadcast;
use App\Http\Controllers\CustomerAuthController;
use App\Http\Controllers\ServiceProviderAuthController;
use App\Http\Controllers\NotificationController;
use App\Http\Controllers\AdminAuthController;
use App\Http\Controllers\ProviderSearchController;
use App\Http\Controllers\ForgotPasswordController;
use App\Http\Controllers\CategoryController;
use App\Http\Controllers\ServiceController;
use App\Http\Controllers\ProviderDashboardController;
use App\Http\Controllers\ServiceCityController;
use App\Http\Controllers\PaymentController;
use App\Http\Controllers\WithdrawalController;
use App\Http\Controllers\WebhookController;
use App\Http\Controllers\CustomerController;
use App\Http\Controllers\CustomerSearchController;
use App\Http\Controllers\BookingController;
use App\Http\Controllers\ChatController;
use App\Http\Controllers\WalletController;
use App\Http\Controllers\AdminWithdrawalController;
use App\Http\Controllers\ReviewController;
use App\Http\Controllers\DisputeController;
use App\Http\Controllers\AdminDisputeController;
use App\Http\Controllers\AddressController;
use App\Http\Controllers\ProviderTrackingController;
use App\Http\Controllers\OnlineStatusController;
use App\Http\Controllers\LocationAutocompleteController;




// ==================== BROADCASTING ROUTES ====================
Broadcast::routes(['middleware' => ['auth:sanctum']]);

// ==================== PUBLIC ROUTES ====================
Route::get('/health', function () {
    return response()->json(['status' => 'ok', 'message' => 'API is healthy']);
});

Route::get('/cities', [ServiceCityController::class, 'index']);
Route::get('/test', function () {
    return response()->json([
        'success' => true,
        'message' => 'API is working correctly',
        'server_time' => now()
    ]);
});

Route::get('/public/stats', [AdminAuthController::class, 'getStats']);
Route::get('/categories', [CategoryController::class, 'getCategories']);
Route::get('/services', [ServiceController::class, 'index']);

// Location Autocomplete (Public - no auth required)
Route::get('/location/autocomplete', [LocationAutocompleteController::class, 'autocomplete']);

// ==================== AUTH ROUTES ====================
// Customer Auth
Route::post('/customer/register', [CustomerAuthController::class, 'register']);
Route::post('/customer/login', [CustomerAuthController::class, 'login']);

// Provider Auth
Route::post('/provider/register', [ServiceProviderAuthController::class, 'register']);
Route::post('/provider/login', [ServiceProviderAuthController::class, 'login']);

// Admin Auth
Route::post('/admin/login', [AdminAuthController::class, 'login']);

// Password Reset
Route::post('/forgot-password', [ForgotPasswordController::class, 'sendResetLink']);
Route::post('/reset-password', [ForgotPasswordController::class, 'resetPassword']);

// ==================== PUBLIC SEARCH ====================
//Route::get('/search/providers', [ProviderSearchController::class, 'search']);

// ==================== WEBHOOKS & CALLBACKS (PUBLIC) ====================
Route::match(['get', 'post'], '/webhook/chapa', [WebhookController::class, 'handleChapaWebhook']);
Route::get('/payment/callback/{tx_ref}', [PaymentController::class, 'callback'])->name('payment.callback');
Route::get('/payment/return', [App\Http\Controllers\PaymentController::class, 'handleReturn'])->name('payment.return');
Route::get('/payment/return/{encoded_redirect}', [App\Http\Controllers\PaymentController::class, 'handleReturn'])->name('payment.return.fixed');

// ==================== PUBLIC SEARCH (Customer Prefix) ====================
Route::group(['prefix' => 'customer'], function () {
    Route::get('/providers/search', [CustomerSearchController::class, 'searchProviders']);
    Route::get('/providers/top-rated', [CustomerSearchController::class, 'getTopRated']);
    Route::get('/providers/{id}', [CustomerSearchController::class, 'getProviderDetails']);
    Route::get('/providers/{id}/availability', [CustomerSearchController::class, 'getProviderAvailability']);
    Route::get('/providers/{id}/reviews', [CustomerSearchController::class, 'getProviderReviews']);
    Route::get('/providers/nearby', [CustomerSearchController::class, 'getNearbyProviders']);
});

// ==================== PROTECTED CUSTOMER ROUTES ====================
Route::group(['middleware' => 'auth:customer', 'prefix' => 'customer'], function () {
    // Profile Management
    Route::get('/profile', [CustomerController::class, 'getProfile']);
    Route::put('/profile', [CustomerController::class, 'updateProfile']);
    Route::post('/profile/image', [CustomerController::class, 'uploadProfileImage']);
    Route::post('/profile/password', [CustomerController::class, 'changePassword']);
    
    // Other Customer Routes below...
    
    // Bookings (Service Requests)
    Route::get('/bookings', [CustomerController::class, 'getRequests']); // List all
    Route::get('/requests', [CustomerController::class, 'getRequests']); // Alias for mobile app
    
    Route::post('/bookings', [CustomerController::class, 'createBooking']); // Create new
    Route::post('/requests', [CustomerController::class, 'createBooking']); // Alias for mobile app
    
    Route::get('/bookings/{id}', [CustomerController::class, 'getRequestDetails']);
    Route::get('/requests/{id}', [CustomerController::class, 'getRequestDetails']); // Alias for mobile app
    
    Route::post('/bookings/{id}/cancel', [CustomerController::class, 'cancelRequest']);
    Route::post('/requests/{id}/cancel', [CustomerController::class, 'cancelRequest']); // Alias for mobile app
    
    Route::post('/bookings/{id}/reschedule', [CustomerController::class, 'rescheduleRequest']);
    Route::get('/bookings/{id}/status', [CustomerController::class, 'getRequestStatus']);
    Route::get('/bookings/{id}/track', [CustomerController::class, 'trackProvider']);
    
    // Reviews
    Route::post('/reviews', [CustomerController::class, 'createReview']);
    Route::put('/reviews/{id}', [CustomerController::class, 'updateReview']);
    Route::delete('/reviews/{id}', [CustomerController::class, 'deleteReview']);
    Route::get('/reviews/booking/{bookingId}', [CustomerController::class, 'getReviewForBooking']);
    Route::get('/reviews/my', [CustomerController::class, 'getMyReviews']);
    
    // Complaints
    Route::post('/complaints', [CustomerController::class, 'createComplaint']);
    Route::get('/complaints', [CustomerController::class, 'getComplaints']);
    Route::get('/complaints/{id}', [CustomerController::class, 'getComplaintDetails']);
    
    // Locations
    Route::get('/locations', [CustomerController::class, 'getLocations']);
    Route::post('/locations', [CustomerController::class, 'addLocation']);
    Route::put('/locations/{id}', [CustomerController::class, 'updateLocation']);
    Route::delete('/locations/{id}', [CustomerController::class, 'deleteLocation']);
    Route::patch('/locations/{id}/primary', [CustomerController::class, 'setPrimaryLocation']);
    
    // Notifications
    Route::get('/notifications', [NotificationController::class, 'getCustomerNotifications']);
    Route::get('/notifications/unread-count', [NotificationController::class, 'unreadCount']);
    Route::patch('/notifications/{id}/read', [NotificationController::class, 'markAsRead']);
    Route::patch('/notifications/read-all', [NotificationController::class, 'markAllAsRead']);
    Route::get('/notifications/settings', [CustomerController::class, 'getNotificationSettings']);
    Route::put('/notifications/settings', [CustomerController::class, 'updateNotificationSettings']);
    
    // Search Suggestions
    Route::get('/search/suggestions', [CustomerSearchController::class, 'getSearchSuggestions']);
    Route::post('/push-token', [CustomerController::class, 'updatePushToken']);
    
    // ========== PAYMENT ROUTES ==========
    Route::get('/payment/methods', [PaymentController::class, 'methods']);
    Route::post('/payment/booking/{bookingId}/initialize', [PaymentController::class, 'initialize']);
    Route::get('/payment/verify', [PaymentController::class, 'verify']); // Query param: tx_ref
    Route::get('/payment/history', [PaymentController::class, 'history']);
    Route::get('/payment/{tx_ref}', [PaymentController::class, 'show']);
    
    // Booking Confirmation (triggers payment release)
    Route::post('/bookings/{bookingId}/confirm', [PaymentController::class, 'confirmCompletion']);

    Route::post('/bookings/{bookingID}/review', [ReviewController::class, 'store']);

    Route::post('/bookings/{bookingID}/dispute', [DisputeController::class, 'customerRaiseDispute']);
    Route::get('/disputes', [DisputeController::class, 'getCustomerDisputes']);
    Route::get('/disputes/{disputeID}', [DisputeController::class, 'show']);
    Route::post('/disputes/{disputeID}/messages', [DisputeController::class, 'addMessage']);


    // Address Book Routes
Route::group(['prefix' => 'addresses'], function () {
    Route::get('/', [AddressController::class, 'index']);
    Route::post('/', [AddressController::class, 'store']);
    Route::get('/{addressID}', [AddressController::class, 'show']);
    Route::put('/{addressID}', [AddressController::class, 'update']);
    Route::delete('/{addressID}', [AddressController::class, 'destroy']);
    Route::patch('/{addressID}/default', [AddressController::class, 'setDefault']);
});
Route::get('/bookings/{bookingID}/track', [ProviderTrackingController::class, 'getProviderLocation']);
});

// Public routes (no authentication required)
// ==================== PROTECTED PROVIDER ROUTES ====================
Route::group(['middleware' => 'auth:provider', 'prefix' => 'provider'], function () {
    // Auth & Profile
    Route::post('/logout', [ServiceProviderAuthController::class, 'logout']);
    Route::get('/profile', [ServiceProviderAuthController::class, 'profile']);
    Route::post('/profile/update', [ServiceProviderAuthController::class, 'updateProfile']);
    Route::post('/location/update', [ServiceProviderAuthController::class, 'updateLocation']);
    Route::post('/push-token', [ServiceProviderAuthController::class, 'updatePushToken']);
    
    // Bank Details
    Route::get('/bank-details', [ServiceProviderAuthController::class, 'getBankDetails']);
    Route::put('/bank-details', [ServiceProviderAuthController::class, 'updateBankDetails']);
    
    // Dashboard
    Route::get('/dashboard/stats', [ProviderDashboardController::class, 'getStats']);
    Route::get('/schedule', [ProviderDashboardController::class, 'getSchedule']);
    Route::post('/schedule', [ProviderDashboardController::class, 'updateSchedule']);
    Route::get('/schedule/today', [ProviderDashboardController::class, 'getTodaySchedule']);
    Route::get('/earnings/summary', [ProviderDashboardController::class, 'getEarningsSummary']);
    
    // Bookings Management
    Route::get('/bookings', [BookingController::class, 'providerBookings']); // All bookings
    Route::get('/bookings/pending', [BookingController::class, 'pendingBookings']);
    Route::get('/bookings/active', [BookingController::class, 'activeBookings']);
    Route::get('/bookings/completed', [BookingController::class, 'completedBookings']);
    Route::get('/bookings/{id}', [BookingController::class, 'show']);
    Route::post('/bookings/{id}/accept', [BookingController::class, 'accept']);
    Route::post('/bookings/{id}/reject', [BookingController::class, 'reject']);
    Route::post('/bookings/{id}/start', [BookingController::class, 'start']); // Provider started
    Route::post('/bookings/{id}/arrive', [BookingController::class, 'arrive']); // Provider arrived
    Route::post('/bookings/{id}/complete', [BookingController::class, 'complete']); // Job done
    
    // Alias for requests/bookngs used by mobile app
    Route::get('/requests/{id}', [BookingController::class, 'show']);
    Route::post('/requests/{id}/arrive', [BookingController::class, 'arrive']);
    Route::post('/requests/{id}/start', [BookingController::class, 'start']);
    Route::post('/requests/{id}/complete', [BookingController::class, 'complete']);
    
    // Requests (old booking requests)
    Route::get('/requests', [ProviderDashboardController::class, 'getRequests']);
    
    // Reviews
    Route::get('/reviews', [ProviderDashboardController::class, 'getReviews']);
    
    // ========== WALLET & WITHDRAWAL ROUTES ==========
    Route::get('/wallet', [WalletController::class, 'dashboard']);
    Route::get('/wallet/transactions', [WalletController::class, 'transactions']);
    Route::post('/wallet/withdraw', [WalletController::class, 'requestWithdrawal']);
    Route::get('/wallet/withdrawals', [WalletController::class, 'withdrawals']);
    
    // Notifications
    Route::get('/notifications', [NotificationController::class, 'getProviderNotifications']);
    Route::post('/notifications/{id}/read', [NotificationController::class, 'markAsRead']);
    Route::post('/notifications/read-all', [NotificationController::class, 'markAllAsRead']);


    Route::post('/bookings/{bookingID}/dispute', [DisputeController::class, 'providerRaiseDispute']);
    Route::get('/disputes', [DisputeController::class, 'getProviderDisputes']);
    Route::get('/disputes/{disputeID}', [DisputeController::class, 'show']);
    Route::post('/disputes/{disputeID}/messages', [DisputeController::class, 'addMessage']);

    Route::post('/tracking/update', [ProviderTrackingController::class, 'updateLocation']);
    Route::get('/tracking/booking/{bookingID}', [ProviderTrackingController::class, 'getBookingRoute']);
});

// ==================== ADMIN ROUTES ====================
Route::group(['middleware' => 'auth:admin', 'prefix' => 'admin'], function () {
    // Statistics
    Route::get('/stats', [AdminAuthController::class, 'getStats']);
    Route::get('/search', [AdminAuthController::class, 'globalSearch']);
    
    // Platform Settings
    Route::post('/settings', [AdminAuthController::class, 'updateSettings']);
    Route::post('/profile/update', [AdminAuthController::class, 'updateProfile']);
    Route::post('/profile/picture', [AdminAuthController::class, 'updateProfilePicture']);
    
    // Bookings
    Route::get('/bookings', [AdminAuthController::class, 'getAllBookings']);
    
    // Provider Management
    Route::get('/providers', [AdminAuthController::class, 'getAllProviders']);
    Route::get('/providers/pending', [AdminAuthController::class, 'pendingProviders']);
    Route::get('/providers/approved', [AdminAuthController::class, 'approvedProviders']);
    Route::get('/providers/rejected', [AdminAuthController::class, 'rejectedProviders']);
    Route::get('/providers/suspended', [AdminAuthController::class, 'suspendedProviders']);
    Route::post('/providers/{id}/verify', [AdminAuthController::class, 'verifyProvider']);
    Route::patch('/providers/{id}/status', [AdminAuthController::class, 'toggleProviderStatus']);
    Route::delete('/providers/{id}', [AdminAuthController::class, 'deleteProvider']);
    
    // Customer Management
    Route::get('/customers', [AdminAuthController::class, 'getCustomers']);
    Route::patch('/customers/{id}/status', [AdminAuthController::class, 'toggleCustomerStatus']);
    Route::delete('/customers/{id}', [AdminAuthController::class, 'deleteCustomer']);
    
    // Category Management
    Route::get('/categories', [CategoryController::class, 'getCategories']);
    Route::post('/categories', [CategoryController::class, 'addCategory']);
    Route::put('/categories/{id}', [CategoryController::class, 'editCategory']);
    Route::delete('/categories/{id}', [CategoryController::class, 'deleteCategory']);

    // Admin Service Management
    Route::get('/services', [AdminAuthController::class, 'getAllServices']);

    // ========== PAYMENT & WITHDRAWAL ADMIN ROUTES ==========
    Route::get('/payments', [PaymentController::class, 'index']);
    Route::get('/payments/stats', [PaymentController::class, 'getPaymentStats']);
    
    Route::get('/withdrawals', [AdminWithdrawalController::class, 'index']);
    Route::get('/withdrawals/stats', [AdminWithdrawalController::class, 'stats']);
    Route::post('/withdrawals/{id}/approve', [AdminWithdrawalController::class, 'approve']);
    Route::post('/withdrawals/{id}/reject', [AdminWithdrawalController::class, 'reject']);

    Route::get('/banks', [PaymentController::class, 'getBanks']);

    // Notifications
    Route::get('/notifications', [NotificationController::class, 'index']);
    Route::post('/notifications/read', [NotificationController::class, 'markAllAsRead']);


    Route::get('/disputes', [AdminDisputeController::class, 'index']);
    Route::get('/disputes/stats', [AdminDisputeController::class, 'stats']);
    Route::get('/disputes/{disputeID}', [AdminDisputeController::class, 'show']);
    Route::put('/disputes/{disputeID}/status', [AdminDisputeController::class, 'updateStatus']);
    Route::post('/disputes/{disputeID}/notes', [AdminDisputeController::class, 'addPrivateNote']);
    Route::post('/disputes/{disputeID}/messages', [AdminDisputeController::class, 'addMessage']);
    Route::delete('/disputes/messages/{messageID}', [AdminDisputeController::class, 'deleteMessage']);

    Route::post('/withdrawals/{id}/approve', [AdminWithdrawalController::class, 'approveWithdrawal']);

    // fetch bookings for admin
    Route::get('/accepted/{disputeID}', [AdminAuthController::class, 'acceptedBookings']);
    Route::get('/rejected/{disputeID}', [AdminAuthController::class, 'rejectedBookings']);
    Route::get('/compeleted/{disputeID}', [AdminAuthController::class, 'compeletedBookings']);
    Route::get('/pending/{disputeID}', [AdminAuthController::class, 'pendingBookings']);



});

Route::get('/providers/{providerID}/reviews', [ReviewController::class, 'providerReviews']);


// ==================== CHAT ROUTES (Shared) ====================
Route::group(['middleware' => 'auth:customer,provider', 'prefix' => 'chat'], function () {
    // Conversations
    Route::get('/conversations', [ChatController::class, 'getConversations']);
    Route::post('/conversations', [ChatController::class, 'getOrCreateConversation']);
    Route::get('/conversations/{id}', [ChatController::class, 'getMessages']);
    Route::post('/conversations/{id}/read', [ChatController::class, 'markAsRead']);
    
    // Messages
    Route::post('/messages', [ChatController::class, 'sendMessage']);
    
    // Unread count
    Route::get('/unread', [ChatController::class, 'getUnreadCount']);
});

// ==================== NOTIFICATION ROUTES (Temporary backward compatibility) ====================
Route::get('provider/{providerID}/notifications', [NotificationController::class, 'index']);


// Provider wallet routes
Route::group(['middleware' => 'auth:provider', 'prefix' => 'provider'], function () {
    Route::get('/wallet', [WalletController::class, 'dashboard']);
    Route::get('/wallet/summary', [WalletController::class, 'summary']);
    Route::post('/withdrawals', [WalletController::class, 'requestWithdrawal']);
    Route::get('/withdrawals', [WalletController::class, 'withdrawals']);
    Route::get('/withdrawals/{id}', [WalletController::class, 'showWithdrawal']);
    Route::post('/withdrawals/{id}/cancel', [WalletController::class, 'cancelWithdrawal']);
    Route::get('/transactions', [WalletController::class, 'transactions']);
        // Service Management
    Route::get('/services', [ServiceController::class, 'index']);
    Route::post('/services', [ServiceController::class, 'store']);
    Route::put('/services/{id}', [ServiceController::class, 'update']);
    Route::delete('/services/{id}', [ServiceController::class, 'destroy']);

});


// Admin withdrawal management routes
Route::group(['middleware' => 'auth:admin', 'prefix' => 'admin'], function () {
    // Withdrawal endpoints
    Route::get('/withdrawals/pending', [AdminWithdrawalController::class, 'getPendingWithdrawals']);
    Route::post('/withdrawals/{id}/approve', [AdminWithdrawalController::class, 'approveWithdrawal']);
    Route::post('/withdrawals/{id}/reject', [AdminWithdrawalController::class, 'rejectWithdrawal']);
    Route::get('/withdrawals/stats', [AdminWithdrawalController::class, 'stats']);
    Route::get('/withdrawals', [AdminWithdrawalController::class, 'index']); 
});


Route::get('/test', function() {
    return response()->json(['message' => 'API is working']);
});
Route::post('/webhook/chapa/transfer', [WebhookController::class, 'handleTransferWebhook']);
Route::get('/getcodes', [PaymentController::class, 'debugBankCodes']);


// Provider heartbeat route
Route::group(['middleware' => 'auth:provider', 'prefix' => 'provider'], function () {
    Route::post('/heartbeat', [OnlineStatusController::class, 'providerHeartbeat']);
    // Override logout to use our new method
    Route::post('/logout', [OnlineStatusController::class, 'providerLogout']);
});

// Customer heartbeat route
Route::group(['middleware' => 'auth:customer', 'prefix' => 'customer'], function () {
    Route::post('/heartbeat', [OnlineStatusController::class, 'customerHeartbeat']);
    Route::post('/logout', [OnlineStatusController::class, 'customerLogout']);
});


// Route::get('/test-chapa', function() {
//     $client = new \GuzzleHttp\Client();
//     try {
//         $response = $client->get('https://api.chapa.co/v1/health');
//         return 'Chapa API is reachable: ' . $response->getBody();
//     } catch (\Exception $e) {
//         return 'Cannot reach Chapa: ' . $e->getMessage();
//     }
// });