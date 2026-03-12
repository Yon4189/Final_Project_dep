<?php

namespace App\Http\Controllers;

use App\Models\ServiceProvider;
use App\Models\Service;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Validator;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use Illuminate\Support\Facades\Log;

class ServiceProviderAuthController extends Controller
{
    protected $notificationService;

    public function __construct(\App\Services\NotificationService $notificationService)
    {
        $this->notificationService = $notificationService;
    }

    /**
     * Register a new service provider
     */
    public function register(Request $request)
    {
        // Log incoming data (excluding sensitive info)
        Log::info('Provider registration attempt:', $request->except(['password', 'password_confirmation', 'idPhoto']));

        // Validate input
        $validator = Validator::make($request->all(), [
            'fullname' => ['required', 'string', 'max:255'],
            'email' => 'required|email|unique:service_providers,email',
            'phone' => ['required', 'unique:service_providers,phone', 'regex:/^(09|07)[0-9]{8}$/'],
            'password' => 'required|string|min:8|confirmed',
            'service_city' => 'required|string|max:255',
            'catagoryID' => 'required|exists:catagories,catagoryID',
            'profilePicture' => 'nullable|image|mimes:jpeg,png,jpg|max:2048',
            'idPhoto' => 'required|image|mimes:jpeg,jpg,png|max:2048',
            'credentialPhoto' => 'required|image|mimes:jpeg,jpg,png|max:2048',
            'idPhotoType' => 'required|string|in:Passport,Driver License,National ID,Kebele ID',
            'current_latitude' => 'nullable|numeric|between:-90,90',
            'current_longitude' => 'nullable|numeric|between:-180,180',
        ]);

        if ($validator->fails()) {
            Log::warning('Provider registration validation failed:', $validator->errors()->toArray());
            return response()->json([
                'success' => false,
                'message' => 'Validation errors',
                'errors' => $validator->errors()
            ], 422);
        }

        try {
            DB::beginTransaction();

            // Ensure directories exist
            if (!file_exists(public_path('profilepics'))) mkdir(public_path('profilepics'), 0755, true);
            if (!file_exists(public_path('idphoto'))) mkdir(public_path('idphoto'), 0755, true);
            if (!file_exists(public_path('credentials'))) mkdir(public_path('credentials'), 0755, true);

            // Handle file uploads
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

            $credentialPhotoPath = null;
            if ($request->hasFile('credentialPhoto')) {
                $file = $request->file('credentialPhoto');
                $credentialName = Str::random(20) . '_credential.' . $file->getClientOriginalExtension();
                $file->move(public_path('credentials'), $credentialName);
                $credentialPhotoPath = 'credentials/' . $credentialName;
            }

            // Create new provider
            $provider = ServiceProvider::create([
                'fullname' => $request->fullname,
                'email' => $request->email,
                'phone' => $request->phone,
                'password' => Hash::make($request->password),
                'service_city' => $request->service_city,
                'catagoryID' => $request->catagoryID,
                'profilePicture' => $profilePath,
                'idPhoto' => $idPhotoPath,
                'credentialPhoto' => $credentialPhotoPath,
                'idPhotoType' => $request->idPhotoType,
                'current_latitude' => $request->current_latitude,
                'current_longitude' => $request->current_longitude,
                'status' => 'pending', // Needs admin approval
                'rating' => 0,
                'completed_jobs' => 0,
                'accepted_jobs' => 0,
            ]);

            // Handle services if provided (for providers offering multiple services)
            if ($request->has('services')) {
                try {
                    $services = json_decode($request->services, true);
                    if (is_array($services)) {
                        foreach ($services as $serviceData) {
                            Service::create([
                                'providerID' => $provider->providerID,
                                'catagoryID' => $serviceData['categoryId'] ?? $request->catagoryID,
                                'title' => $serviceData['serviceName'],
                                'estimatedPrice' => $serviceData['basePrice'],
                                'description' => $serviceData['description'] ?? '',
                            ]);
                        }
                        Log::info('Created services for provider:', ['count' => count($services)]);
                    }
                } catch (\Exception $e) {
                    Log::error('Error saving provider services:', ['error' => $e->getMessage()]);
                }
            }

            DB::commit();

            // Notify admins about new registration
            $this->notificationService->toAdmins(
                \App\Services\NotificationService::TYPE_NEW_PROVIDER_REGISTRATION,
                'New Provider Registration',
                "New provider registered: {$provider->fullname}. Pending approval.",
                [
                    'provider_id' => $provider->providerID,
                    'fullname' => $provider->fullname,
                    'email' => $provider->email
                ]
            );

            // Don't return token - provider must wait for approval
            return response()->json([
                'success' => true,
                'message' => 'Service provider registered successfully. Pending admin approval.',
                'data' => [
                    'providerID' => $provider->providerID,
                    'fullname' => $provider->fullname,
                    'email' => $provider->email,
                    'phone' => $provider->phone,
                    'status' => $provider->status
                ]
            ], 201);

        } catch (\Exception $e) {
            DB::rollBack();
            Log::error('Provider registration failed:', ['error' => $e->getMessage()]);
            
            return response()->json([
                'success' => false,
                'message' => 'Registration failed: ' . $e->getMessage()
            ], 500);
        }
    }

    /**
     * Login for service providers
     */
    public function login(Request $request)
    {
        // Validate input
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

        // Find provider by email
        $provider = ServiceProvider::where('email', $request->email)->first();

        // Check if provider exists and password is correct
        if (!$provider || !Hash::check($request->password, $provider->password)) {
            return response()->json([
                'success' => false,
                'message' => 'Invalid email or password'
            ], 401);
        }

        // Check if provider is approved
        /*if ($provider->status !== 'approved') {
            $message = $provider->status === 'pending' 
                ? 'Your account is pending admin approval' 
                : 'Your account has been rejected. Please contact support.';
            
            return response()->json([
                'success' => false,
                'message' => $message,
                'status' => $provider->status
            ], 403);
        } */  
            /* provider can login even if not approved, 
            but they won't show up in search results until approved. 
             *This allows them to update/finish their profile and services while waiting for approval.
            */
        // Update location if provided
        if ($request->has('current_latitude') && $request->has('current_longitude')) {
            $provider->current_latitude = $request->current_latitude;
            $provider->current_longitude = $request->current_longitude;
            $provider->save();
        }

        // Create Sanctum token
        $token = $provider->createToken('provider-token', ['provider'])->plainTextToken;

        // Build response data
        $responseData = [
            'providerID' => $provider->providerID,
            'fullname' => $provider->fullname,
            'email' => $provider->email,
            'phone' => $provider->phone,
            'profilePicture' => $provider->profilePicture,
            'service_city' => $provider->service_city,
            'bio' => $provider->bio,
            'rating' => $provider->rating,
            'completed_jobs' => $provider->completed_jobs,
            'success_rate' => $provider->success_rate,
            'status' => $provider->status,
            'token' => $token,
        ];

        return response()->json([
            'success' => true,
            'message' => 'Login successful',
            'data' => $responseData
        ]);
    }

    /**
     * Logout provider (revoke token)
     */
    public function logout(Request $request)
    {
        $request->user()->currentAccessToken()->delete();

        return response()->json([
            'success' => true,
            'message' => 'Logged out successfully'
        ]);
    }

    /**
     * Get authenticated provider profile
     */
    public function profile(Request $request)
    {
        $provider = $request->user();
        
        // Load relationships
        $provider->load(['services', 'category']);

        return response()->json([
            'success' => true,
            'data' => [
                'providerID' => $provider->providerID,
                'fullname' => $provider->fullname,
                'email' => $provider->email,
                'phone' => $provider->phone,
                'profilePicture' => $provider->profilePicture,
                'service_city' => $provider->service_city,
                'bio' => $provider->bio,
                'rating' => $provider->rating,
                'completed_jobs' => $provider->completed_jobs,
                'accepted_jobs' => $provider->accepted_jobs,
                'success_rate' => $provider->success_rate,
                'walletBalance' => $provider->walletBalance,
                'serviceRadiusKm' => $provider->serviceRadiusKm,
                'current_latitude' => $provider->current_latitude,
                'current_longitude' => $provider->current_longitude,
                'status' => $provider->status,
                'category' => $provider->category,
                'services' => $provider->services,
            ]
        ]);
    }

    /**
     * Update provider profile
     */
    public function updateProfile(Request $request)
    {
        $provider = $request->user();

        $validator = Validator::make($request->all(), [
            'fullname' => 'sometimes|string|max:255',
            'phone' => 'sometimes|string|unique:service_providers,phone,' . $provider->providerID . ',providerID',
            'bio' => 'nullable|string|max:500',
            'service_city' => 'sometimes|string|max:255',
            'serviceRadiusKm' => 'nullable|numeric|min:1|max:100',
            'profilePicture' => 'nullable|image|mimes:jpeg,png,jpg|max:2048',
            'current_latitude' => 'nullable|numeric|between:-90,90',
            'current_longitude' => 'nullable|numeric|between:-180,180',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'message' => 'Validation errors',
                'errors' => $validator->errors()
            ], 422);
        }

        // Handle profile picture upload
        if ($request->hasFile('profilePicture')) {
            // Delete old profile picture if exists
            if ($provider->profilePicture && file_exists(public_path($provider->profilePicture))) {
                unlink(public_path($provider->profilePicture));
            }

            $file = $request->file('profilePicture');
            $profileName = Str::random(20) . '_profile.' . $file->getClientOriginalExtension();
            $file->move(public_path('profilepics'), $profileName);
            $provider->profilePicture = 'profilepics/' . $profileName;
        }

        // Update other fields
        $fillable = ['fullname', 'phone', 'bio', 'service_city', 'serviceRadiusKm', 
                     'current_latitude', 'current_longitude'];
        
        foreach ($fillable as $field) {
            if ($request->has($field)) {
                $provider->$field = $request->$field;
            }
        }

        $provider->save();

        return response()->json([
            'success' => true,
            'message' => 'Profile updated successfully',
            'data' => $provider
        ]);
    }

    /**
     * Update provider's current location (called frequently by app)
     */
    public function updateLocation(Request $request)
    {
        $validator = Validator::make($request->all(), [
            'latitude' => 'required|numeric|between:-90,90',
            'longitude' => 'required|numeric|between:-180,180',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'errors' => $validator->errors()
            ], 422);
        }

        $provider = $request->user();
        $provider->current_latitude = $request->latitude;
        $provider->current_longitude = $request->longitude;
        $provider->save();

        return response()->json([
            'success' => true,
            'message' => 'Location updated'
        ]);
    }
}