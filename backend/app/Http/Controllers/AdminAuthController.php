<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use App\Models\Admin;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Validator;

class AdminAuthController extends Controller
{
    public function login(Request $request)
    {
        $validator = Validator::make($request->all(), [
            'email' => 'required|email',
            'password' => 'required|string',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'message' => 'Validation failed',
                'errors' => $validator->errors()
            ], 422);
        }

        // 1. Find the admin
        $admin = Admin::where('email', $request->email)->first();

        // 2. The Login Check (Line 29)
        // Note: We use $admin->password because 'password' is in your $fillable array
        if (!$admin || !Hash::check($request->password, $admin->password)) {
            return response()->json([
                'success' => false,
                'message' => 'Invalid credentials'
            ], 401);
        }

        // 3. Success Response matching your React frontend expectations
        return response()->json([
            'success' => true,
            'message' => 'Login successful',
            'data' => [
                'adminID'  => $admin->adminID, // Matches your primaryKey
                'fullname' => $admin->fullname, // Matches your fillable
                'email'    => $admin->email,
            ]
        ]);
    }
}