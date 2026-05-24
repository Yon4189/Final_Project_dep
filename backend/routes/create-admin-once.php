<?php

use Illuminate\Support\Facades\Route;
use Illuminate\Support\Facades\Hash;
use App\Models\Admin;

/*
 * ONE-TIME ADMIN CREATION ROUTE
 * 
 * This route creates an admin user with predefined credentials.
 * After using it once, DELETE THIS FILE for security.
 * 
 * Usage: Visit https://your-railway-url.up.railway.app/api/create-admin-once
 */

Route::get('/create-admin-once', function () {
    try {
        // Check if admin already exists
        $existingAdmin = Admin::where('email', 'admin@gmail.com')->first();
        
        if ($existingAdmin) {
            return response()->json([
                'status' => 'error',
                'message' => 'Admin user already exists with this email.',
                'email' => 'admin@gmail.com'
            ], 409);
        }

        // Create the admin user
        $admin = Admin::create([
            'name' => 'Admin',
            'email' => 'admin@gmail.com',
            'password' => Hash::make('admin12345'),
        ]);

        return response()->json([
            'status' => 'success',
            'message' => 'Admin user created successfully!',
            'admin' => [
                'id' => $admin->id,
                'name' => $admin->name,
                'email' => $admin->email,
            ],
            'credentials' => [
                'email' => 'admin@gmail.com',
                'password' => 'admin12345'
            ],
            'warning' => 'DELETE the file backend/routes/create-admin-once.php NOW for security!'
        ], 201);

    } catch (\Exception $e) {
        return response()->json([
            'status' => 'error',
            'message' => 'Failed to create admin user',
            'error' => $e->getMessage()
        ], 500);
    }
});
