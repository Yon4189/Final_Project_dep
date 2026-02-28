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

// customer registration endpoint
Route::get('/cities', [ServiceCityController::class, 'index']);
Route::get('/test', function () {
    return response()->json([
        'success' => true,
        'message' => 'API is working correctly',
        'server_time' => now()
    ]);
});

Route::get('/public/stats', [AdminAuthController::class, 'getStats']);
Route::post('/customer/register', [CustomerAuthController::class, 'register']);
// Customer login
Route::post('/customer/login', [CustomerAuthController::class, 'login']);
// service provider registration endpoint
Route::post('/provider/register', [ServiceProviderAuthController::class, 'register']);
// provider's login endpoint
Route::post('/provider/login', [ServiceProviderAuthController::class, 'login']);


// admin login route
Route::post('/admin/login', [AdminAuthController::class, 'login']);

Route::get('provider/{providerID}/notifications', [NotificationController::class, 'index']);

Route::get( '/search/providers',[ProviderSearchController::class, 'search']);

Route::post('/forgot-password', [ForgotPasswordController::class, 'sendResetLink']);
Route::post('/reset-password',[ForgotPasswordController::class,'resetPassword']);

Route::get('/admin/stats', [AdminAuthController::class, 'getStats']);
Route::post('/providers/{id}/verify', [AdminAuthController::class, 'verifyProvider']);

Route::get('/providers/pending',[AdminAuthController::class, 'pendingProviders']);
Route::get('/providers/approved',[AdminAuthController::class, 'approvedProviders']);
Route::get('/providers/rejected',[AdminAuthController::class, 'rejectedProviders']);
Route::get('/providers/suspended',[AdminAuthController::class, 'suspendedProviders']);
Route::get('/providers',[AdminAuthController::class, 'getAllProviders']);
Route::get('admin/providers',[AdminAuthController::class, 'getProviders']);
Route::get('admin/customers',[AdminAuthController::class, 'getCustomers']);
Route::delete('admin/customers/{id}',[AdminAuthController::class, 'deleteCustomer']);
Route::delete('admin/providers/{id}',[AdminAuthController::class, 'deleteProvider']);

Route::patch('admin/customers/{id}/status',[AdminAuthController::class, 'toggleCustomerStatus']);
Route::patch('admin/providers/{id}/status',[AdminAuthController::class, 'toggleProviderStatus']);




// add, read, delete, edit catagories
Route::post('/categories', [CategoryController::class, 'addCategory']);
Route::get('/categories', [CategoryController::class, 'getCategories']);
Route::delete('/categories/{id}', [CategoryController::class, 'deleteCategory']);
Route::put('/categories/{id}', [CategoryController::class, 'editCategory']);
Route::get('/services', [ServiceController::class, 'index']);

// Provider Dashboard Routes
Route::get('/provider/dashboard/stats', [ProviderDashboardController::class, 'getStats']);
Route::get('/provider/schedule/today', [ProviderDashboardController::class, 'getTodaySchedule']);
Route::get('/provider/earnings/summary', [ProviderDashboardController::class, 'getEarningsSummary']);
Route::get('/provider/requests', [ProviderDashboardController::class, 'getRequests']);
Route::get('/provider/reviews', [ProviderDashboardController::class, 'getReviews']);
Route::get('/provider/profile', [ServiceProviderAuthController::class, 'getProfile']);

// Webhook Routes (Public)
Route::post('/webhook/chapa', [WebhookController::class, 'handleChapaWebhook']);

// Customer Payment Routes (Mobile App)
Route::post('/customer/payment/initialize', [PaymentController::class, 'initialize']);
Route::get('/customer/payment/verify/{tx_ref}', [PaymentController::class, 'verify']);
Route::get('/customer/payment/{tx_ref}', [PaymentController::class, 'show']);
Route::post('/customer/payment/cancel/{tx_ref}', [PaymentController::class, 'cancel']);
Route::get('/customer/payment/history/{customer_id}', [PaymentController::class, 'customerHistory']);

// Service Provider Withdrawal Routes (Mobile App)
Route::post('/provider/withdrawal/create', [WithdrawalController::class, 'create']);
Route::get('/provider/withdrawal/status/{withdrawal_ref}', [WithdrawalController::class, 'status']);
Route::get('/provider/withdrawal/history/{provider_id}', [WithdrawalController::class, 'providerHistory']);

// Admin Payment Management Routes (Web App)
Route::get('/admin/payments', [PaymentController::class, 'index']);
Route::get('/admin/withdrawals', [WithdrawalController::class, 'index']);
Route::post('/admin/withdrawal/process/{withdrawal_id}', [WithdrawalController::class, 'process']);
Route::post('/admin/withdrawal/cancel/{withdrawal_id}', [WithdrawalController::class, 'cancel']);
Route::get('/admin/payments/stats', [PaymentController::class, 'getPaymentStats']);
Route::get('/admin/withdrawals/stats', [WithdrawalController::class, 'getWithdrawalStats']);

