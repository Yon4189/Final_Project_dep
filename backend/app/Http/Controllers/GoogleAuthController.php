<?php

namespace App\Http\Controllers;

use App\Models\Customer;
use App\Models\ServiceProvider;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Str;

class GoogleAuthController extends Controller
{
    /**
     * Authenticate a customer via Google ID token.
     * The mobile app exchanges the Google auth code for an ID token,
     * then sends it here for verification and login/registration.
     */
    public function customerGoogleAuth(Request $request)
    {
        return $this->processGoogleAuth($request, 'customer');
    }

    /**
     * Authenticate a provider via Google ID token.
     */
    public function providerGoogleAuth(Request $request)
    {
        return $this->processGoogleAuth($request, 'provider');
    }

    /**
     * Internal helper to handle Google Auth for both roles.
     */
    private function processGoogleAuth(Request $request, string $role)
    {
        $request->validate([
            'id_token' => 'required|string',
        ]);

        try {
            $payload = $this->verifyGoogleToken($request->id_token);

            if (!$payload) {
                return response()->json(['success' => false, 'message' => 'Invalid Google token'], 401);
            }

            $email = $payload['email'];
            $name  = $payload['name'] ?? $email;
            $picture = $payload['picture'] ?? null;
            $googleId = $payload['sub'];

            if ($role === 'customer') {
                $user = Customer::where('email', $email)->first();
                if (!$user) {
                    return response()->json([
                        'success' => false, 
                        'message' => 'No account found with this Google email. Please register first.'
                    ], 404);
                }
                
                if (!$user->google_id) {
                    $user->update(['google_id' => $googleId]);
                }
                $primaryKey = 'customerID';
            } else {
                $user = ServiceProvider::where('email', $email)->first();
                if (!$user) {
                    return response()->json([
                        'success' => false, 
                        'message' => 'No provider account found with this Google email. Please register first.'
                    ], 404);
                }
                
                if (!$user->google_id) {
                    $user->update(['google_id' => $googleId]);
                }
                $primaryKey = 'providerID';
            }

            if (isset($user->status) && strtolower($user->status) === 'suspended') {
                return response()->json(['success' => false, 'message' => 'Your account has been suspended.'], 403);
            }

            Cache::put("{$role}_online_{$user->$primaryKey}", true, now()->addMinutes(2));
            $user->update(['is_online' => true, 'last_seen_at' => now()]);

            $token = $user->createToken('auth_token', ['*'], now()->addMinutes(1440))->plainTextToken;

            $data = [
                $primaryKey      => $user->$primaryKey,
                'user_type'      => $role,
                'token'          => $token,
                'profilePicture' => $user->profilePicture,
                'fullname'       => $user->fullname,
                'email'          => $user->email,
                'phone'          => $user->phone,
                'service_city'   => $user->service_city,
                'location'       => $user->location ?? null,
                'is_online'      => true,
            ];

            if ($role === 'customer') {
                $data['needs_phone_update'] = ($user->phone === '0900000000');
            } else {
                $data['status'] = $user->status;
            }

            return response()->json([
                'success' => true,
                'message' => 'Google login successful',
                'data' => $data
            ]);
        } catch (\Exception $e) {
            Log::error("Google auth error ({$role}): " . $e->getMessage());
            return response()->json(['success' => false, 'message' => 'Google authentication failed'], 500);
        }
    }

    /**
     * Verify the Google ID token using Google's tokeninfo endpoint.
     */
    private function verifyGoogleToken(string $idToken): ?array
    {
        $response = Http::get('https://oauth2.googleapis.com/tokeninfo', [
            'id_token' => $idToken,
        ]);

        if (!$response->successful()) {
            Log::warning('Google token verification failed', ['status' => $response->status()]);
            return null;
        }

        $payload = $response->json();

        // Verify the audience matches one of our allowed client IDs
        $allowedClients = [
            config('services.google.client_id'),
            config('services.google.android_client_id'),
            config('services.google.ios_client_id'),
        ];
        
        $allowedClients = array_filter($allowedClients); // Remove null/empty values

        if (!empty($allowedClients) && isset($payload['aud']) && !in_array($payload['aud'], $allowedClients)) {
            Log::warning('Google token audience mismatch', [
                'expected_one_of' => $allowedClients,
                'got'             => $payload['aud'],
            ]);
            return null;
        }

        // Verify token is not expired
        if (isset($payload['exp']) && $payload['exp'] < time()) {
            Log::warning('Google token expired');
            return null;
        }

        return $payload;
    }
}
