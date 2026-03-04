<?php

use Illuminate\Support\Facades\Route;
use App\Http\Controllers\CustomerAuthController;
use App\Http\Controllers\ServiceProviderAuthController;
use App\Http\Controllers\NotificationController;
use App\Http\Controllers\AdminAuthController;
use App\Http\Controllers\ProvidersearchController;
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
use App\Http\Controllers\BookingController; // You'll need to create this
use App\Http\Controllers\ChatController; // You'll need to create this


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
Route::get('/search/providers', [ProviderSearchController::class, 'search']);

// ==================== WEBHOOKS (PUBLIC) ====================
Route::post('/webhook/chapa', [WebhookController::class, 'handleChapaWebhook']);

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
    
    // Payments
    Route::post('/payment/initialize', [PaymentController::class, 'initialize']);
    Route::get('/payment/verify/{tx_ref}', [PaymentController::class, 'verify']);
    Route::get('/payment/{tx_ref}', [PaymentController::class, 'show']);
    Route::post('/payment/cancel/{tx_ref}', [PaymentController::class, 'cancel']);
    Route::get('/payment/history', [PaymentController::class, 'customerHistory']); // Uses auth()->id()
});

// ==================== PROTECTED PROVIDER ROUTES ====================
// ==================== PROTECTED PROVIDER ROUTES ====================
Route::middleware('auth:provider')->group(function () {
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
    
    // Withdrawals
    Route::post('/withdrawal/create', [WithdrawalController::class, 'create']);
    Route::get('/withdrawal/status/{withdrawal_ref}', [WithdrawalController::class, 'status']);
    Route::get('/withdrawal/history', [WithdrawalController::class, 'providerHistory']); // Uses auth()->id()
    
    // Notifications - ADD THESE LINES
    Route::get('/notifications', [NotificationController::class, 'getProviderNotifications']);
    Route::post('/notifications/{id}/read', [NotificationController::class, 'markAsRead']);
});

// ==================== ADMIN ROUTES ====================
Route::middleware('auth:admin')->group(function () {
    // Statistics
    Route::get('/stats', [AdminAuthController::class, 'getStats']);
    Route::get('/payments/stats', [PaymentController::class, 'getPaymentStats']);
    Route::get('/withdrawals/stats', [WithdrawalController::class, 'getWithdrawalStats']);
    
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
    Route::post('/categories', [CategoryController::class, 'addCategory']);
    Route::put('/categories/{id}', [CategoryController::class, 'editCategory']);
    Route::delete('/categories/{id}', [CategoryController::class, 'deleteCategory']);
    
    // Payments
    Route::get('/payments', [PaymentController::class, 'index']);
    
    // Withdrawals
    Route::get('/withdrawals', [WithdrawalController::class, 'index']);
    Route::post('/withdrawal/process/{withdrawal_id}', [WithdrawalController::class, 'process']);
    Route::post('/withdrawal/cancel/{withdrawal_id}', [WithdrawalController::class, 'cancel']);
});

// Route::prefix('admin')->middleware('auth:admin')->group(function () {
//     Route::get('/providers', [AdminAuthController::class, 'getAllProviders']);
//     Route::get('/customers', [AdminAuthController::class, 'getCustomers']);
//     // you can add more admin routes here
// });

// ==================== PUBLIC NOTIFICATIONS (Temporary - Should be protected) ====================
// This should be moved to protected routes. Keeping for backward compatibility
Route::get('provider/{providerID}/notifications', [NotificationController::class, 'index']);


// Customer routes (protected by customer sanctum)
Route::middleware('auth:customer')->prefix('customer')->group(function () {
    // Bookings
    Route::post('/bookings', [BookingController::class, 'store']);
    Route::get('/bookings', [BookingController::class, 'customerBookings']);
    Route::get('/bookings/{id}', [BookingController::class, 'show']);
    Route::post('/bookings/{id}/cancel', [BookingController::class, 'cancel']);
});

// Provider routes (protected by provider sanctum)
Route::middleware('auth:provider')->prefix('provider')->group(function () {
    Route::get('/bookings', [BookingController::class, 'providerBookings']);
    Route::get('/bookings/{id}', [BookingController::class, 'show']);
    Route::post('/bookings/{id}/accept', [BookingController::class, 'accept']);
    Route::post('/bookings/{id}/reject', [BookingController::class, 'reject']);
    Route::post('/bookings/{id}/complete', [BookingController::class, 'complete']);
});




// Notifications for both customers and providers
/*
Route::middleware('auth:customer,provider')->prefix('notifications')->group(function () {
    Route::get('/', [NotificationController::class, 'index']);
    Route::get('/unread-count', [NotificationController::class, 'unreadCount']);
    Route::post('/mark-all-read', [NotificationController::class, 'markAllAsRead']);
    Route::delete('/delete-all', [NotificationController::class, 'deleteAll']);
    Route::get('/{id}', [NotificationController::class, 'show']);
    Route::post('/{id}/read', [NotificationController::class, 'markAsRead']);
    Route::delete('/{id}', [NotificationController::class, 'destroy']);
});

*/


// Chat routes for both customers and providers
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