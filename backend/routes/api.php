<?php

use Illuminate\Support\Facades\Route;
use App\Http\Controllers\CustomerAuthController;
use App\Http\Controllers\ServiceProviderAuthController;
use App\Http\Controllers\NotificationController;
use App\Http\Controllers\AdminAuthController;

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



