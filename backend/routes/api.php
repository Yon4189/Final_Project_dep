<?php

use Illuminate\Support\Facades\Route;
use App\Http\Controllers\CustomerAuthController;
use App\Http\Controllers\ServiceProviderAuthController;
use App\Http\Controllers\AdminAuthController;

// customer registration endpoint
Route::post('/register/customer', [CustomerAuthController::class, 'register']);

// service provider registration endpoint
Route::post('/register/provider', [ServiceProviderAuthController::class, 'register']);
// Admin login endpoint
Route::post('/admin/login', [AdminAuthController::class, 'login']);