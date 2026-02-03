<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use App\Models\Customer;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Str;

class CustomerAuthController extends Controller
{
    /**
     * register a new customer
     * 
     * this handles:
     * - validation of input
     * - password hashing
     * - optional profile picture upload
     * - storing data in the customers table
     * - returning json response
     */
    public function register(Request $request)
    {
        // validate required fields
        $request->validate([
            'fullname' => 'required|string|max:255',
            'email' => 'required|email|unique:customers,email',
            'phone' => [
                        'required',
                        'unique:serviceproviders,phone',
                        'regex:/^(09|07)[0-9]{8}$/'
                ],
            'password' => 'required|string|min:8|confirmed', // expects password_confirmation field
            'profilePicture' => 'sometimes|image|max:2048' // optional, max 2mb
        ]);

        // handle profile picture if provided
        $profilePath = null;
        if ($request->hasFile('profilePicture')) {
            $file = $request->file('profilePicture');
            $filename = Str::random(20) . '.' . $file->getClientOriginalExtension();
            $file->move(public_path('profilepics'), $filename);
            $profilePath = 'profilepics/' . $filename; // store relative path in DB
        }

        // create new customer
        $customer = Customer::create([
            'fullname' => $request->fullname,
            'email' => $request->email,
            'phone' => $request->phone,
            'password' => Hash::make($request->password),
            'profilePicture' => $profilePath
        ]);

        // return json response
        return response()->json([
            'success' => true,
            'message' => 'customer registered successfully',
            'data' => $customer
        ], 201);
    }

public function login(Request $request)
{
    $request->validate([
        'email' => 'required|email',
        'password' => 'required|string',
    ]);

    $customer = Customer::where('email', $request->email)->first();

    if (!$customer || !Hash::check($request->password, $customer->password)) {
        return response()->json([
            'success' => false,
            'message' => 'Invalid credentials'
        ], 401);
    }

    return response()->json([
        'success' => true,
        'message' => 'Login successful',
        'data' => $customer
    ]);
}
}
