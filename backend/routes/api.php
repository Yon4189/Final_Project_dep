<?php

use Illuminate\Support\Facades\Route;
use Illuminate\Support\Facades\Broadcast;
use App\Http\Controllers\CustomerAuthController;
use App\Http\Controllers\ServiceProviderAuthController;
use App\Http\Controllers\NotificationController;
use App\Http\Controllers\AdminAuthController;
use App\Http\Controllers\ForgotPasswordController;
use App\Http\Controllers\CategoryController;
use App\Http\Controllers\ServiceController;
use App\Http\Controllers\ProviderDashboardController;
use App\Http\Controllers\ServiceCityController;
use App\Http\Controllers\PaymentController;
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

// ==================== BROADCASTING ====================
Broadcast::routes(['middleware' => ['auth:sanctum']]);

<<<<<<< HEAD
// ==================== PUBLIC ROUTES (no auth) ====================
Route::get('/health', fn() => response()->json(['status' => 'ok']));
Route::get('/test',   fn() => response()->json(['success' => true, 'server_time' => now()]));
Route::get('/cities',        [ServiceCityController::class, 'index']);
Route::get('/categories',    [CategoryController::class, 'getCategories']);
Route::get('/services',      [ServiceController::class, 'index']);
Route::get('/public/stats',  [AdminAuthController::class, 'getStats']);

// Location autocomplete — rate limited to prevent abuse
Route::middleware('throttle:30,1')->group(function () {
    Route::get('/location/autocomplete', [LocationAutocompleteController::class, 'autocomplete']);
=======
// ==================== PUBLIC ROUTES ====================

Route::get('/health', function () {
    return response()->json(['status' => 'ok', 'message' => 'API is healthy']);
>>>>>>> 6bdd6357bb8432c830aaad5c271c4315a495f2da
});

// ==================== AUTH ROUTES — rate limited to prevent brute force ====================
Route::middleware('throttle:5,1')->group(function () {
    Route::post('/customer/login',  [CustomerAuthController::class, 'login']);
    Route::post('/provider/login',  [ServiceProviderAuthController::class, 'login']);
    Route::post('/admin/login',     [AdminAuthController::class, 'login']);
    Route::post('/forgot-password', [ForgotPasswordController::class, 'sendResetLink']);
    Route::post('/reset-password',  [ForgotPasswordController::class, 'resetPassword']);
});

// Registration — slightly more lenient (10/min) but still throttled
Route::middleware('throttle:10,1')->group(function () {
    Route::post('/customer/register',  [CustomerAuthController::class, 'register']);
    Route::post('/provider/register',  [ServiceProviderAuthController::class, 'register']);
});

// ==================== WEBHOOKS & CALLBACKS (PUBLIC — Chapa calls these) ====================
// These must stay public — Chapa's servers call them, not our users
Route::match(['get', 'post'], '/webhook/chapa',          [WebhookController::class, 'handleChapaWebhook']);
Route::post('/webhook/chapa/transfer',                   [WebhookController::class, 'handleTransferWebhook']);
Route::get('/payment/callback/{tx_ref}',                 [PaymentController::class, 'callback'])->name('payment.callback');
Route::get('/payment/return',                            [PaymentController::class, 'handleReturn'])->name('payment.return');
Route::get('/payment/return/{encoded_redirect}',         [PaymentController::class, 'handleReturn'])->name('payment.return.fixed');
Route::post('/payments/verify-callback',                 [PaymentController::class, 'verifyCallback']);

// ==================== PUBLIC PROVIDER SEARCH — rate limited ====================
// These are public so unauthenticated users can browse providers
// Rate limited to prevent competitor scraping
Route::middleware('throttle:20,1')->prefix('customer')->group(function () {
    Route::get('/providers/search',              [CustomerSearchController::class, 'searchProviders']);
    Route::get('/providers/top-rated',           [CustomerSearchController::class, 'getTopRated']);
    Route::get('/providers/{id}',                [CustomerSearchController::class, 'getProviderDetails']);
    Route::get('/providers/{id}/availability',   [CustomerSearchController::class, 'getProviderAvailability']);
    Route::get('/providers/{id}/reviews',        [CustomerSearchController::class, 'getProviderReviews']);
    Route::get('/providers/nearby',              [CustomerSearchController::class, 'getNearbyProviders']);
});

// Public provider reviews
Route::middleware('throttle:20,1')->get('/providers/{providerID}/reviews', [ReviewController::class, 'providerReviews']);

// ==================== PROTECTED CUSTOMER ROUTES ====================
// auth:customer  — must have valid customer token
// customer.active — account must not be suspended
Route::middleware(['auth:customer', 'customer.active'])->prefix('customer')->group(function () {

    // ── Profile ──────────────────────────────────────────────────────────────
    Route::get('/profile',          [CustomerController::class, 'getProfile']);
    Route::put('/profile',          [CustomerController::class, 'updateProfile']);
    Route::post('/profile/image',   [CustomerController::class, 'uploadProfileImage']);
    Route::post('/profile/password',[CustomerController::class, 'changePassword']);
    Route::post('/push-token',      [CustomerController::class, 'updatePushToken']);
    Route::post('/logout',          [OnlineStatusController::class, 'customerLogout']);
    Route::post('/heartbeat',       [OnlineStatusController::class, 'customerHeartbeat']);

    // ── Bookings ─────────────────────────────────────────────────────────────
    Route::get('/bookings',         [CustomerController::class, 'getRequests']);
    Route::get('/requests',         [CustomerController::class, 'getRequests']);        // mobile alias
    Route::post('/bookings',        [CustomerController::class, 'createBooking']);
    Route::post('/requests',        [CustomerController::class, 'createBooking']);      // mobile alias

    // Booking detail/actions — ownership enforced: booking must belong to this customer
    Route::middleware('ownership:booking,id,customerID')->group(function () {
        Route::get('/bookings/{id}',            [CustomerController::class, 'getRequestDetails']);
        Route::get('/requests/{id}',            [CustomerController::class, 'getRequestDetails']);
        Route::post('/bookings/{id}/cancel',    [CustomerController::class, 'cancelRequest']);
        Route::post('/requests/{id}/cancel',    [CustomerController::class, 'cancelRequest']);
        Route::post('/bookings/{id}/reschedule',[CustomerController::class, 'rescheduleRequest']);
        Route::get('/bookings/{id}/status',     [CustomerController::class, 'getRequestStatus']);
        Route::get('/bookings/{id}/track',      [CustomerController::class, 'trackProvider']);
    });

    // ── Reviews ──────────────────────────────────────────────────────────────
    Route::post('/reviews',                         [CustomerController::class, 'createReview']);
    Route::get('/reviews/my',                       [CustomerController::class, 'getMyReviews']);
    Route::get('/reviews/booking/{bookingId}',      [CustomerController::class, 'getReviewForBooking']);
    Route::middleware('ownership:review,id,customerID')->group(function () {
        Route::put('/reviews/{id}',     [CustomerController::class, 'updateReview']);
        Route::delete('/reviews/{id}',  [CustomerController::class, 'deleteReview']);
    });

    // ── Complaints / Disputes ─────────────────────────────────────────────────
    Route::post('/complaints',          [CustomerController::class, 'createComplaint']);
    Route::get('/complaints',           [CustomerController::class, 'getComplaints']);
    Route::get('/complaints/{id}',      [CustomerController::class, 'getComplaintDetails']);

    Route::post('/bookings/{bookingID}/dispute',    [DisputeController::class, 'customerRaiseDispute']);
    Route::get('/disputes',                         [DisputeController::class, 'getCustomerDisputes']);
    Route::middleware('ownership:dispute,disputeID,raised_by_id')->group(function () {
        Route::get('/disputes/{disputeID}',                     [DisputeController::class, 'show']);
        Route::post('/disputes/{disputeID}/messages',           [DisputeController::class, 'addMessage'])->middleware('throttle:10,1');
    });

    // ── Locations ────────────────────────────────────────────────────────────
    Route::get('/locations',                    [CustomerController::class, 'getLocations']);
    Route::post('/locations',                   [CustomerController::class, 'addLocation']);
    Route::middleware('ownership:address,id,customerID')->group(function () {
        Route::put('/locations/{id}',           [CustomerController::class, 'updateLocation']);
        Route::delete('/locations/{id}',        [CustomerController::class, 'deleteLocation']);
        Route::patch('/locations/{id}/primary', [CustomerController::class, 'setPrimaryLocation']);
    });

    // ── Address Book ─────────────────────────────────────────────────────────
    Route::prefix('addresses')->group(function () {
        Route::get('/',                     [AddressController::class, 'index']);
        Route::post('/',                    [AddressController::class, 'store']);
        Route::middleware('ownership:address,addressID,customerID')->group(function () {
            Route::get('/{addressID}',      [AddressController::class, 'show']);
            Route::put('/{addressID}',      [AddressController::class, 'update']);
            Route::delete('/{addressID}',   [AddressController::class, 'destroy']);
            Route::patch('/{addressID}/default', [AddressController::class, 'setDefault']);
        });
    });

    // ── Notifications ─────────────────────────────────────────────────────────
    Route::get('/notifications',                [NotificationController::class, 'getCustomerNotifications']);
    Route::get('/notifications/unread-count',   [NotificationController::class, 'unreadCount']);
    Route::patch('/notifications/{id}/read',    [NotificationController::class, 'markAsRead']);
    Route::patch('/notifications/read-all',     [NotificationController::class, 'markAllAsRead']);
    Route::get('/notifications/settings',       [CustomerController::class, 'getNotificationSettings']);
    Route::put('/notifications/settings',       [CustomerController::class, 'updateNotificationSettings']);

    // ── Search ────────────────────────────────────────────────────────────────
    Route::get('/search/suggestions', [CustomerSearchController::class, 'getSearchSuggestions']);

    // ── Payments ─────────────────────────────────────────────────────────────
    Route::get('/payment/methods',                              [PaymentController::class, 'methods']);
    Route::get('/payment/verify',                               [PaymentController::class, 'verify']);
    Route::get('/payment/history',                              [PaymentController::class, 'history']);
    Route::middleware('log.sensitive')->group(function () {
        Route::post('/payment/booking/{bookingId}/initialize',  [PaymentController::class, 'initialize']);
        Route::post('/bookings/{bookingId}/confirm',            [PaymentController::class, 'confirmCompletion']);
    });
    // Ownership check: customer can only view their own payment
    Route::get('/payment/{tx_ref}', [PaymentController::class, 'show']);

    // ── Reviews (booking-scoped) ──────────────────────────────────────────────
    Route::post('/bookings/{bookingID}/review',         [ReviewController::class, 'store']);

    // ── Provider tracking ─────────────────────────────────────────────────────
    Route::get('/bookings/{bookingID}/track',           [ProviderTrackingController::class, 'getProviderLocation']);
});

// ── Split payment routes (customer, separate prefix) ─────────────────────────
Route::middleware(['auth:customer', 'customer.active', 'log.sensitive'])->prefix('payments')->group(function () {
    Route::post('/calculate-deposit',   [PaymentController::class, 'calculateDeposit']);
    Route::post('/process-deposit',     [PaymentController::class, 'processDeposit']);
    Route::post('/process-final',       [PaymentController::class, 'processFinal']);
    Route::get('/status/{bookingId}',   [PaymentController::class, 'getPaymentStatus']);
});

// ==================== PROTECTED PROVIDER ROUTES ====================
// auth:provider      — must have valid provider token
// provider.approved  — account must be approved (not pending/suspended/rejected)
Route::middleware(['auth:provider', 'provider.approved'])->prefix('provider')->group(function () {

    // ── Auth & Profile ────────────────────────────────────────────────────────
    Route::post('/logout',              [OnlineStatusController::class, 'providerLogout']);
    Route::post('/heartbeat',           [OnlineStatusController::class, 'providerHeartbeat']);
    Route::get('/profile',              [ServiceProviderAuthController::class, 'profile']);
    Route::post('/profile/update',      [ServiceProviderAuthController::class, 'updateProfile']);
    Route::post('/profile/password',    [ServiceProviderAuthController::class, 'changePassword']);
    Route::post('/location/update',     [ServiceProviderAuthController::class, 'updateLocation']);
    Route::post('/push-token',          [ServiceProviderAuthController::class, 'updatePushToken']);
    Route::get('/bank-details',         [ServiceProviderAuthController::class, 'getBankDetails']);
    Route::put('/bank-details',         [ServiceProviderAuthController::class, 'updateBankDetails']);

    // ── Dashboard ─────────────────────────────────────────────────────────────
    Route::get('/dashboard/stats',      [ProviderDashboardController::class, 'getStats']);
    Route::get('/schedule',             [ProviderDashboardController::class, 'getSchedule']);
    Route::post('/schedule',            [ProviderDashboardController::class, 'updateSchedule']);
    Route::get('/schedule/today',       [ProviderDashboardController::class, 'getTodaySchedule']);
    Route::get('/earnings/summary',     [ProviderDashboardController::class, 'getEarningsSummary']);
    Route::get('/reviews',              [ProviderDashboardController::class, 'getReviews']);
    Route::get('/requests',             [ProviderDashboardController::class, 'getRequests']);

    // ── Bookings — provider can only act on their own bookings ────────────────
    Route::get('/bookings',             [BookingController::class, 'providerBookings']);
    Route::get('/bookings/pending',     [BookingController::class, 'pendingBookings']);
    Route::get('/bookings/active',      [BookingController::class, 'activeBookings']);
    Route::get('/bookings/completed',   [BookingController::class, 'completedBookings']);

    // Ownership enforced inside each controller method via providerID check
    Route::middleware('ownership:booking,id,providerID')->group(function () {
        Route::get('/bookings/{id}',            [BookingController::class, 'show']);
        Route::get('/requests/{id}',            [BookingController::class, 'show']);
        Route::post('/bookings/{id}/accept',    [BookingController::class, 'accept']);
        Route::post('/bookings/{id}/reject',    [BookingController::class, 'reject']);
        Route::post('/bookings/{id}/start',     [BookingController::class, 'start']);
        Route::post('/bookings/{id}/arrive',    [BookingController::class, 'arrive']);
        Route::post('/bookings/{id}/complete',  [BookingController::class, 'complete']);
        Route::post('/requests/{id}/arrive',    [BookingController::class, 'arrive']);
        Route::post('/requests/{id}/start',     [BookingController::class, 'start']);
        Route::post('/requests/{id}/complete',  [BookingController::class, 'complete']);
    });

    // ── Disputes ──────────────────────────────────────────────────────────────
    Route::post('/bookings/{bookingID}/dispute',    [DisputeController::class, 'providerRaiseDispute']);
    Route::get('/disputes',                         [DisputeController::class, 'getProviderDisputes']);
    Route::middleware('ownership:dispute,disputeID,raised_by_id')->group(function () {
        Route::get('/disputes/{disputeID}',                 [DisputeController::class, 'show']);
        Route::post('/disputes/{disputeID}/messages',       [DisputeController::class, 'addMessage'])->middleware('throttle:10,1');
    });

    // ── Wallet & Withdrawals ──────────────────────────────────────────────────
    Route::get('/wallet',               [WalletController::class, 'dashboard']);
    Route::get('/wallet/transactions',  [WalletController::class, 'transactions']);
    Route::get('/wallet/summary',       [WalletController::class, 'summary']);
    Route::get('/withdrawals',          [WalletController::class, 'withdrawals']);
    Route::get('/withdrawals/{id}',     [WalletController::class, 'showWithdrawal']);
    Route::middleware('log.sensitive')->group(function () {
        Route::post('/wallet/withdraw',         [WalletController::class, 'requestWithdrawal']);
        Route::post('/withdrawals',             [WalletController::class, 'requestWithdrawal']);
        Route::post('/withdrawals/{id}/cancel', [WalletController::class, 'cancelWithdrawal']);
    });
    Route::get('/transactions',         [WalletController::class, 'transactions']);

    // ── Notifications ─────────────────────────────────────────────────────────
    Route::get('/notifications',                [NotificationController::class, 'getProviderNotifications']);
    Route::post('/notifications/{id}/read',     [NotificationController::class, 'markAsRead']);
    Route::post('/notifications/read-all',      [NotificationController::class, 'markAllAsRead']);

    // ── Tracking ──────────────────────────────────────────────────────────────
    Route::post('/tracking/update',                     [ProviderTrackingController::class, 'updateLocation']);
    Route::get('/tracking/booking/{bookingID}',         [ProviderTrackingController::class, 'getBookingRoute']);

    // ── Services ──────────────────────────────────────────────────────────────
    Route::get('/services',         [ServiceController::class, 'index']);
    Route::post('/services',        [ServiceController::class, 'store']);
    Route::put('/services/{id}',    [ServiceController::class, 'update']);
    Route::delete('/services/{id}', [ServiceController::class, 'destroy']);
});

// Provider wallet (separate prefix group)
Route::middleware(['auth:provider', 'provider.approved'])->prefix('wallet')->group(function () {
    Route::get('/transactions', [WalletController::class, 'getTransactions']);
});

// ==================== ADMIN ROUTES ====================
<<<<<<< HEAD
// auth:admin     — must have valid admin token
// ip.whitelist   — only allowed IPs can reach admin routes
// log.sensitive  — every admin action is logged
Route::middleware(['auth:admin', 'ip.whitelist', 'log.sensitive'])->prefix('admin')->group(function () {
=======
Route::group(['middleware' => 'auth:admin', 'prefix' => 'admin'], function () {
    // Statistics
    Route::get('/stats', [AdminAuthController::class, 'getStats']);
    Route::get('/search', [AdminAuthController::class, 'globalSearch']);
    
    // Platform Settings
    Route::get('/settings', [AdminAuthController::class, 'getSettings']);
    Route::post('/settings', [AdminAuthController::class, 'updateSettings']);
    Route::get('/system-report', [AdminAuthController::class, 'generateSystemReport']);
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
>>>>>>> 6bdd6357bb8432c830aaad5c271c4315a495f2da

    // ── Dashboard ─────────────────────────────────────────────────────────────
    Route::get('/stats',    [AdminAuthController::class, 'getStats']);
    Route::get('/search',   [AdminAuthController::class, 'globalSearch']);

    // ── Settings ──────────────────────────────────────────────────────────────
    Route::get('/settings',         [AdminAuthController::class, 'getSettings']);
    Route::post('/settings',        [AdminAuthController::class, 'updateSettings']);
    Route::post('/profile/update',  [AdminAuthController::class, 'updateProfile']);
    Route::post('/profile/picture', [AdminAuthController::class, 'updateProfilePicture']);

    // ── Bookings ──────────────────────────────────────────────────────────────
    Route::get('/bookings', [AdminAuthController::class, 'getAllBookings']);

    // ── Provider Management ───────────────────────────────────────────────────
    Route::get('/providers',            [AdminAuthController::class, 'getAllProviders']);
    Route::get('/providers/pending',    [AdminAuthController::class, 'pendingProviders']);
    Route::get('/providers/approved',   [AdminAuthController::class, 'approvedProviders']);
    Route::get('/providers/rejected',   [AdminAuthController::class, 'rejectedProviders']);
    Route::get('/providers/suspended',  [AdminAuthController::class, 'suspendedProviders']);
    Route::post('/providers/{id}/verify',   [AdminAuthController::class, 'verifyProvider']);
    Route::patch('/providers/{id}/status',  [AdminAuthController::class, 'toggleProviderStatus']);
    Route::delete('/providers/{id}',        [AdminAuthController::class, 'deleteProvider']);

    // ── Customer Management ───────────────────────────────────────────────────
    Route::get('/customers',                [AdminAuthController::class, 'getCustomers']);
    Route::patch('/customers/{id}/status',  [AdminAuthController::class, 'toggleCustomerStatus']);
    Route::delete('/customers/{id}',        [AdminAuthController::class, 'deleteCustomer']);

    // ── Category Management ───────────────────────────────────────────────────
    Route::get('/categories',           [CategoryController::class, 'getCategories']);
    Route::post('/categories',          [CategoryController::class, 'addCategory']);
    Route::put('/categories/{id}',      [CategoryController::class, 'editCategory']);
    Route::delete('/categories/{id}',   [CategoryController::class, 'deleteCategory']);

    // ── Services ──────────────────────────────────────────────────────────────
    Route::get('/services', [AdminAuthController::class, 'getAllServices']);

    // ── Payments & Withdrawals ────────────────────────────────────────────────
    Route::get('/payments',         [PaymentController::class, 'index']);
    Route::get('/payments/stats',   [PaymentController::class, 'getPaymentStats']);
    Route::get('/banks',            [PaymentController::class, 'getBanks']);

    Route::get('/withdrawals',              [AdminWithdrawalController::class, 'index']);
    Route::get('/withdrawals/stats',        [AdminWithdrawalController::class, 'stats']);
    Route::get('/withdrawals/pending',      [AdminWithdrawalController::class, 'getPendingWithdrawals']);
    Route::post('/withdrawals/{id}/approve',[AdminWithdrawalController::class, 'approveWithdrawal']);
    Route::post('/withdrawals/{id}/reject', [AdminWithdrawalController::class, 'rejectWithdrawal']);

    // ── Notifications ─────────────────────────────────────────────────────────
    Route::get('/notifications',        [NotificationController::class, 'index']);
    Route::post('/notifications/read',  [NotificationController::class, 'markAllAsRead']);

    // ── Disputes ──────────────────────────────────────────────────────────────
    Route::get('/disputes',                         [AdminDisputeController::class, 'index']);
    Route::get('/disputes/stats',                   [AdminDisputeController::class, 'stats']);
    Route::get('/disputes/{disputeID}',             [AdminDisputeController::class, 'show']);
    Route::put('/disputes/{disputeID}/status',      [AdminDisputeController::class, 'updateStatus']);
    Route::post('/disputes/{disputeID}/notes',      [AdminDisputeController::class, 'addPrivateNote']);
    Route::post('/disputes/{disputeID}/messages',   [AdminDisputeController::class, 'addMessage'])->middleware('throttle:10,1');
    Route::delete('/disputes/messages/{messageID}', [AdminDisputeController::class, 'deleteMessage']);

    // ── Admin Settings (split payment) ────────────────────────────────────────
    Route::get('/settings/deposit-percentage',  [\App\Http\Controllers\AdminSettingsController::class, 'getDepositPercentage']);
    Route::put('/settings/deposit-percentage',  [\App\Http\Controllers\AdminSettingsController::class, 'updateDepositPercentage']);
});

// ==================== CHAT ROUTES ====================
// Both customers and providers can chat
Route::middleware('auth:customer,provider')->prefix('chat')->group(function () {
    Route::get('/conversations',            [ChatController::class, 'getConversations']);
    Route::post('/conversations',           [ChatController::class, 'getOrCreateConversation']);
    Route::get('/conversations/{id}',       [ChatController::class, 'getMessages']);
    Route::post('/conversations/{id}/read', [ChatController::class, 'markAsRead']);
    Route::post('/messages',                [ChatController::class, 'sendMessage']);
    Route::get('/unread',                   [ChatController::class, 'getUnreadCount']);
});

// ==================== DEBUG (remove in production) ====================
Route::get('/getcodes', [PaymentController::class, 'debugBankCodes']);
