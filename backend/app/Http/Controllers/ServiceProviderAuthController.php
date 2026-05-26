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
use App\Http\Controllers\OnlineStatusController;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Auth;

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
            'email' => [
                'required',
                'email:rfc',
                'unique:service_providers,email'
            ],
            'phone' => ['required', 'unique:service_providers,phone', 'regex:/^(09|07)[0-9]{8}$/'],
            'password' => [
                'required',
                'string',
                'min:8',
                'confirmed',
                'regex:/[a-z]/',      // must contain at least one lowercase letter
                'regex:/[A-Z]/',      // must contain at least one uppercase letter
                'regex:/[0-9]/',      // must contain at least one digit
            ],
            'service_city' => 'required|string|max:255',
            'catagoryID' => 'required|exists:catagories,catagoryID',
            'profilePicture' => 'nullable|image|mimes:jpeg,png,jpg|max:2048',
            'idPhoto' => 'required|image|mimes:jpeg,jpg,png|max:2048', // ID photo is REQUIRED
            'idPhotoBack' => 'required|image|mimes:jpeg,jpg,png|max:2048', // ID photo back is REQUIRED
            'credentialPhoto' => 'nullable|image|mimes:jpeg,jpg,png|max:2048',
            'certificates' => 'nullable|array',
            'certificates.*' => 'image|mimes:jpeg,jpg,png|max:4096',
            'idPhotoType' => 'required|string|in:Passport,Driver License,National ID,Kebele ID', // ID type is REQUIRED
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
            $fileValidator = app(\App\Services\FileUploadValidator::class);

            $profilePath = null;
            if ($request->hasFile('profilePicture')) {
                try {
                    $fileValidator->validateImage($request->file('profilePicture'), 2048);
                } catch (\InvalidArgumentException $e) {
                    return response()->json(['success' => false, 'message' => 'Profile picture: ' . $e->getMessage()], 422);
                }
                try {
                    $cloudinary = new \Cloudinary\Cloudinary();
                    $result = $cloudinary->uploadApi()->upload($request->file('profilePicture')->getRealPath(), [
                        'folder'        => 'provider_profiles',
                        'resource_type' => 'image',
                        'transformation' => [['width' => 400, 'height' => 400, 'crop' => 'fill', 'gravity' => 'face']],
                    ]);
                    $profilePath = $result['secure_url'];
                } catch (\Exception $e) {
                    \Log::error('Cloudinary profile upload failed: ' . $e->getMessage());
                    // Continue without profile picture
                }
            }

            $idPhotoPath = null;
            if ($request->hasFile('idPhoto')) {
                try {
                    $fileValidator->validateDocument($request->file('idPhoto'), 4096);
                } catch (\InvalidArgumentException $e) {
                    return response()->json(['success' => false, 'message' => 'ID photo: ' . $e->getMessage()], 422);
                }
                $file = $request->file('idPhoto');
                $idPhotoName = $fileValidator->safeFilename($file, 'id');
                $file->move(public_path('idphoto'), $idPhotoName);
                $idPhotoPath = 'idphoto/' . $idPhotoName;
            }

            $idPhotoBackPath = null;
            if ($request->hasFile('idPhotoBack')) {
                try {
                    $fileValidator->validateDocument($request->file('idPhotoBack'), 4096);
                } catch (\InvalidArgumentException $e) {
                    return response()->json(['success' => false, 'message' => 'ID photo back: ' . $e->getMessage()], 422);
                }
                $file = $request->file('idPhotoBack');
                $idPhotoBackName = $fileValidator->safeFilename($file, 'id_back');
                $file->move(public_path('idphoto'), $idPhotoBackName);
                $idPhotoBackPath = 'idphoto/' . $idPhotoBackName;
            }

            $credentialPhotoPath = null;
            if ($request->hasFile('credentialPhoto')) {
                try {
                    $fileValidator->validateDocument($request->file('credentialPhoto'), 4096);
                } catch (\InvalidArgumentException $e) {
                    return response()->json(['success' => false, 'message' => 'Credential photo: ' . $e->getMessage()], 422);
                }
                $file = $request->file('credentialPhoto');
                $credentialName = $fileValidator->safeFilename($file, 'credential');
                $file->move(public_path('credentials'), $credentialName);
                $credentialPhotoPath = 'credentials/' . $credentialName;
            }

            // Handle additional certificates if any
            $certPaths = [];
            if ($request->hasFile('certificates')) {
                $files = $request->file('certificates');
                foreach ($files as $index => $file) {
                    try {
                        $fileValidator->validateDocument($file, 4096);
                        $certName = $fileValidator->safeFilename($file, "cert_{$index}");
                        $file->move(public_path('credentials'), $certName);
                        $certPaths[] = 'credentials/' . $certName;
                    } catch (\Exception $e) {
                        Log::warning("Failed to upload certificate at index {$index}: " . $e->getMessage());
                    }
                }
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
                'idPhotoBack' => $idPhotoBackPath,
                'credentialPhoto' => $credentialPhotoPath,
                'idPhotoType' => $request->idPhotoType,
                'certifications' => $certPaths, // Store array of paths
                'current_latitude' => $request->current_latitude,
                'current_longitude' => $request->current_longitude,
                'status' => 'pending', // newly registered will have pending status
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
            $this->notificationService->notifyAdminsNewProvider($provider);

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
        // Validate input with DNS check
        $validator = Validator::make($request->all(), [
            'email' => 'required|email:rfc',
            'password' => 'required|string'
        ]);

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'message' => 'Please provide valid email and password',
                'errors' => $validator->errors()
            ], 422);
        }

        // Find provider by email
        $provider = ServiceProvider::where('email', $request->email)->first();
        
        // Check if provider exists and verify password
        // Use generic error message for security (don't reveal if email exists or password is wrong)
        if (!$provider || !Hash::check($request->password, $provider->password)) {
            return response()->json([
                'success' => false,
                'message' => 'Invalid email or password. Please try again'
            ], 401);
        }

        // Only block rejected and suspended accounts from logging in
        // Pending accounts CAN login to complete their profile
        


        // Check account status - suspended
        if (in_array(strtolower($provider->status), ['suspended'])) {
            return response()->json([
                'success' => false,
                'message' => 'Your account has been suspended. Please contact support'
            ], 403);
        }
        
        // Create authentication token
        $token = $provider->createToken('auth_token', ['*'], now()->addMinutes(1440))->plainTextToken;
        
        // Set online status
        Cache::put("provider_online_{$provider->providerID}", true, now()->addMinutes(2));
        
        ServiceProvider::where('providerID', $provider->providerID)
            ->update([
                'is_online' => true,
                'last_seen_at' => now()
            ]);
        
        return response()->json([
            'success' => true,
            'message' => 'Login successful',
            'data' => [
                'user' => $provider,
                'token' => $token,
                'token_type' => 'Bearer',
                'expires_in' => config('sanctum.expiration', 1440),
                'status' => $provider->status, // Include status for frontend
                'is_approved' => in_array(strtolower($provider->status), ['active', 'approved']),
                'is_pending' => strtolower($provider->status) === 'pending'
            ]
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
     * Revoke ALL tokens for this provider (logout from all devices)
     */
    public function logoutAllDevices(Request $request)
    {
        $provider = auth()->guard('provider')->user();

        if (!$provider) {
            return response()->json(['success' => false, 'message' => 'Unauthorized'], 401);
        }

        $provider->tokens()->delete();

        return response()->json([
            'success' => true,
            'message' => 'Logged out from all devices successfully'
        ]);
    }

    /**
     * Toggle provider availability (accepting jobs or not)
     * PATCH /api/provider/availability
     * 
     * Note: This method is defined later in the file
     */

    /**
     * Get authenticated provider profile
     */
    public function profile(Request $request)
    {
        $provider = $request->user();
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
                'business_license' => $provider->business_license,
                'insurance_certificate' => $provider->insurance_certificate,
                'certifications' => $provider->certifications,
                'isAvailable' => (bool) $provider->is_online,
                'is_online' => (bool) $provider->is_online,
            ]
        ]);
    }

    /**
     * Update provider availability (Online/Offline status)
     */
    public function updateAvailability(Request $request)
    {
        $request->validate([
            'isAvailable' => 'required|boolean'
        ]);

        $provider = $request->user();
        
        // Update both is_available and is_online to keep them in sync
        $provider->is_available = $request->isAvailable;
        $provider->is_online = $request->isAvailable;
        $provider->last_seen_at = now();
        $provider->save();

        return response()->json([
            'success' => true,
            'message' => $request->isAvailable ? 'You are now available for work' : 'You are now unavailable',
            'data' => [
                'isAvailable' => (bool) $provider->is_available,
                'is_online' => (bool) $provider->is_online
            ]
        ]);
    }

    /**
     * Build the profile data array (shared between profile() and updateAvailability())
     */
    private function buildProfileData(ServiceProvider $provider): array
    {
        return [
            'providerID'             => $provider->providerID,
            'fullname'               => $provider->fullname,
            'email'                  => $provider->email,
            'phone'                  => $provider->phone,
            'profilePicture'         => $provider->profilePicture,
            'service_city'           => $provider->service_city,
            'bio'                    => $provider->bio,
            'rating'                 => $provider->rating,
            'completed_jobs'         => $provider->completed_jobs,
            'accepted_jobs'          => $provider->accepted_jobs,
            'success_rate'           => $provider->success_rate,
            'walletBalance'          => $provider->walletBalance,
            'serviceRadiusKm'        => $provider->serviceRadiusKm,
            'current_latitude'       => $provider->current_latitude,
            'current_longitude'      => $provider->current_longitude,
            'status'                 => $provider->status,
            'isAvailable'            => (bool) $provider->is_available,
            'is_online'              => (bool) $provider->is_online,
            'last_seen_at'           => $provider->last_seen_at,
            'category'               => $provider->category,
            'services'               => $provider->services,
            'business_license'       => $provider->business_license,
            'insurance_certificate'  => $provider->insurance_certificate,
            'certifications'         => $provider->certifications,
        ];
    }

    /**
     * Update provider profile
     */
    public function updateProfile(Request $request)
    {
        $provider = $request->user();
        \Log::info('Profile Update Request Received', [
            'provider_id' => $provider->providerID,
            'content_type' => $request->header('Content-Type'),
            'all_data' => $request->all(),
            'files' => array_keys($request->allFiles())
        ]);

        $validator = Validator::make($request->all(), [
            'fullname' => 'sometimes|string|max:255',
            'email' => 'sometimes|email|unique:service_providers,email,' . $provider->providerID . ',providerID',
            'phone' => 'sometimes|string|unique:service_providers,phone,' . $provider->providerID . ',providerID',
            'bio' => 'nullable|string|max:500',
            'service_city' => 'sometimes|string|max:255',
            'idPhotoType' => 'sometimes|string|max:255',
            'idPhoto' => 'nullable|image|mimes:jpeg,jpg,png|max:2048',
            'idPhotoBack' => 'nullable|image|mimes:jpeg,jpg,png|max:2048',
            'serviceRadiusKm' => 'nullable|numeric|min:1|max:100',
            'profilePicture' => 'nullable|image|mimes:jpeg,png,jpg|max:2048',
            'business_license' => 'nullable|file|mimes:jpeg,png,jpg,pdf|max:4096',
            'insurance_certificate' => 'nullable|file|mimes:jpeg,png,jpg,pdf|max:4096',
            'certifications' => 'nullable|string', // JSON string from frontend
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
            try {
                $cloudinary = new \Cloudinary\Cloudinary();
                $result = $cloudinary->uploadApi()->upload($request->file('profilePicture')->getRealPath(), [
                    'folder'        => 'provider_profiles',
                    'public_id'     => 'provider_' . $provider->providerID,
                    'overwrite'     => true,
                    'resource_type' => 'image',
                    'transformation' => [['width' => 400, 'height' => 400, 'crop' => 'fill', 'gravity' => 'face']],
                ]);
                $provider->profilePicture = $result['secure_url'];
            } catch (\Exception $e) {
                \Log::error('Cloudinary profile update failed: ' . $e->getMessage());
                return response()->json(['success' => false, 'message' => 'Profile picture upload failed'], 500);
            }
        }

        // Handle id photo uploads
        if ($request->hasFile('idPhoto')) {
            if ($provider->idPhoto && file_exists(public_path($provider->idPhoto))) {
                unlink(public_path($provider->idPhoto));
            }
            $file = $request->file('idPhoto');
            $idPhotoName = Str::random(20) . '_id.' . $file->getClientOriginalExtension();
            $file->move(public_path('idphoto'), $idPhotoName);
            $provider->idPhoto = 'idphoto/' . $idPhotoName;
        }

        if ($request->hasFile('idPhotoBack')) {
            if ($provider->idPhotoBack && file_exists(public_path($provider->idPhotoBack))) {
                unlink(public_path($provider->idPhotoBack));
            }
            $file = $request->file('idPhotoBack');
            $idPhotoBackName = Str::random(20) . '_id_back.' . $file->getClientOriginalExtension();
            $file->move(public_path('idphoto'), $idPhotoBackName);
            $provider->idPhotoBack = 'idphoto/' . $idPhotoBackName;
        }

        // Handle documents
        $documents = ['business_license', 'insurance_certificate'];
        foreach ($documents as $doc) {
            if ($request->hasFile($doc)) {
                if ($provider->$doc && file_exists(public_path($provider->$doc))) {
                    unlink(public_path($provider->$doc));
                }
                $file = $request->file($doc);
                $docName = Str::random(20) . "_{$doc}." . $file->getClientOriginalExtension();
                $file->move(public_path('credentials'), $docName);
                $provider->$doc = 'credentials/' . $docName;
            }
        }

        // Handle certifications JSON
        if ($request->has('certifications')) {
            $provider->certifications = json_decode($request->certifications, true);
        }

        // Update other fields
        $fillable = ['fullname', 'email', 'phone', 'bio', 'service_city', 'idPhotoType', 'serviceRadiusKm', 
                     'current_latitude', 'current_longitude'];
        
        foreach ($fillable as $field) {
            if ($request->has($field)) {
                $provider->$field = $request->$field;
            }
        }
        
        // If the provider was rejected, set status back to pending after update
        if (strtolower($provider->status) === 'rejected') {
            $provider->status = 'pending';
            $provider->rejected_at = null;
            $provider->rejection_reason = null;
            
            // Notify admins that the profile has been updated for re-review
            $this->notificationService->notifyAdminsProviderProfileUpdated($provider);
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

    public function updatePushToken(Request $request)
    {
        $provider = $request->user();
        
        $request->validate([
            'push_token' => 'required|string'
        ]);

        $provider->update(['expo_push_token' => $request->push_token]);

        return response()->json([
            'success' => true,
            'message' => 'Push token updated successfully'
        ]);
    }

    /**
     * Get provider bank details
     */
    public function getBankDetails(Request $request)
    {
        $provider = $request->user();
        
        return response()->json([
            'success' => true,
            'data' => [
                'bankName' => $provider->bank_name,
                'accountNumber' => $provider->account_number,
                'accountName' => $provider->account_holder_name,
                'telebirNumber' => $provider->telebir_number,
                'telebirHolderName' => $provider->telebir_holder_name,
                'preferredPayoutMethod' => $provider->preferred_payout_method ?? 'bank',
                'isVerified' => (bool) ($provider->bank_name && $provider->account_number),
            ]
        ]);
    }

    /**
     * Update provider bank details
     */
    public function updateBankDetails(Request $request)
    {
        $provider = $request->user();

        $validator = Validator::make($request->all(), [
            'bankName' => 'nullable|string|max:255',
            'accountNumber' => 'nullable|string|max:50',
            'accountName' => 'nullable|string|max:255',
            'telebirNumber' => 'nullable|string|max:20',
            'telebirHolderName' => 'nullable|string|max:255',
            'preferredPayoutMethod' => 'nullable|string|in:bank,telebir',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'message' => 'Validation errors',
                'errors' => $validator->errors()
            ], 422);
        }

        // Map frontend camelCase to backend snake_case
        $mapping = [
            'bankName' => 'bank_name',
            'accountNumber' => 'account_number',
            'accountName' => 'account_holder_name',
            'telebirNumber' => 'telebir_number',
            'telebirHolderName' => 'telebir_holder_name',
            'preferredPayoutMethod' => 'preferred_payout_method'
        ];

        foreach ($mapping as $frontend => $backend) {
            if ($request->has($frontend)) {
                $provider->$backend = $request->$frontend;
            }
        }

        $provider->save();

        return response()->json([
            'success' => true,
            'message' => 'Bank details updated successfully',
            'data' => $this->getBankDetails($request)->original['data']
        ]);
    }

    /**
     * Change provider password
     */
    public function changePassword(Request $request)
    {
        $provider = Auth::guard('provider')->user();

        if (!$provider) {
            return response()->json([
                'success' => false,
                'message' => 'Provider not found'
            ], 404);
        }

        $validated = $request->validate([
            'current_password' => 'required',
            'new_password' => [
                'required',
                'string',
                'min:8',
                'confirmed',
                'regex:/[a-z]/',      // must contain at least one lowercase letter
                'regex:/[A-Z]/',      // must contain at least one uppercase letter
                'regex:/[0-9]/',      // must contain at least one digit
            ],
        ]);

        if (!Hash::check($validated['current_password'], $provider->password)) {
            return response()->json([
                'success' => false,
                'message' => 'Current password is incorrect'
            ], 400);
        }

        $provider->password = Hash::make($validated['new_password']);
        $provider->save();

        return response()->json([
            'success' => true,
            'message' => 'Password changed successfully'
        ]);
    }
}