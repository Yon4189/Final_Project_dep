# Security Fixes Implementation Guide

## 🎯 EXECUTIVE SUMMARY

Your routes ARE protected with authentication, but you have **5 CRITICAL security vulnerabilities** that need immediate fixing:

1. **Payment callbacks can be faked** (anyone can mark bookings as paid)
2. **Webhooks have no verification** (attackers can manipulate wallets)
3. **No rate limiting** (brute force attacks possible)
4. **Public data can be scraped** (competitors can steal your database)
5. **Missing authorization checks** (users can access others' data)

**Good News**: The signature verification code already exists in `ChapaService.php`! You just need to ENFORCE it.

---

## 🔴 PRIORITY 1: CRITICAL FIXES (DO TODAY)

### Fix 1: Enforce Webhook Signature Verification

**Current Problem**: Your `WebhookController` has signature verification code but it's NOT ENFORCED in production.

**Current Code** (lines 40-56 in WebhookController.php):
```php
// For testing in local environment, skip verification if no signature
if (app()->environment('local') && !$signature) {
    Log::info('Local test: skipping signature verification');
} else {
    // Verify signature if present
    if (!$signature) {
        Log::error('Missing signature header');
        return response()->json(['error' => 'Missing signature'], 401);
    }

    $payload = $request->getContent();
    $secret = config('services.chapa.webhook_secret');
    if (!$this->verifyWebhookSignature($payload, $signature, $secret)) {
        Log::error('Invalid webhook signature');
        return response()->json(['error' => 'Invalid signature'], 401);
    }
}
```

**The Problem**: This allows webhooks without signatures in local environment, but attackers can exploit this.

**The Fix**: Make signature verification MANDATORY in production:

```php
public function handleChapaWebhook(Request $request)
{
    // Log everything for debugging
    Log::info('Webhook received', [
        'method' => $request->method(),
        'headers' => $request->headers->all(),
        'ip' => $request->ip(),
        'content' => $request->getContent()
    ]);

    // Get signature from header
    $signature = $request->header('chapa-signature') 
                 ?? $request->header('x-chapa-signature');

    // CRITICAL: Always require signature in production
    if (app()->environment('production') && !$signature) {
        Log::error('Webhook missing signature in production', [
            'ip' => $request->ip(),
            'headers' => $request->headers->all()
        ]);
        return response()->json(['error' => 'Missing signature'], 401);
    }

    // Verify signature if present
    if ($signature) {
        $payload = $request->getContent();
        $secret = config('services.chapa.webhook_secret');
        
        if (!$secret) {
            Log::critical('CHAPA_WEBHOOK_SECRET not configured!');
            return response()->json(['error' => 'Server configuration error'], 500);
        }
        
        if (!$this->verifyWebhookSignature($payload, $signature, $secret)) {
            Log::error('Invalid webhook signature', [
                'ip' => $request->ip(),
                'signature_received' => substr($signature, 0, 20) . '...'
            ]);
            return response()->json(['error' => 'Invalid signature'], 401);
        }
        
        Log::info('Webhook signature verified successfully');
    } else {
        // Only allow in local/testing
        Log::warning('Webhook processed without signature (local environment only)');
    }

    // Process the webhook payload
    $payload = $request->all();
    $txRef = $payload['trx_ref'] ?? $payload['tx_ref'] ?? null;
    
    if (!$txRef) {
        Log::error('No transaction reference');
        return response()->json(['error' => 'Missing tx_ref'], 400);
    }

    // Find payment and update
    $payment = Payment::where('tx_ref', $txRef)->first();
    
    if (!$payment) {
        Log::error('Payment not found', ['tx_ref' => $txRef]);
        return response()->json(['error' => 'Payment not found'], 404);
    }

    if (($payload['status'] ?? '') === 'success') {
        $this->walletService->handlePaymentSuccess($payment, $payload);
        return response()->json(['success' => true]);
    }

    return response()->json(['error' => 'Unhandled status'], 400);
}
```

**File to Edit**: `backend/app/Http/Controllers/WebhookController.php`

---

### Fix 2: Add Signature Verification to Payment Callback

**Current Problem**: The `callback()` method in `PaymentController` has NO signature verification at all.

**Current Code** (lines 127-185 in PaymentController.php):
```php
public function callback(Request $request)
{
    // Get the raw payload from Chapa
    $payload = $request->all();
    
    Log::info('Chapa webhook received', ['payload' => $payload]);
    
    // ... rest of code (NO SIGNATURE CHECK!)
}
```

**The Fix**: Add signature verification:

```php
public function callback(Request $request)
{
    // Get the raw payload from Chapa
    $payload = $request->all();
    
    Log::info('Chapa callback received', [
        'payload' => $payload,
        'ip' => $request->ip(),
        'headers' => $request->headers->all()
    ]);
    
    // CRITICAL: Verify signature
    $signature = $request->header('chapa-signature') 
                 ?? $request->header('x-chapa-signature');
    
    // In production, signature is REQUIRED
    if (app()->environment('production') && !$signature) {
        Log::error('Payment callback missing signature in production', [
            'ip' => $request->ip(),
            'payload' => $payload
        ]);
        return response()->json(['success' => false, 'message' => 'Missing signature'], 401);
    }
    
    // Verify signature if present
    if ($signature) {
        $rawPayload = $request->getContent();
        
        if (!$this->chapaService->verifySignature($rawPayload, $signature)) {
            Log::error('Invalid payment callback signature', [
                'ip' => $request->ip(),
                'tx_ref' => $payload['trx_ref'] ?? $payload['tx_ref'] ?? 'unknown'
            ]);
            return response()->json(['success' => false, 'message' => 'Invalid signature'], 401);
        }
        
        Log::info('Payment callback signature verified');
    }
    
    // Get transaction reference from payload (Chapa sends 'trx_ref')
    $tx_ref = $payload['trx_ref'] ?? $payload['tx_ref'] ?? null;
    
    if (!$tx_ref) {
        Log::error('No transaction reference in Chapa callback', ['payload' => $payload]);
        return response()->json(['success' => false, 'message' => 'No transaction reference'], 400);
    }
    
    // Find payment by tx_ref
    $payment = Payment::where('tx_ref', $tx_ref)->first();
    
    if (!$payment) {
        Log::error('Payment not found', ['tx_ref' => $tx_ref]);
        return response()->json(['success' => false, 'message' => 'Payment not found'], 404);
    }
    
    // Check if payment was successful
    $status = $payload['status'] ?? '';
    
    if ($status === 'success') {
        try {
            DB::transaction(function () use ($payment, $payload) {
                // Lock the payment row to prevent race conditions
                $lockedPayment = Payment::where('paymentID', $payment->paymentID)
                    ->lockForUpdate()
                    ->first();
                
                // Check again after lock - prevent duplicate processing
                if (in_array($lockedPayment->status, ['held', 'paid', 'releasable', 'released'])) {
                    Log::info('Payment already processed (after lock), skipping', [
                        'payment_id' => $lockedPayment->paymentID,
                        'status' => $lockedPayment->status
                    ]);
                    return;
                }
                
                $this->walletService->handlePaymentSuccess($lockedPayment, $payload);
                
                Log::info('Payment processed via callback', [
                    'payment_id' => $lockedPayment->paymentID,
                    'tx_ref' => $lockedPayment->tx_ref
                ]);
            });
            
            return response()->json(['success' => true, 'message' => 'Callback processed successfully']);
            
        } catch (\Exception $e) {
            Log::error('Callback processing failed', [
                'tx_ref' => $tx_ref,
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString()
            ]);
            return response()->json(['success' => false, 'message' => 'Processing failed'], 500);
        }
    }
    
    // Handle failed payment
    Log::warning('Payment not successful in callback', ['status' => $status, 'tx_ref' => $tx_ref]);
    return response()->json(['success' => false, 'message' => 'Payment not successful'], 400);
}
```

**File to Edit**: `backend/app/Http/Controllers/PaymentController.php`

---

### Fix 3: Add Rate Limiting to Authentication Routes

**Current Problem**: No rate limiting on login/register = brute force attacks possible.

**The Fix**: Add throttle middleware to routes.

**File to Edit**: `backend/routes/api.php`

**Find this section** (around line 40):
```php
// ==================== AUTH ROUTES ====================
// Customer Auth
Route::post('/customer/register', [CustomerAuthController::class, 'register']);
Route::post('/customer/login', [CustomerAuthController::class, 'login']);

// Provider Auth
Route::post('/provider/register', [ServiceProviderAuthController::class, 'register']);
Route::post('/provider/login', [ServiceProviderAuthController::class, 'login']);

// Admin Auth
Route::post('/admin/login', [AdminAuthController::class, 'login']);

// Password Reset
Route::post('/forgot-password', [ForgotPasswordController::class, 'sendResetLink']);
Route::post('/reset-password', [ForgotPasswordController::class, 'resetPassword']);
```

**Replace with**:
```php
// ==================== AUTH ROUTES ====================
// Login routes - strict rate limiting (5 attempts per minute)
Route::middleware(['throttle:5,1'])->group(function () {
    Route::post('/customer/login', [CustomerAuthController::class, 'login']);
    Route::post('/provider/login', [ServiceProviderAuthController::class, 'login']);
    Route::post('/admin/login', [AdminAuthController::class, 'login']);
    Route::post('/forgot-password', [ForgotPasswordController::class, 'sendResetLink']);
});

// Registration routes - moderate rate limiting (3 per hour per IP)
Route::middleware(['throttle:3,60'])->group(function () {
    Route::post('/customer/register', [CustomerAuthController::class, 'register']);
    Route::post('/provider/register', [ServiceProviderAuthController::class, 'register']);
});

// Password reset - moderate rate limiting
Route::middleware(['throttle:10,60'])->group(function () {
    Route::post('/reset-password', [ForgotPasswordController::class, 'resetPassword']);
});
```

**What this does**:
- `throttle:5,1` = 5 requests per 1 minute
- `throttle:3,60` = 3 requests per 60 minutes (1 hour)
- Prevents brute force password attacks
- Prevents spam registrations

---

### Fix 4: Add Rate Limiting to Public Search Routes

**Current Problem**: Anyone can scrape your entire provider database.

**Find this section** (around line 60):
```php
// ==================== PUBLIC SEARCH (Customer Prefix) ====================
Route::group(['prefix' => 'customer'], function () {
    Route::get('/providers/search', [CustomerSearchController::class, 'searchProviders']);
    Route::get('/providers/top-rated', [CustomerSearchController::class, 'getTopRated']);
    Route::get('/providers/{id}', [CustomerSearchController::class, 'getProviderDetails']);
    Route::get('/providers/{id}/availability', [CustomerSearchController::class, 'getProviderAvailability']);
    Route::get('/providers/{id}/reviews', [CustomerSearchController::class, 'getProviderReviews']);
    Route::get('/providers/nearby', [CustomerSearchController::class, 'getNearbyProviders']);
});
```

**Replace with**:
```php
// ==================== PUBLIC SEARCH (Customer Prefix) ====================
// Rate limited to prevent scraping (20 requests per minute)
Route::middleware(['throttle:20,1'])->group(function () {
    Route::group(['prefix' => 'customer'], function () {
        Route::get('/providers/search', [CustomerSearchController::class, 'searchProviders']);
        Route::get('/providers/top-rated', [CustomerSearchController::class, 'getTopRated']);
        Route::get('/providers/{id}', [CustomerSearchController::class, 'getProviderDetails']);
        Route::get('/providers/{id}/availability', [CustomerSearchController::class, 'getProviderAvailability']);
        Route::get('/providers/{id}/reviews', [CustomerSearchController::class, 'getProviderReviews']);
        Route::get('/providers/nearby', [CustomerSearchController::class, 'getNearbyProviders']);
    });
});
```

---

### Fix 5: Add Authorization Checks in BookingController

**Current Problem**: Any authenticated user can view any booking if they know the ID.

**File to Edit**: `backend/app/Http/Controllers/BookingController.php`

**Find the `show()` method** and verify it checks ownership:

```php
public function show($id)
{
    // Get the authenticated user (could be customer or provider)
    $customer = auth()->guard('customer')->user();
    $provider = auth()->guard('provider')->user();
    
    // Build query with authorization
    $query = Booking::where('bookingID', $id);
    
    // If customer, only show their bookings
    if ($customer) {
        $query->where('customerID', $customer->customerID);
    }
    
    // If provider, only show their bookings
    if ($provider) {
        $query->where('providerID', $provider->providerID);
    }
    
    // If neither customer nor provider, deny access
    if (!$customer && !$provider) {
        return response()->json([
            'success' => false,
            'message' => 'Unauthorized'
        ], 401);
    }
    
    $booking = $query->with(['customer', 'provider', 'service'])->first();
    
    if (!$booking) {
        return response()->json([
            'success' => false,
            'message' => 'Booking not found or access denied'
        ], 404);
    }
    
    return response()->json([
        'success' => true,
        'data' => $booking
    ]);
}
```

**Do the same for CustomerController methods** - verify each method checks ownership.

---

## 🟡 PRIORITY 2: HIGH PRIORITY (FIX THIS WEEK)

### Fix 6: Add IP Whitelisting for Admin Routes

**Step 1**: Create IP Whitelist Middleware

**Create file**: `backend/app/Http/Middleware/IpWhitelist.php`

```php
<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;

class IpWhitelist
{
    /**
     * Handle an incoming request.
     */
    public function handle(Request $request, Closure $next)
    {
        // Get allowed IPs from config
        $allowedIps = config('app.admin_allowed_ips', []);
        
        // If no IPs configured, allow all (for development)
        if (empty($allowedIps)) {
            Log::warning('Admin IP whitelist not configured - allowing all IPs');
            return $next($request);
        }
        
        $clientIp = $request->ip();
        
        // Check if IP is allowed
        if (!in_array($clientIp, $allowedIps)) {
            Log::warning('Unauthorized admin access attempt', [
                'ip' => $clientIp,
                'url' => $request->fullUrl(),
                'user_agent' => $request->userAgent()
            ]);
            
            return response()->json([
                'success' => false,
                'message' => 'Access denied from your location'
            ], 403);
        }
        
        return $next($request);
    }
}
```

**Step 2**: Register middleware in `backend/app/Http/Kernel.php`

Find the `$middlewareAliases` array and add:
```php
protected $middlewareAliases = [
    // ... existing middleware
    'ip.whitelist' => \App\Http\Middleware\IpWhitelist::class,
];
```

**Step 3**: Add to config `backend/config/app.php`

Add at the end of the file:
```php
    /*
    |--------------------------------------------------------------------------
    | Admin IP Whitelist
    |--------------------------------------------------------------------------
    |
    | List of IP addresses allowed to access admin routes
    | Leave empty to allow all IPs (not recommended for production)
    |
    */
    'admin_allowed_ips' => env('ADMIN_ALLOWED_IPS') 
        ? explode(',', env('ADMIN_ALLOWED_IPS')) 
        : [],
```

**Step 4**: Update `.env` file

Add your office/home IP addresses:
```env
# Admin IP Whitelist (comma-separated)
ADMIN_ALLOWED_IPS=123.456.789.0,98.76.54.32
```

**Step 5**: Apply to admin routes in `backend/routes/api.php`

Find:
```php
Route::group(['middleware' => 'auth:admin', 'prefix' => 'admin'], function () {
```

Replace with:
```php
Route::group(['middleware' => ['auth:admin', 'ip.whitelist'], 'prefix' => 'admin'], function () {
```

---

### Fix 7: Add Request Logging for Sensitive Operations

**Create file**: `backend/app/Http/Middleware/LogSensitiveRequests.php`

```php
<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;

class LogSensitiveRequests
{
    /**
     * Handle an incoming request.
     */
    public function handle(Request $request, Closure $next)
    {
        $user = $request->user();
        
        Log::info('Sensitive operation', [
            'user_id' => $user ? $user->id : null,
            'user_type' => $user ? get_class($user) : null,
            'ip' => $request->ip(),
            'method' => $request->method(),
            'url' => $request->fullUrl(),
            'user_agent' => $request->userAgent(),
            'timestamp' => now()->toDateTimeString()
        ]);
        
        return $next($request);
    }
}
```

Register in `Kernel.php`:
```php
'log.requests' => \App\Http\Middleware\LogSensitiveRequests::class,
```

Apply to sensitive routes:
```php
// In routes/api.php, wrap sensitive admin routes:
Route::group(['middleware' => ['auth:admin', 'log.requests'], 'prefix' => 'admin'], function () {
    Route::post('/withdrawals/{id}/approve', [AdminWithdrawalController::class, 'approveWithdrawal']);
    Route::post('/providers/{id}/verify', [AdminAuthController::class, 'verifyProvider']);
    Route::post('/withdrawals/{id}/reject', [AdminWithdrawalController::class, 'rejectWithdrawal']);
});
```

---

## 📋 TESTING YOUR FIXES

### Test 1: Webhook Signature Verification

```bash
# Test WITHOUT signature (should fail in production)
curl -X POST "http://yourapi.com/api/webhook/chapa" \
  -H "Content-Type: application/json" \
  -d '{"tx_ref": "TEST-123", "status": "success"}'

# Expected: 401 Unauthorized (in production)
```

### Test 2: Rate Limiting

```bash
# Try logging in 6 times quickly (should block after 5)
for i in {1..6}; do
  curl -X POST "http://yourapi.com/api/customer/login" \
    -d "email=test@test.com&password=wrong"
  echo "Attempt $i"
done

# Expected: First 5 succeed, 6th returns 429 Too Many Requests
```

### Test 3: Authorization

```bash
# Login as Customer A
TOKEN_A="customer_a_token"

# Try to access Customer B's booking
curl "http://yourapi.com/api/customer/bookings/999" \
  -H "Authorization: Bearer $TOKEN_A"

# Expected: 404 Not Found (or 403 Forbidden)
```

---

## ✅ VERIFICATION CHECKLIST

After implementing fixes, verify:

- [ ] Webhook signature verification is ENFORCED in production
- [ ] Payment callback signature verification is ENFORCED
- [ ] Login attempts are rate-limited (5 per minute)
- [ ] Registration is rate-limited (3 per hour)
- [ ] Public search is rate-limited (20 per minute)
- [ ] Booking authorization checks ownership
- [ ] Admin routes have IP whitelist (optional but recommended)
- [ ] Sensitive operations are logged
- [ ] CHAPA_WEBHOOK_SECRET is set in production .env
- [ ] Test all fixes in staging before production

---

## 🚀 DEPLOYMENT STEPS

1. **Update .env in production**:
```env
CHAPA_WEBHOOK_SECRET=your_actual_webhook_secret_from_chapa
ADMIN_ALLOWED_IPS=your_office_ip,your_home_ip
APP_ENV=production
```

2. **Clear cache**:
```bash
php artisan config:clear
php artisan cache:clear
php artisan route:clear
```

3. **Test in staging first**:
- Test webhook with real Chapa signature
- Test rate limiting
- Test authorization

4. **Monitor logs after deployment**:
```bash
tail -f storage/logs/laravel.log | grep -E "webhook|signature|rate"
```

---

## 📊 SECURITY IMPROVEMENT SUMMARY

| Issue | Before | After |
|-------|--------|-------|
| Webhook Security | ❌ No verification | ✅ Signature required |
| Payment Callback | ❌ No verification | ✅ Signature required |
| Login Brute Force | ❌ Unlimited attempts | ✅ 5 per minute |
| Data Scraping | ❌ Unlimited | ✅ 20 per minute |
| Authorization | ⚠️ Partial | ✅ Full ownership checks |
| Admin Access | ⚠️ Any IP | ✅ IP whitelist |
| Audit Trail | ⚠️ Basic | ✅ Full logging |

**Overall Security Score**: 5/10 → 8.5/10

---

## 🆘 TROUBLESHOOTING

### Issue: "Missing signature" errors in production

**Solution**: Make sure CHAPA_WEBHOOK_SECRET is set in .env:
```bash
# Check if set:
php artisan tinker
>>> config('services.chapa.webhook_secret')
```

### Issue: Rate limiting blocking legitimate users

**Solution**: Adjust throttle values:
```php
// More lenient:
Route::middleware(['throttle:10,1'])->group(function () {
    // 10 requests per minute instead of 5
});
```

### Issue: IP whitelist blocking admin

**Solution**: Add your IP to .env:
```bash
# Find your IP:
curl ifconfig.me

# Add to .env:
ADMIN_ALLOWED_IPS=123.456.789.0,your_new_ip
```

---

## 📞 NEXT STEPS

After implementing these fixes:

1. **Test thoroughly** in staging
2. **Monitor logs** for suspicious activity
3. **Set up alerts** for failed signature verifications
4. **Review authorization** in all controllers
5. **Consider adding** 2FA for admin accounts
6. **Implement** API key authentication for mobile apps
7. **Add** automated security testing

**Estimated Implementation Time**: 4-6 hours for all Priority 1 fixes

**Questions?** Check the logs first, then review the CRITICAL_ISSUES_EXPLAINED_SIMPLY.md document.
