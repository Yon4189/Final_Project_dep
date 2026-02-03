<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use App\Models\Admin;
use Illuminate\Support\Facades\Hash;

class AdminAuthController extends Controller
{
    public function login(Request $request)
    {
        // Validate required fields
        $request->validate([
            'email' => 'required|email',
            'password' => 'required'
        ]);

        // Use input() to safely get the data (works with JSON or form-data)
        $email = $request->input('email');
        $password = $request->input('password');

        // Find the admin by email
        $admin = Admin::where('email', $email)->first();

        // Check if admin exists and password matches
        if (!$admin || !Hash::check($password, $admin->password)) {
            return response()->json([
                'success' => false,
                'message' => 'Invalid credentials'
            ], 401);
        }

        // Login successful
        return response()->json([
            'success' => true,
            'message' => 'Login successful',
            'data' => $admin
        ]);
    }
}