<?php

use Illuminate\Support\Facades\Route;
use App\Http\Controllers\CustomerAuthController;
use App\Http\Controllers\ServiceProviderAuthController;
use App\Http\Controllers\NotificationController;
use App\Http\Controllers\AdminAuthController;
use App\Http\Controllers\ProvidersearchController;
use App\Http\Controllers\ForgotPasswordController;
use App\Http\Controllers\CategoryController;

// customer registration endpoint
Route::get('/test', function () {
    return response()->json([
        'success' => true,
        'message' => 'API is working correctly',
        'server_time' => now()
    ]);
});
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



Route::post('/providers/{id}/verify', [AdminAuthController::class, 'verifyProvider']);

Route::get('/providers/pending',[AdminAuthController::class, 'pendingProviders']);

// add, read, delete, edit catagories
Route::post('/categories', [CategoryController::class, 'addCategory']);
Route::get('/categories', [CategoryController::class, 'getCategories']);
Route::delete('/categories/{id}', [CategoryController::class, 'deleteCategory']);
Route::put('/categories/{id}', [CategoryController::class, 'editCategory']);

