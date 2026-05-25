<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;

/**
 * Blocks suspended or pending providers from accessing protected routes.
 * A provider who knows the route URL but is suspended should not be able
 * to accept bookings, update services, or access wallet.
 */
class EnsureProviderApproved
{
    public function handle(Request $request, Closure $next): mixed
    {
        $provider = auth()->guard('provider')->user();

        if (!$provider) {
            return response()->json(['success' => false, 'message' => 'Unauthenticated'], 401);
        }

        $status = strtolower($provider->status ?? '');
        
        \Log::info('Checking provider approval', [
            'providerID' => $provider->providerID,
            'status' => $status,
            'in_array_check' => in_array($status, ['suspended', 'rejected', 'pending'])
        ]);

        if (in_array($status, ['suspended', 'rejected', 'pending'])) {
            return response()->json([
                'success' => false,
                'message' => match($status) {
                    'suspended' => 'Your account has been suspended. Please contact support.',
                    'rejected'  => 'Your account application was rejected.',
                    'pending'   => 'Your account is pending verification. Please wait for approval.',
                    default     => 'Account not active.',
                },
                'status' => $status,
            ], 403);
        }

        return $next($request);
    }
}
