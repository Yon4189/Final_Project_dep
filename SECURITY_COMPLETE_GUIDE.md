# Complete Security Guide - Problems & Solutions

## 📋 Quick Reference

**Current Security Score: 5/10 → Target: 8.5/10**
**Time to Fix Critical Issues: 1.5 hours**
**Time to Fix All Issues: 5-6 hours**

## 🚨 Top 5 Critical Vulnerabilities

1. **Payment callbacks can be faked** → Add signature verification (20 min)
2. **Webhooks have no verification** → Enforce signature checks (15 min)
3. **No rate limiting** → Add throttle middleware (10 min)
4. **Public data scraping** → Rate limit search endpoints (10 min)
5. **Missing authorization** → Add ownership checks (30 min)

---

## ⚡ 30-MINUTE QUICK FIX

### Fix 1: Set Webhook Secret (5 min)
**File**: `backend/.env`
```env
CHAPA_WEBHOOK_SECRET=your_secret_from_chapa_dashboard
APP_ENV=production
```
Then run: `php artisan config:clear`

### Fix 2: Rate Limit Logins (10 min)
**File**: `backend/routes/api.php` (line ~40)
```php
Route::middleware(['throttle:5,1'])->group(function () {
    Route::post('/customer/login', [CustomerAuthController::class, 'login']);
    Route::post('/provider/login', [ServiceProviderAuthController::class, 'login']);
    Route::post('/admin/login', [AdminAuthController::class, 'login']);
});
```

### Fix 3: Enforce Webhook Signature (15 min)
**File**: `backend/app/Http/Controllers/WebhookController.php` (line ~40)

Replace the local environment check with:
```php
// CRITICAL: Always require signature in production
if (app()->environment('production') && !$signature) {
    Log::error('Webhook missing signature', ['ip' => $request->ip()]);
    return response()->json(['error' => 'Missing signature'], 401);
}

if ($signature) {
    $payload = $request->getContent();
    $secret = config('services.chapa.webhook_secret');
    
    if (!$this->verifyWebhookSignature($payload, $signature, $secret)) {
        Log::error('Invalid webhook signature', ['ip' => $request->ip()]);
        return response()->json(['error' => 'Invalid signature'], 401);
    }
}
```

**✅ Security Score: 5/10 → 7/10 in 30 minutes!**

---

## 🔴 PRIORITY 0: CRITICAL (Fix Today - 1.5 hours)

### 1. Payment Callback Signature (20 min)

**PROBLEM**: Anyone can fake payment confirmations
**ATTACK**: `curl "yourapi.com/api/payment/callback/BOOKING-123?status=success"`
**IMPACT**: Financial loss, fraudulent bookings

**SOLUTION**:
File: `backend/app/Http/Controllers/PaymentController.php` (line ~127)

Add after logging in `callback()` method:
```php
// CRITICAL: Verify signature
$signature = $request->header('chapa-signature') 
             ?? $request->header('x-chapa-signature');

if (app()->environment('production') && !$signature) {
    Log::error('Payment callback missing signature', ['ip' => $request->ip()]);
    return response()->json(['success' => false, 'message' => 'Missing signature'], 401);
}

if ($signature) {
    $rawPayload = $request->getContent();
    if (!$this->chapaService->verifySignature($rawPayload, $signature)) {
        Log::error('Invalid payment callback signature', ['ip' => $request->ip()]);
        return response()->json(['success' => false, 'message' => 'Invalid signature'], 401);
    }
}
```

**TEST**: `curl -X POST "yourapi.com/api/payment/callback" -d '{"status":"success"}' # Should fail`

---

### 2. Race Conditions in Wallet (30 min)

**PROBLEM**: Two refunds simultaneously can corrupt balance
**SCENARIO**: Thread 1 reads 100, adds 50 = 150. Thread 2 reads 100, adds 30 = 130. Final: 130 (lost 50!)
**IMPACT**: Money loss, accounting errors

**SOLUTION**:
File: All wallet balance updates

Replace:
```php
// WRONG:
$customer->walletBalance += $refundAmount;
$customer->save();
```

With:
```php
// RIGHT:
DB::transaction(function() use ($customer, $refundAmount) {
    $locked = Customer::where('customerID', $customer->customerID)
        ->lockForUpdate()
        ->first();
    $locked->walletBalance += $refundAmount;
    $locked->save();
});
```

Apply to: PaymentController, WalletController, all balance updates

**TEST**: Try two simultaneous refunds - balance should be correct

---

### 3. Public Data Scraping (10 min)

**PROBLEM**: Competitors can steal entire provider database
**ATTACK**: Loop through all provider IDs and download data
**IMPACT**: Data theft, privacy violations

**SOLUTION**:
File: `backend/routes/api.php` (line ~60)

Wrap public routes:
```php
Route::middleware(['throttle:20,1'])->group(function () {
    Route::group(['prefix' => 'customer'], function () {
        Route::get('/providers/search', [CustomerSearchController::class, 'searchProviders']);
        Route::get('/providers/top-rated', [CustomerSearchController::class, 'getTopRated']);
        Route::get('/providers/{id}', [CustomerSearchController::class, 'getProviderDetails']);
        // ... other public routes
    });
});
```

**TEST**: Make 21 requests quickly - should block after 20

---

### 4. Missing Authorization Checks (30 min)

**PROBLEM**: Users can access other users' data
**SCENARIO**: Customer A accesses Customer B's booking by knowing the ID
**IMPACT**: Privacy violations, data leakage

**SOLUTION**:
File: `backend/app/Http/Controllers/BookingController.php`

Update `show()` method:
```php
public function show($id)
{
    $customer = auth()->guard('customer')->user();
    $provider = auth()->guard('provider')->user();
    
    $query = Booking::where('bookingID', $id);
    
    if ($customer) {
        $query->where('customerID', $customer->customerID);
    } elseif ($provider) {
        $query->where('providerID', $provider->providerID);
    } else {
        return response()->json(['success' => false, 'message' => 'Unauthorized'], 401);
    }
    
    $booking = $query->first();
    
    if (!$booking) {
        return response()->json(['success' => false, 'message' => 'Not found'], 404);
    }
    
    return response()->json(['success' => true, 'data' => $booking]);
}
```

Apply to: CustomerController, PaymentController, WalletController, ReviewController, DisputeController

**TEST**: Login as Customer A, try accessing Customer B's booking - should fail

---

### 5. File Upload Vulnerability (20 min)

**PROBLEM**: Can upload malicious PHP files as images
**ATTACK**: Upload shell.php.jpg, execute commands via browser
**IMPACT**: Server compromise, complete system takeover

**SOLUTION**:
File: All file upload handlers

```php
public function uploadProfilePicture(Request $request) {
    $validator = Validator::make($request->all(), [
        'profilePicture' => [
            'required',
            'file',
            'mimes:jpeg,jpg,png',
            'max:2048', // 2MB max
        ]
    ]);
    
    if ($validator->fails()) {
        return response()->json(['error' => 'Invalid file'], 422);
    }
    
    $file = $request->file('profilePicture');
    
    // Verify it's actually an image
    $image = getimagesize($file->path());
    if (!$image) {
        return response()->json(['error' => 'Not a valid image'], 422);
    }
    
    // Generate random filename
    $filename = Str::random(40) . '.jpg';
    
    // Store securely
    $file->storeAs('private/profiles', $filename);
    
    return response()->json(['path' => $filename]);
}
```

**TEST**: Try uploading .php file - should fail

---

## 🟡 PRIORITY 1: HIGH (Fix This Week - 3 hours)

### 6. IP Whitelist for Admin (45 min)

**PROBLEM**: Admin panel accessible from anywhere
**IMPACT**: Increased attack surface

**SOLUTION**:
Create: `backend/app/Http/Middleware/IpWhitelist.php`
```php
<?php
namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;

class IpWhitelist
{
    public function handle(Request $request, Closure $next)
    {
        $allowedIps = config('app.admin_allowed_ips', []);
        
        if (empty($allowedIps)) {
            Log::warning('Admin IP whitelist not configured');
            return $next($request);
        }
        
        $clientIp = $request->ip();
        
        if (!in_array($clientIp, $allowedIps)) {
            Log::warning('Unauthorized admin access', ['ip' => $clientIp]);
            return response()->json(['error' => 'Access denied'], 403);
        }
        
        return $next($request);
    }
}
```

Register in `backend/app/Http/Kernel.php`:
```php
protected $middlewareAliases = [
    'ip.whitelist' => \App\Http\Middleware\IpWhitelist::class,
];
```

Add to `backend/config/app.php`:
```php
'admin_allowed_ips' => env('ADMIN_ALLOWED_IPS') 
    ? explode(',', env('ADMIN_ALLOWED_IPS')) 
    : [],
```

Update `.env`:
```env
ADMIN_ALLOWED_IPS=123.456.789.0,98.76.54.32
```

Apply to routes in `backend/routes/api.php`:
```php
Route::group(['middleware' => ['auth:admin', 'ip.whitelist'], 'prefix' => 'admin'], function () {
    // admin routes
});
```

**TEST**: Try admin access from different IP - should block

---

### 7. Request Logging for Sensitive Operations (30 min)

**PROBLEM**: No audit trail for sensitive operations
**IMPACT**: Can't track who did what

**SOLUTION**:
Create: `backend/app/Http/Middleware/LogSensitiveRequests.php`
```php
<?php
namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;

class LogSensitiveRequests
{
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
Route::group(['middleware' => ['auth:admin', 'log.requests']], function () {
    Route::post('/withdrawals/{id}/approve', [AdminWithdrawalController::class, 'approveWithdrawal']);
    Route::post('/providers/{id}/verify', [AdminAuthController::class, 'verifyProvider']);
});
```

---

### 8. Idempotency Keys for Payments (1 hour)

**PROBLEM**: Double-clicking "Pay" charges customer twice
**IMPACT**: Financial loss, customer complaints

**SOLUTION**:
File: `backend/app/Http/Controllers/PaymentController.php`

```php
public function initializePayment(Request $request)
{
    // Generate unique key
    $idempotencyKey = $bookingID . '-' . time();
    
    // Check if already processed
    if (Payment::where('idempotency_key', $idempotencyKey)->exists()) {
        return response()->json(['error' => 'Already processed'], 409);
    }
    
    // Create payment with key
    Payment::create([
        'idempotency_key' => $idempotencyKey,
        // ... other fields
    ]);
}
```

Add migration:
```php
Schema::table('payments', function (Blueprint $table) {
    $table->string('idempotency_key')->unique()->nullable();
});
```

---

### 9. Audit Trail for Money Movements (1 hour)

**PROBLEM**: No record of financial transactions
**IMPACT**: Can't prove where money went

**SOLUTION**:
Create migration: `create_financial_transactions_table.php`
```php
Schema::create('financial_transactions', function (Blueprint $table) {
    $table->id();
    $table->string('type'); // 'payment', 'refund', 'commission', 'withdrawal'
    $table->decimal('amount', 10, 2);
    $table->string('from_type'); // 'customer', 'provider', 'platform'
    $table->unsignedBigInteger('from_id');
    $table->string('to_type');
    $table->unsignedBigInteger('to_id');
    $table->unsignedBigInteger('booking_id')->nullable();
    $table->text('description');
    $table->timestamps();
});
```

Log every money movement:
```php
FinancialTransaction::create([
    'type' => 'payment',
    'amount' => 1000,
    'from_type' => 'customer',
    'from_id' => $customer->id,
    'to_type' => 'platform',
    'to_id' => 1,
    'booking_id' => $booking->id,
    'description' => 'Customer paid for booking #123'
]);
```

---

## 🟢 PRIORITY 2: MEDIUM (Fix This Month - 4 hours)

### 10. Price Limits (15 min)

**PROBLEM**: No validation on prices
**IMPACT**: Can enter 999999999 ETB

**SOLUTION**:
```php
$validator = Validator::make($request->all(), [
    'agreed_price' => [
        'required',
        'numeric',
        'min:10',
        'max:50000',
    ],
]);

// Also validate against service base price
$service = Service::find($request->serviceID);
$maxAllowed = $service->basePrice * 3;

if ($request->agreed_price > $maxAllowed) {
    return response()->json(['error' => "Price too high. Max: $maxAllowed ETB"], 422);
}
```

---

### 11. XSS Protection (30 min)

**PROBLEM**: Can inject JavaScript in names/descriptions
**IMPACT**: Session hijacking, data theft

**SOLUTION**:
Always use Blade escaping:
```php
// WRONG:
{!! $provider->fullname !!}

// RIGHT:
{{ $provider->fullname }}
```

Or manually escape:
```php
echo htmlspecialchars($provider->fullname, ENT_QUOTES, 'UTF-8');
```

---

### 12. Database Backups (1 hour)

**PROBLEM**: No backups = data loss risk
**IMPACT**: Lose everything if server crashes

**SOLUTION**:
Create: `backup.sh`
```bash
#!/bin/bash
DATE=$(date +%Y%m%d_%H%M%S)
mysqldump -u root -p your_database > backup_$DATE.sql
gzip backup_$DATE.sql
aws s3 cp backup_$DATE.sql.gz s3://your-bucket/backups/
```

Add to crontab:
```bash
0 2 * * * /path/to/backup.sh # Daily at 2 AM
```

Or use managed database (AWS RDS, DigitalOcean) with automatic backups.

---

### 13. Error Tracking (30 min)

**PROBLEM**: Don't know when things break
**IMPACT**: Customers find bugs before you do

**SOLUTION**:
Install Sentry:
```bash
composer require sentry/sentry-laravel
```

Configure in `.env`:
```env
SENTRY_LARAVEL_DSN=your_sentry_dsn
```

Errors automatically reported:
```php
try {
    $payment = $this->processPayment($data);
} catch (\Exception $e) {
    report($e); // Sentry captures this
    return response()->json(['error' => 'Payment failed'], 500);
}
```

---

### 14. API Versioning (1 hour)

**PROBLEM**: Updating API breaks old mobile apps
**IMPACT**: 1-star reviews, angry users

**SOLUTION**:
File: `backend/routes/api.php`
```php
Route::prefix('v1')->group(function () {
    Route::post('/bookings', [BookingControllerV1::class, 'store']);
});

Route::prefix('v2')->group(function () {
    Route::post('/bookings', [BookingControllerV2::class, 'store']);
});
```

Mobile apps specify version:
```javascript
// OLD APP:
fetch('api.com/api/v1/bookings')

// NEW APP:
fetch('api.com/api/v2/bookings')
```

---

### 15. Caching Layer (1 hour)

**PROBLEM**: Every request hits database
**IMPACT**: Slow performance, crashes under load

**SOLUTION**:
Install Redis:
```bash
composer require predis/predis
```

Cache expensive queries:
```php
public function getProviders() {
    return Cache::remember('providers_list', 3600, function () {
        return Provider::with('services')->get();
    });
}

public function updateProvider($id, $data) {
    $provider = Provider::find($id);
    $provider->update($data);
    Cache::forget('providers_list'); // Clear cache
}
```

---

## 🧪 TESTING GUIDE {#testing}

### Test Webhook Security
```bash
# Should FAIL (no signature):
curl -X POST "http://yourapi.com/api/webhook/chapa" \
  -d '{"tx_ref":"TEST","status":"success"}'
# Expected: 401 Unauthorized
```

### Test Rate Limiting
```bash
# Try 6 logins (should block after 5):
for i in {1..6}; do
  curl -X POST "http://yourapi.com/api/customer/login" \
    -d "email=test@test.com&password=wrong"
done
# Expected: 429 Too Many Requests on 6th
```

### Test Authorization
```bash
# Login as Customer A, try Customer B's booking:
curl "http://yourapi.com/api/customer/bookings/999" \
  -H "Authorization: Bearer $CUSTOMER_A_TOKEN"
# Expected: 404 Not Found
```

### Test IP Whitelist
```bash
# Try admin login from unauthorized IP:
curl -X POST "http://yourapi.com/api/admin/login" \
  -d "email=admin@test.com&password=password"
# Expected: 403 Access Denied
```

---

## 📋 DEPLOYMENT CHECKLIST {#deployment}

### Before Deploying

- [ ] All critical fixes completed
- [ ] All tests passing
- [ ] Tested in staging environment
- [ ] CHAPA_WEBHOOK_SECRET set in production .env
- [ ] APP_ENV=production in production .env
- [ ] ADMIN_ALLOWED_IPS configured
- [ ] Cleared all caches: `php artisan config:clear`
- [ ] Monitoring/logging enabled
- [ ] Database backup created
- [ ] Rollback plan ready

### After Deploying

- [ ] Monitor logs: `tail -f storage/logs/laravel.log`
- [ ] Test webhook with real Chapa signature
- [ ] Test rate limiting with real traffic
- [ ] Verify authorization checks working
- [ ] Check error tracking dashboard
- [ ] Monitor performance metrics

---

## 📊 PROGRESS TRACKER

| Priority | Issue | Time | Status | Tested |
|----------|-------|------|--------|--------|
| P0 | Payment Callback Signature | 20m | ⬜ | ⬜ |
| P0 | Race Conditions | 30m | ⬜ | ⬜ |
| P0 | Public Data Scraping | 10m | ⬜ | ⬜ |
| P0 | Authorization Checks | 30m | ⬜ | ⬜ |
| P0 | File Upload Security | 20m | ⬜ | ⬜ |
| P1 | IP Whitelist | 45m | ⬜ | ⬜ |
| P1 | Request Logging | 30m | ⬜ | ⬜ |
| P1 | Idempotency Keys | 1h | ⬜ | ⬜ |
| P1 | Audit Trail | 1h | ⬜ | ⬜ |
| P2 | Price Limits | 15m | ⬜ | ⬜ |
| P2 | XSS Protection | 30m | ⬜ | ⬜ |
| P2 | Database Backups | 1h | ⬜ | ⬜ |
| P2 | Error Tracking | 30m | ⬜ | ⬜ |
| P2 | API Versioning | 1h | ⬜ | ⬜ |
| P2 | Caching | 1h | ⬜ | ⬜ |

**Total Time**: ~10 hours for all fixes
**Critical Only**: ~1.5 hours

---

## 🎯 SECURITY SCORE IMPROVEMENT

| Category | Before | After Critical | After All |
|----------|--------|----------------|-----------|
| Authentication | 9/10 | 9/10 | 9/10 |
| Authorization | 5/10 | 8/10 | 9/10 |
| Rate Limiting | 2/10 | 8/10 | 9/10 |
| Payment Security | 3/10 | 8/10 | 9/10 |
| Data Protection | 5/10 | 6/10 | 8/10 |
| Monitoring | 3/10 | 4/10 | 7/10 |
| **OVERALL** | **5/10** | **7.5/10** | **8.5/10** |

---

## 🆘 TROUBLESHOOTING

### "Missing signature" errors
**Problem**: CHAPA_WEBHOOK_SECRET not set
**Solution**: 
```bash
php artisan tinker
>>> config('services.chapa.webhook_secret')
# If null, add to .env and run: php artisan config:clear
```

### Rate limiting blocking real users
**Problem**: Limits too strict
**Solution**: Increase limits
```php
Route::middleware(['throttle:10,1'])->group(function () {
    // Changed from 5 to 10
});
```

### Can't access admin panel
**Problem**: IP whitelist blocking you
**Solution**: Add your IP to .env
```env
ADMIN_ALLOWED_IPS=your_ip_here
```

---

## 💡 FINAL RECOMMENDATIONS

1. **Start with 30-minute quick fix** - Prevents most critical attacks
2. **Fix all Priority 0 issues today** - Prevents financial loss
3. **Fix Priority 1 this week** - Improves security posture
4. **Fix Priority 2 this month** - Production-ready system
5. **Get security audit** - Professional review
6. **Set up monitoring** - Know when things break
7. **Regular reviews** - Monthly security checks

**Remember**: Security is ongoing, not one-time!

---

**Document Version**: 1.0
**Last Updated**: April 3, 2026
**Next Review**: After implementing all critical fixes
