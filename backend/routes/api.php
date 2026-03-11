<?php

use Illuminate\Support\Facades\Route;
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

// ==================== PUBLIC ROUTES ====================
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

// ==================== PROTECTED CUSTOMER ROUTES ====================
Route::middleware('auth:customer')->prefix('customer')->group(function () {
    // Profile Management
    Route::get('/profile', [CustomerController::class, 'getProfile']);
    Route::put('/profile', [CustomerController::class, 'updateProfile']);
    Route::post('/profile/image', [CustomerController::class, 'uploadProfileImage']);
    Route::post('/profile/password', [CustomerController::class, 'changePassword']);
    
    // Provider Search & Discovery
    Route::get('/providers/search', [CustomerSearchController::class, 'searchProviders']);
    Route::get('/providers/top-rated', [CustomerSearchController::class, 'getTopRated']);
    Route::get('/providers/{id}', [CustomerSearchController::class, 'getProviderDetails']);
    Route::get('/providers/{id}/availability', [CustomerSearchController::class, 'getProviderAvailability']);
    Route::get('/providers/{id}/reviews', [CustomerSearchController::class, 'getProviderReviews']);
    Route::get('/providers/nearby', [CustomerSearchController::class, 'getNearbyProviders']);
    
    // Bookings (Service Requests)
    Route::get('/bookings', [CustomerController::class, 'getRequests']); // List all
    Route::post('/bookings', [CustomerController::class, 'createBooking']); // Create new
    Route::get('/bookings/{id}', [CustomerController::class, 'getRequestDetails']);
    Route::post('/bookings/{id}/cancel', [CustomerController::class, 'cancelRequest']);
    Route::post('/bookings/{id}/reschedule', [CustomerController::class, 'rescheduleRequest']);
    Route::get('/bookings/{id}/status', [CustomerController::class, 'getRequestStatus']);
    Route::get('/bookings/{id}/track', [CustomerController::class, 'trackProvider']);
    
    // Chat
    Route::prefix('chat')->group(function () {
        Route::get('/providers/{providerId}', [ChatController::class, 'getConversation']);
        Route::post('/providers/{providerId}/send', [ChatController::class, 'sendMessage']);
        Route::get('/conversations', [ChatController::class, 'getConversations']);
        Route::post('/messages/{messageId}/read', [ChatController::class, 'markAsRead']);
    });
    
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
    Route::post('/notifications/{id}/read', [NotificationController::class, 'markAsRead']);
    Route::get('/notifications/settings', [CustomerController::class, 'getNotificationSettings']);
    Route::put('/notifications/settings', [CustomerController::class, 'updateNotificationSettings']);
    
    // Search Suggestions
    Route::get('/search/suggestions', [CustomerSearchController::class, 'getSearchSuggestions']);
    
    // ========== PAYMENT ROUTES ==========
    Route::post('/payment/booking/{bookingId}/initialize', [PaymentController::class, 'initialize']);
    Route::get('/payment/verify', [PaymentController::class, 'verify']); // Query param: tx_ref
    Route::get('/payment/history', [PaymentController::class, 'history']);
    Route::get('/payment/{tx_ref}', [PaymentController::class, 'show']);
    
    // Booking Confirmation (triggers payment release)
    Route::post('/bookings/{bookingId}/confirm', [PaymentController::class, 'confirmCompletion']);

    Route::post('/bookings/{bookingID}/review', [ReviewController::class, 'store']);
});

// Public routes (no authentication required)
// ==================== PROTECTED PROVIDER ROUTES ====================
Route::middleware('auth:provider')->prefix('provider')->group(function () {
    // Auth & Profile
    Route::post('/logout', [ServiceProviderAuthController::class, 'logout']);
    Route::get('/profile', [ServiceProviderAuthController::class, 'profile']);
    Route::post('/profile/update', [ServiceProviderAuthController::class, 'updateProfile']);
    Route::post('/location/update', [ServiceProviderAuthController::class, 'updateLocation']);
    
    // Dashboard
    Route::get('/dashboard/stats', [ProviderDashboardController::class, 'getStats']);
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
    
    // Chat
    Route::prefix('chat')->group(function () {
        Route::get('/customers/{customerId}', [ChatController::class, 'getConversation']);
        Route::post('/customers/{customerId}/send', [ChatController::class, 'sendMessage']);
        Route::get('/conversations', [ChatController::class, 'getConversations']);
        Route::post('/messages/{messageId}/read', [ChatController::class, 'markAsRead']);
    });
    
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
});

// ==================== ADMIN ROUTES ====================
Route::middleware('auth:admin')->prefix('admin')->group(function () {
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

    // Notifications
    Route::get('/notifications', [NotificationController::class, 'index']);
    Route::post('/notifications/read', [NotificationController::class, 'markAllAsRead']);
});

Route::get('/providers/{providerID}/reviews', [ReviewController::class, 'providerReviews']);


// ==================== CHAT ROUTES (Shared) ====================
Route::middleware('auth:customer,provider')->prefix('chat')->group(function () {
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
Route::middleware('auth:provider')->prefix('provider')->group(function () {
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
Route::middleware('auth:admin')->prefix('admin')->group(function () {
    // Withdrawal endpoints
    Route::get('/withdrawals/pending', [AdminWithdrawalController::class, 'getPendingWithdrawals']);
    Route::post('/withdrawals/{id}/approve', [AdminWithdrawalController::class, 'approveWithdrawal']);
    Route::post('/withdrawals/{id}/reject', [AdminWithdrawalController::class, 'rejectWithdrawal']);
    Route::get('/withdrawals/stats', [AdminWithdrawalController::class, 'stats']);
    Route::get('/withdrawals', [AdminWithdrawalController::class, 'index']); // Optional: list all with filters
});


Route::get('/test', function() {
    return response()->json(['message' => 'API is working']);
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