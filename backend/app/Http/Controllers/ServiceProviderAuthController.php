<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use App\Models\ServiceProvider;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Validator;
use Illuminate\Support\Str;


class ServiceProviderAuthController extends Controller
{
    /**
     * register a new service provider
     * 
     * this handles:
     * - validation of input
     * - password hashing
     * - required ID photo upload
     * - storing data in the serviceProviders table
     * - setting isVerified = 0 by default
     * - returning json response
     */

    
    public function register(Request $request)
    {
    // validate input
    $validator = Validator::make($request->all(), [
        'fullname' => ['required', 'string', 'max:255', 'regex:/^[a-zA-Z\s]+$/'],
        'email' => 'required|email|unique:service_providers,email',
        'phone' => ['required', 'unique:service_providers,phone', 'regex:/^(09|07)[0-9]{8}$/'],
        'password' => 'required|string|min:8|confirmed',
       // 'service_city' => 'nullable|string|max:255',
       // 'catagoryID' => 'nullable|exists:categories,id', // dropdown
        'profilePicture' => 'nullable|image|mimes:jpeg,png,jpg|max:20408',
       'idPhoto' => 'nullable|image|mimes:jpeg,jpg,png|max:20480',
       'idPhotoType' => 'nullable|string|in:Passport,Driver License,National ID,Kebele ID',
    ]);

    if ($validator->fails()) {
        return response()->json([
            'success' => false,
            'message' => 'Validation errors',
            'errors' => $validator->errors()
        ], 422);
    }

    // handle file uploads
    $profilePath = null;
    if ($request->hasFile('profilePicture')) {
        $file = $request->file('profilePicture');
        $profileName = Str::random(20) . '_profile.' . $file->getClientOriginalExtension();
        $file->move(public_path('profilepics'), $profileName);
        $profilePath = 'profilepics/' . $profileName;
    }

    $idPhotoPath = null;
    if ($request->hasFile('idPhoto')) {
        $file = $request->file('idPhoto');
        $idPhotoName = Str::random(20) . '_id.' . $file->getClientOriginalExtension();
        $file->move(public_path('idphoto'), $idPhotoName);
        $idPhotoPath = 'idphoto/' . $idPhotoName;
    }

    // create new provider
    $provider = ServiceProvider::create([
        'fullname' => $request->fullname,
        'email' => $request->email,
        'phone' => $request->phone,
        'password' => Hash::make($request->password),
        'service_city' => $request->service_city,
        'catagoryID' => $request->catagoryID,
        'profilePicture' => $profilePath,
        'idPhoto' => $idPhotoPath,
        'idPhotoType' => $request->idPhotoType, // new
        'isVerified' => null, // default null until admin approves/rejects
    ]);

    return response()->json([
        'success' => true,
        'message' => 'Service provider registered successfully',
        'data' => $provider
    ], 201);
    }

    public function login(Request $request)
    {
        
        $validator = Validator::make($request->all(), [
            'email' => 'required|email',
            'password' => 'required|string',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'message' => 'Validation errors',
                'errors' => $validator->errors()
            ], 422);
        }

        // search for provider by their email
        $provider = ServiceProvider::where('email', $request->email)->first();

        
        if (!$provider || !Hash::check($request->password, $provider->password)) {
            return response()->json([
                'success' => false,
                'message' => 'Invalid email or password'
            ], 401);
        }

        //  Return success
        return response()->json([
            'success' => true,
            'message' => 'Login successful',
            'data' => $provider
        ]);
    }



}
