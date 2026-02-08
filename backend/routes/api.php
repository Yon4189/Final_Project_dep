<?php

use Illuminate\Support\Facades\Route;
use App\Http\Controllers\CustomerAuthController;
use App\Http\Controllers\ServiceProviderAuthController;
use App\Http\Controllers\NotificationController;
use App\Http\Controllers\AdminAuthController;
use App\Http\Controllers\ProvidersearchController;
use App\Http\Controllers\ForgotPasswordController;



// customer registration endpoint
Route::post('/register/customer', [CustomerAuthController::class, 'register']);
// Customer login
Route::post('/login/customer', [CustomerAuthController::class, 'login']);


// service provider registration endpoint
Route::post('/register/provider', [ServiceProviderAuthController::class, 'register']);
// provider's login endpoint
Route::post('/login/provider', [ServiceProviderAuthController::class, 'login']);


// admin login route
Route::post('/login/admin', [AdminAuthController::class, 'login']);

Route::get('provider/{providerID}/notifications', [NotificationController::class, 'index']);

Route::get( '/search/providers',[ProviderSearchController::class, 'search']);


Route::post('/forgot-password', [ForgotPasswordController::class, 'sendResetLink']);
Route::post('/reset-password',[ForgotPasswordController::class,'resetPassword']);



Route::post('/providers/{id}/verify', [AdminAuthController::class, 'verifyProvider']);

Route::get('/providers/pending',[AdminAuthController::class, 'pendingProviders']);
