<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;

/**
 * Blocks suspended customers from creating bookings or making payments.
 * A suspended customer who still has a valid token should not be able
 * to use the platform.
 */
class EnsureCustomerActive
{
    public function handle(Request $request, Closure $next): mixed
    {
        $customer = auth()->guard('customer')->user();

        if (!$customer) {
            return response()->json(['success' => false, 'message' => 'Unauthenticated'], 401);
        }

        $status = strtolower($customer->status ?? 'active');

        if ($status === 'suspended') {
            return response()->json([
                'success' => false,
                'message' => 'Your account has been suspended. Please contact support.',
                'status'  => 'suspended',
            ], 403);
        }

        return $next($request);
    }
}
