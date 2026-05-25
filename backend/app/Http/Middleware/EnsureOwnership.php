<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;

/**
 * Ownership middleware — verifies the authenticated user owns the resource
 * they are trying to access. Prevents horizontal privilege escalation
 * (Customer A accessing Customer B's data by guessing an ID).
 *
 * Usage in routes:
 *   ->middleware('ownership:booking,bookingID,customerID')
 *   ->middleware('ownership:booking,bookingID,providerID')
 *
 * Parameters (colon-separated):
 *   1. model key  — maps to a model class in App\Models
 *   2. route key  — the {id} parameter name in the route
 *   3. owner col  — the column in the model that must match the auth user's ID
 */
class EnsureOwnership
{
    private const MODEL_MAP = [
        'booking'      => \App\Models\Booking::class,
        'payment'      => \App\Models\Payment::class,
        'dispute'      => \App\Models\Dispute::class,
        'address'      => \App\Models\CustomerAddress::class,
        'withdrawal'   => \App\Models\Withdrawal::class,
        'review'       => \App\Models\Review::class,
    ];

    public function handle(Request $request, Closure $next, string $model, string $routeKey, string $ownerColumn): mixed
    {
        $modelClass = self::MODEL_MAP[$model] ?? null;

        if (!$modelClass) {
            Log::error('EnsureOwnership: unknown model', ['model' => $model]);
            return response()->json(['success' => false, 'message' => 'Server configuration error'], 500);
        }

        // Get the resource ID from the route
        $resourceId = $request->route($routeKey);

        if (!$resourceId) {
            return response()->json(['success' => false, 'message' => 'Resource ID missing'], 400);
        }

        // Find the resource
        $resource = $modelClass::find($resourceId);

        if (!$resource) {
            // Return 404 — don't reveal whether the resource exists
            return response()->json(['success' => false, 'message' => 'Not found'], 404);
        }

        // Determine the authenticated user's ID
        $authUserId = null;
        if ($customer = auth()->guard('customer')->user()) {
            $authUserId = $customer->customerID;
        } elseif ($provider = auth()->guard('provider')->user()) {
            $authUserId = $provider->providerID;
        } elseif ($admin = auth()->guard('admin')->user()) {
            // Admins bypass ownership checks
            return $next($request);
        }

        if (!$authUserId) {
            return response()->json(['success' => false, 'message' => 'Unauthenticated'], 401);
        }

        // Check ownership (supports multiple columns via pipe separator, e.g., 'raised_by_id|against_id')
        $ownerColumns = explode('|', $ownerColumn);
        $isOwner = false;

        foreach ($ownerColumns as $col) {
            $col = trim($col);
            if ((string) $resource->{$col} === (string) $authUserId) {
                $isOwner = true;
                break;
            }
        }

        if (!$isOwner) {
            Log::warning('Ownership check failed', [
                'model'        => $model,
                'resource_id'  => $resourceId,
                'owner_column' => $ownerColumn,
                'ip'           => $request->ip(),
            ]);
            // Return 404 — don't reveal the resource exists but belongs to someone else
            return response()->json(['success' => false, 'message' => 'Not found'], 404);
        }

        return $next($request);
    }
}
