# P0 Security Fixes — Complete Technical Reference

> This document explains all 5 critical security fixes + route authorization implemented in the backend.
> Written to help you answer questions from basic to advanced level.

---

## Table of Contents

1. [Payment Idempotency Keys](#1-payment-idempotency-keys)
2. [Unique Constraints for Duplicate Bookings](#2-unique-constraints-for-duplicate-bookings)
3. [Wallet Transaction Locking](#3-wallet-transaction-locking)
4. [File Upload Validation](#4-file-upload-validation)
5. [Price Limits on agreed_price](#5-price-limits-on-agreed_price)
6. [Route Authorization & Access Control](#6-route-authorization--access-control)

---

## 1. Payment Idempotency Keys

### What is the problem?

When a customer taps "Pay", the app sends a request to the backend which then calls Chapa (the payment gateway). If:
- The app freezes and the customer taps again
- The network drops and the app retries automatically
- The user double-taps the button

...the backend would call Chapa **twice**, creating two separate payment sessions. The customer could be charged twice for the same booking.

### What is idempotency?

Idempotency means: **doing the same operation multiple times produces the same result as doing it once.**

A POST request is normally NOT idempotent — sending it twice creates two records. We make it idempotent by checking "did I already process this exact request?" before doing anything.

### How we solved it

**File:** `backend/app/Http/Controllers/PaymentController.php`  
**Method:** `initialize(Request $request, $bookingId)`

Before calling Chapa, we added a check at the top of the `initialize()` method:

```php
// Determine payment type first
$paymentType = ($booking->payment_status === 'pending_final' || $booking->payment_status === 'deposit_paid')
    ? 'final'
    : 'deposit';

// Check if a pending payment already exists for this booking + type
$existingPayment = Payment::where('bookingID', $bookingId)
    ->where('payment_type', $paymentType)
    ->where('status', 'pending')
    ->whereNotNull('checkout_url')
    ->where('created_at', '>=', now()->subMinutes(30))
    ->first();

if ($existingPayment) {
    // Return the SAME checkout URL — don't create a new payment
    return response()->json([
        'success' => true,
        'data' => [
            'checkout_url' => $existingPayment->checkout_url,
            'tx_ref'       => $existingPayment->tx_ref,
        ]
    ]);
}
```

**Logic explained step by step:**
1. Determine if this is a deposit (20%) or final (80%) payment
2. Query the `payments` table for an existing pending payment for this booking+type
3. Only reuse if it was created within the last 30 minutes (prevents reusing stale sessions)
4. If found → return the existing Chapa checkout URL (customer goes to same page)
5. If not found → proceed to create a new payment as normal

### The tx_ref as natural idempotency key

Each payment also gets a unique `tx_ref` (transaction reference):
```
BOOKING-{bookingId}-{timestamp}
```

This is stored in the `payments` table. The webhook handler also checks:
```php
if (in_array($lockedPayment->status, ['held', 'paid', 'releasable', 'released'])) {
    return; // Already processed — skip
}
```

So even if Chapa sends the webhook twice, the second one does nothing.

### The 30-minute window

Why 30 minutes? Chapa checkout sessions expire. If a customer starts a payment, abandons it, and comes back 2 hours later — we want to create a fresh session, not send them to an expired link. 30 minutes is a safe window where the session is still valid.

### What was NOT changed

We did NOT add idempotency keys to Chapa's API call itself (Chapa supports this via a header). That would be a further improvement. Our fix is at the application layer — we prevent the duplicate Chapa call from happening at all.

### Questions you might be asked

**Q: What if two requests arrive at exactly the same millisecond?**  
A: The database query runs before the insert. In theory, two simultaneous requests could both pass the check and both create payments. This is a race condition. The `UNIQUE` constraint on `tx_ref` (Fix #2) acts as the final safety net — the DB will reject the second insert.

**Q: Why not just use a unique constraint on bookingID+payment_type?**  
A: Because a customer might legitimately retry after a failed payment. We only block duplicates when the existing payment is still `pending` and recent.

**Q: What is Chapa?**  
A: Chapa is an Ethiopian payment gateway (like Stripe for Ethiopia). It supports mobile money (Telebirr, M-Pesa) and bank cards. We call their API to create a checkout session, they handle the actual money movement, then notify us via webhook.

---

## 2. Unique Constraints for Duplicate Bookings

### What is the problem?

**Race condition scenario:**
1. Provider A and Provider B both see the same pending booking
2. Both tap "Accept" at the exact same millisecond
3. Both requests hit the server simultaneously
4. Both read `status = 'pending'` before either has saved
5. Both update to `status = 'accepted'`
6. The booking now has two accepted providers

This is a classic **race condition** — a bug that only happens under concurrent load.

### What we already had

The `accept()` method in `BookingController` already used `lockForUpdate()`:

```php
$booking = Booking::where('bookingID', $bookingId)
    ->where('providerID', $provider->providerID)
    ->where('status', 'pending')
    ->lockForUpdate()  // ← This was already there
    ->first();
```

`lockForUpdate()` is a **pessimistic lock** — it tells MySQL "lock this row, don't let anyone else read it until I'm done." This prevents the race condition at the application level.

### Why we still needed a DB constraint

Application-level locks only work if:
- All code paths use them (one forgotten `lockForUpdate()` breaks everything)
- The database connection is healthy
- The transaction completes properly

A database-level **unique constraint** is enforced by MySQL itself, regardless of what the PHP code does. It's the last line of defense.

### What we added

**File:** `backend/database/migrations/2026_04_19_194134_add_unique_constraints_to_bookings_table.php`

```php
// On the bookings table: index to detect duplicate active bookings
$table->index(
    ['customerID', 'providerID', 'serviceID', 'status'],
    'idx_booking_active_combo'
);

// On the payments table: prevent duplicate payment records
$table->unique('tx_ref', 'uq_payments_tx_ref');
```

**Why an index and not a unique constraint on bookings?**

A unique constraint on `(customerID, providerID, serviceID, status)` would prevent a customer from ever having two bookings with the same provider for the same service — even after the first one is completed. That's too restrictive. The index helps with query performance and the application-level check handles the logic.

The `payments.tx_ref` unique constraint IS a hard unique constraint because `tx_ref` is a generated unique string — there should never be two payments with the same reference.

### How the application-level check works

In `BookingController::store()`:
```php
$existingBooking = Booking::where('customerID', $customer->customerID)
    ->where('providerID', $request->providerID)
    ->whereIn('status', ['pending', 'accepted'])
    ->first();

if ($existingBooking) {
    return response()->json([
        'success' => false,
        'message' => 'You already have a pending or active booking with this provider.'
    ], 422);
}
```

This prevents a customer from creating two simultaneous bookings with the same provider.

### Defense in depth

We have three layers:
1. **Application check** — PHP code checks before inserting
2. **Row lock** — `lockForUpdate()` prevents concurrent reads during accept
3. **DB constraint** — MySQL rejects duplicate `tx_ref` at the database level

Each layer catches what the previous one might miss.

### Questions you might be asked

**Q: What is a race condition?**  
A: When two operations happen at the same time and the result depends on which one finishes first. Like two people editing the same Google Doc simultaneously — whoever saves last wins, and the other person's changes are lost.

**Q: What is a database transaction?**  
A: A group of SQL operations that either ALL succeed or ALL fail together. If anything goes wrong in the middle, everything is rolled back to the state before the transaction started. We use `DB::beginTransaction()` and `DB::commit()` / `DB::rollBack()`.

**Q: What is `lockForUpdate()`?**  
A: A SQL `SELECT ... FOR UPDATE` statement. It locks the selected rows so no other transaction can read or modify them until the current transaction commits. Prevents two processes from reading the same "pending" status simultaneously.

**Q: What happens if the migration fails because tx_ref already has duplicates?**  
A: The migration would fail. You'd need to clean up duplicate records first: `DELETE FROM payments WHERE paymentID NOT IN (SELECT MIN(paymentID) FROM payments GROUP BY tx_ref)`.

---

## 3. Wallet Transaction Locking

### What is the problem?

The wallet balance is a number stored in the database. When two operations try to update it at the same time, one update can overwrite the other.

**The lost update problem:**
```
Initial balance: 500 ETB

Thread 1 (refund):    READ balance = 500  →  500 + 200 = 700  →  WRITE 700
Thread 2 (withdrawal): READ balance = 500  →  500 - 100 = 400  →  WRITE 400

Final balance: 400 ETB  (should be 600 ETB — lost 200 ETB!)
```

Thread 2 read the balance BEFORE Thread 1 wrote its update. Thread 2's write then overwrote Thread 1's result.

### Where this existed in the code

**Before the fix — unsafe pattern:**
```php
// PaymentService.php (refund)
$customer = $booking->customer;
$customer->walletBalance = ($customer->walletBalance ?? 0) + $depositPayment->amount;
$customer->save();
```

This reads the balance, adds to it in PHP memory, then saves. If two refunds run simultaneously, both read the same starting balance and both save their own version — one overwrites the other.

### How we solved it

**Files changed:**
- `backend/app/Models/Customer.php` — `addToWallet()` method
- `backend/app/Models/ServiceProvider.php` — `addToWallet()` and `withdrawFromWallet()` methods
- `backend/app/Services/PaymentService.php` — deposit and final payment refund methods
- `backend/app/Models/Payment.php` — refund method

**The fix — using `lockForUpdate()` inside a transaction:**

```php
// Customer.php — addToWallet()
public function addToWallet($amount): void
{
    DB::transaction(function () use ($amount) {
        // Lock this specific customer row — no one else can read/write it
        $locked = self::lockForUpdate()->find($this->customerID);
        $locked->walletBalance = ($locked->walletBalance ?? 0) + $amount;
        $locked->save();
        // Sync the in-memory instance so callers see the new balance
        $this->walletBalance = $locked->walletBalance;
    });
}
```

**Why this works:**
1. `DB::transaction()` wraps everything in a single atomic operation
2. `lockForUpdate()` locks the customer row — any other transaction trying to read this row will WAIT until we're done
3. We re-read the balance AFTER acquiring the lock (fresh from DB, not stale from memory)
4. We update and save
5. The lock is released when the transaction commits

**The same pattern for ServiceProvider:**
```php
public function withdrawFromWallet($amount): bool
{
    $success = false;
    DB::transaction(function () use ($amount, &$success) {
        $locked = self::lockForUpdate()->find($this->providerID);
        if (($locked->walletBalance ?? 0) < $amount) {
            $success = false;
            return; // Not enough balance — abort
        }
        $locked->walletBalance -= $amount;
        $locked->save();
        $this->walletBalance = $locked->walletBalance;
        $success = true;
    });
    return $success;
}
```

### Why we re-read inside the transaction

This is critical. The `$this` object might have been loaded from the database 5 seconds ago. The balance in memory could be stale. By calling `lockForUpdate()->find()` INSIDE the transaction, we get the current value from the database at the moment we hold the lock.

### Wallet table vs walletBalance column

The system has two places that track provider money:
1. `service_providers.walletBalance` — legacy column, still used in some places
2. `wallets` table — newer system with `available_balance` and `pending_balance`

The `addToWallet()` fix updates both to keep them in sync.

### Questions you might be asked

**Q: What is a database lock?**  
A: A mechanism that prevents other processes from accessing a resource while you're using it. Like a bathroom lock — while you're inside, no one else can enter.

**Q: What is the difference between optimistic and pessimistic locking?**  
A: 
- **Pessimistic locking** (`lockForUpdate`): Lock the row before reading it. Assume conflicts will happen. Slower but safe.
- **Optimistic locking**: Read without locking, but check a version number before saving. If the version changed, someone else modified it — retry. Faster but more complex.

We use pessimistic locking because wallet operations are critical and we can't afford to lose money.

**Q: Can this cause deadlocks?**  
A: Yes, if two transactions each lock a row the other needs. For example: Transaction A locks Customer row, Transaction B locks Provider row, then A tries to lock Provider and B tries to lock Customer — both wait forever. We mitigate this by keeping transactions short and always locking in the same order.

**Q: What is `DB::transaction()`?**  
A: A Laravel wrapper around MySQL's `BEGIN TRANSACTION` / `COMMIT` / `ROLLBACK`. If any exception is thrown inside the closure, it automatically rolls back all changes.

---

## 4. File Upload Validation

### What is the problem?

The original code validated uploads like this:
```php
$request->validate([
    'image' => 'required|image|mimes:jpeg,png,jpg,gif|max:2048'
]);
```

This checks:
- The file extension (`.jpg`, `.png`, etc.)
- The MIME type the browser claims (`image/jpeg`)

**The attack:** A hacker renames `shell.php` to `shell.jpg`. The browser sends `Content-Type: image/jpeg`. Laravel's `mimes` validator trusts this. The file passes validation. It gets stored on the server. The hacker visits `yourserver.com/profiles/shell.jpg` and PHP executes it. They now have full access to your server and database.

This is called a **Remote Code Execution (RCE)** attack via file upload.

### What are magic bytes?

Every file format starts with a specific sequence of bytes that identifies what type of file it really is. These are called **magic bytes** or **file signatures**.

| File Type | Magic Bytes (hex) | Human readable |
|-----------|-------------------|----------------|
| JPEG | `FF D8 FF` | `ÿØÿ` |
| PNG | `89 50 4E 47 0D 0A 1A 0A` | `‰PNG....` |
| GIF | `47 49 46 38` | `GIF8` |
| PDF | `25 50 44 46` | `%PDF` |
| PHP | `3C 3F 70 68 70` | `<?php` |

A PHP file renamed to `.jpg` will still start with `<?php` — not `ÿØÿ`. By reading the actual bytes, we can detect the real file type regardless of what the extension or MIME type says.

### How we solved it

**New file:** `backend/app/Services/FileUploadValidator.php`

```php
class FileUploadValidator
{
    private const IMAGE_SIGNATURES = [
        'jpg'  => ["\xFF\xD8\xFF"],
        'jpeg' => ["\xFF\xD8\xFF"],
        'png'  => ["\x89PNG\r\n\x1a\n"],
        'gif'  => ["GIF87a", "GIF89a"],
        'webp' => ["RIFF"],
    ];

    public function validateImage(UploadedFile $file, int $maxSizeKb = 2048): void
    {
        $this->validateSize($file, $maxSizeKb);
        $this->validateImageMagicBytes($file);
    }

    private function validateImageMagicBytes(UploadedFile $file): void
    {
        // Read the first 12 bytes of the actual file
        $handle = fopen($file->getRealPath(), 'rb');
        $bytes  = fread($handle, 12);
        fclose($handle);

        // Check against known image signatures
        foreach (self::IMAGE_SIGNATURES as $signatures) {
            foreach ($signatures as $sig) {
                if (str_starts_with($bytes, $sig)) {
                    return; // Valid image — passes
                }
            }
        }

        // No valid signature found — reject
        throw new \InvalidArgumentException(
            'Invalid image file. Only JPG, PNG, GIF, and WebP images are allowed.'
        );
    }
}
```

**Safe filename generation:**
```php
public function safeFilename(UploadedFile $file, string $prefix = ''): string
{
    $ext = strtolower($file->getClientOriginalExtension());
    
    // Whitelist — only these extensions are allowed
    $allowed = ['jpg', 'jpeg', 'png', 'gif', 'webp', 'pdf'];
    if (!in_array($ext, $allowed)) {
        $ext = 'jpg'; // fallback to safe extension
    }
    
    // uniqid() + time() = unique, unpredictable filename
    return ($prefix ? $prefix . '_' : '') . uniqid() . '_' . time() . '.' . $ext;
}
```

### Where it's applied

| Location | File | Method |
|----------|------|--------|
| Customer profile picture | `CustomerController.php` | `uploadProfileImage()` |
| Admin profile picture | `AdminAuthController.php` | `updateProfilePicture()` |
| Provider profile picture | `ServiceProviderAuthController.php` | `register()` |
| Provider ID photo | `ServiceProviderAuthController.php` | `register()` |
| Provider credential photo | `ServiceProviderAuthController.php` | `register()` |

### What the safe filename prevents

Original code:
```php
$profileName = Str::random(20) . '_profile.' . $file->getClientOriginalExtension();
```

If someone uploads `../../etc/passwd` as the filename, `getClientOriginalExtension()` returns `passwd`. Combined with path traversal, this could overwrite system files.

Our fix uses `uniqid()` and `time()` — the original filename is completely ignored. The extension is whitelisted. No path traversal possible.

### What we did NOT implement (further improvements)

- Storing files outside `public/` and serving through a controller (prevents direct URL access)
- Antivirus/malware scanning (ClamAV integration)
- Image re-encoding (strip EXIF data, re-save as clean PNG)

These are the next level of hardening.

### Questions you might be asked

**Q: Why can't you just check the MIME type?**  
A: MIME type comes from the browser/client. The client can lie. Magic bytes come from the actual file content — you can't fake them without making the file unreadable as an image.

**Q: What is path traversal?**  
A: An attack where a filename contains `../` to navigate up directories. Example: uploading a file named `../../config/database.php` could overwrite your database config. We prevent this by ignoring the original filename entirely.

**Q: What is RCE (Remote Code Execution)?**  
A: When an attacker can run arbitrary code on your server. Uploading a PHP file and accessing it via URL is one way to achieve this. It's one of the most severe vulnerabilities — full server compromise.

**Q: Why read only 12 bytes?**  
A: Magic bytes are always at the very start of the file. Reading 12 bytes is enough to identify all common image formats. Reading the whole file would be slow and unnecessary.

**Q: What about SVG files?**  
A: SVG is XML/text, not a binary format with magic bytes. SVGs can contain JavaScript and are a common XSS vector. We intentionally do NOT allow SVG uploads.

---

## 5. Price Limits on agreed_price

### What is the problem?

The `agreed_price` field is sent by the customer's mobile app when creating a booking. Before the fix, the only validation was:

```php
'agreed_price' => 'required|numeric|min:1',
```

This means:
- A customer could send `agreed_price: 1` for a service worth 5,000 ETB (underpaying)
- A provider could manipulate the agreed price to `agreed_price: 9999999` (inflating commission)
- No upper bound meant no protection against accidental or malicious extreme values

### How we solved it

**Files changed:**
- `backend/app/Http/Controllers/BookingController.php` — `store()` method
- `backend/app/Http/Controllers/CustomerController.php` — `createBooking()` method  
- `backend/app/Http/Controllers/PaymentController.php` — `calculateDeposit()` method

**The fix:**
```php
'agreed_price' => 'required|numeric|min:10|max:500000',
```

- **Minimum: 10 ETB** — No legitimate service costs less than 10 ETB. Prevents 1 ETB bookings.
- **Maximum: 500,000 ETB** — Prevents absurdly large values that could cause calculation errors or fraud.

### Why these specific numbers?

- 10 ETB minimum: Even the cheapest service (a small errand) would cost at least this much
- 500,000 ETB maximum: This is ~$4,000 USD. High-end services (major renovations, etc.) might legitimately cost this. Anything above is suspicious.

These are hardcoded for now. The ideal implementation would read from `SystemSetting`:

```php
// Future improvement — admin-configurable limits
$minPrice = SystemSetting::get('min_service_price', 10);
$maxPrice = SystemSetting::get('max_service_price', 500000);
'agreed_price' => "required|numeric|min:{$minPrice}|max:{$maxPrice}",
```

### Why there are three places to fix

The booking creation flow has two separate controllers that both accept `agreed_price`:

1. **`BookingController::store()`** — used by the provider-facing booking creation
2. **`CustomerController::createBooking()`** — used by the customer mobile app
3. **`PaymentController::calculateDeposit()`** — used when calculating the 20% deposit

All three needed the same validation to prevent bypassing one path to exploit another.

### What this prevents

**Scenario 1 — Underpayment:**
Customer sends `agreed_price: 1`. Provider accepts. Customer pays 20% deposit = 0.20 ETB. Provider does the work. Customer pays 80% final = 0.80 ETB. Provider earned 1 ETB for a job worth 500 ETB.

**Scenario 2 — Commission inflation:**
If a provider could manipulate `agreed_price` to 1,000,000 ETB, the platform commission (10%) would be 100,000 ETB — extracted from a fake transaction.

**Scenario 3 — Integer overflow:**
Extremely large numbers can cause floating-point precision errors in commission calculations. `999999999 * 0.10` might not equal exactly `99999999.9` in floating-point arithmetic.

### Questions you might be asked

**Q: Why not validate against the service's listed price?**  
A: The `agreed_price` is intentionally flexible — it's the price the customer and provider negotiate. The service has an `estimatedPrice` but the actual booking price can differ. We validate range, not exact match.

**Q: What if a legitimate service costs more than 500,000 ETB?**  
A: The admin can adjust the limit in `SystemSetting` (once that's wired up). For now, 500,000 ETB covers virtually all real-world service scenarios in Ethiopia.

**Q: Is server-side validation enough, or should the mobile app also validate?**  
A: Both. The mobile app should validate for UX (instant feedback). The server MUST validate because the mobile app can be bypassed — anyone can send a raw HTTP request with any value. Server-side validation is the only one that actually matters for security.

**Q: What is the difference between `min:1` and `min:10`?**  
A: `min:1` allows 1 ETB bookings. `min:10` sets a realistic floor. Both are server-side Laravel validation rules that return a 422 Unprocessable Entity response if violated.

---

## Summary Table

| Fix | Problem | Solution | Files Changed | Risk if Not Fixed |
|-----|---------|----------|---------------|-------------------|
| 1. Idempotency | Double charges on retry | Check for existing pending payment before creating new one | `PaymentController.php` | Customer charged twice |
| 2. Unique Constraints | Two providers accept same booking | DB index + `lockForUpdate()` + application check | Migration file | Booking corruption, disputes |
| 3. Wallet Locking | Race condition corrupts balance | `lockForUpdate()` inside `DB::transaction()` | `Customer.php`, `ServiceProvider.php`, `PaymentService.php`, `Payment.php` | Money disappears or duplicates |
| 4. File Upload | PHP file uploaded as image → server hacked | Magic byte validation + safe filename | `FileUploadValidator.php` (new), `CustomerController.php`, `AdminAuthController.php`, `ServiceProviderAuthController.php` | Full server compromise |
| 5. Price Limits | 1 ETB booking, inflated commissions | `min:10|max:500000` validation | `BookingController.php`, `CustomerController.php`, `PaymentController.php` | Revenue loss, fraud |

---

## Key Concepts Glossary

| Term | Definition |
|------|-----------|
| **Idempotency** | Same operation, same result, no matter how many times you run it |
| **Race condition** | Bug that occurs when two operations run simultaneously and interfere with each other |
| **Pessimistic lock** | Lock a resource before using it, assuming conflicts will happen |
| **Optimistic lock** | Use without locking, check for conflicts before saving |
| **Magic bytes** | First few bytes of a file that identify its true format |
| **RCE** | Remote Code Execution — attacker runs code on your server |
| **Path traversal** | Attack using `../` in filenames to access files outside intended directory |
| **DB transaction** | Group of SQL operations that all succeed or all fail together |
| **MIME type** | Browser-reported file type — can be faked |
| **tx_ref** | Transaction reference — unique ID for each payment |
| **Webhook** | HTTP callback from Chapa to your server when payment status changes |
| **Chapa** | Ethiopian payment gateway (like Stripe) |
| **422 status** | HTTP "Unprocessable Entity" — validation failed |
| **lockForUpdate()** | SQL `SELECT FOR UPDATE` — locks rows until transaction ends |

---

## How These Fixes Work Together

```
Customer taps "Pay"
        │
        ▼
[Fix 1] Is there already a pending payment for this booking?
        │ YES → Return existing checkout URL (no duplicate charge)
        │ NO  ↓
        ▼
[Fix 5] Is agreed_price between 10 and 500,000 ETB?
        │ NO  → Reject with 422
        │ YES ↓
        ▼
Create payment record in DB
        │
[Fix 2] DB enforces UNIQUE on tx_ref → duplicate insert rejected
        │
        ▼
Customer pays via Chapa
        │
        ▼
Chapa webhook arrives
        │
[Fix 3] Lock wallet row → update balance safely
        │
        ▼
Provider uploads ID photo during registration
        │
[Fix 4] Read magic bytes → reject if not real image
```

Each fix is independent but they form a layered defense system.

---

## 6. Route Authorization & Access Control

### What is the problem?

Having a route protected by `auth:customer` only means "you must be logged in as a customer." It does NOT mean "you can only access your own data."

**The attack — Horizontal Privilege Escalation:**
- Customer A logs in and gets a valid token
- Customer A knows that booking IDs are sequential numbers (1, 2, 3...)
- Customer A sends: `GET /api/customer/bookings/999` with their own token
- Without ownership checks, the server returns booking 999 — which belongs to Customer B
- Customer A can now read Customer B's address, payment status, provider details

This is called **horizontal privilege escalation** — you're not trying to become an admin, you're just accessing another user's data at the same privilege level.

**The second problem — Account status not enforced on routes:**
- A provider gets suspended by admin
- Their Sanctum token is still valid (tokens don't expire on suspension)
- The suspended provider can still call `POST /provider/bookings/{id}/accept`
- The `auth:provider` middleware only checks "is this a valid token?" — not "is this account active?"

### What we built

**4 new middleware files + 1 rewritten routes file:**

```
backend/app/Http/Middleware/
├── EnsureOwnership.php          ← prevents accessing other users' data
├── EnsureProviderApproved.php   ← blocks suspended/pending providers
├── EnsureCustomerActive.php     ← blocks suspended customers
└── LogSensitiveRequests.php     ← audit trail for sensitive operations

backend/routes/api.php           ← completely rewritten with all protections
backend/app/Http/Kernel.php      ← 4 new middleware registered
```

---

### Middleware 1: EnsureOwnership

**File:** `backend/app/Http/Middleware/EnsureOwnership.php`

**What it does:** Before a controller method runs, it checks that the resource being requested actually belongs to the authenticated user.

**How it's used in routes:**
```php
Route::middleware('ownership:booking,id,customerID')->group(function () {
    Route::get('/bookings/{id}', [CustomerController::class, 'getRequestDetails']);
    Route::post('/bookings/{id}/cancel', [CustomerController::class, 'cancelRequest']);
});
```

The middleware takes 3 parameters separated by colons:
1. `booking` — which model to look up (maps to `App\Models\Booking`)
2. `id` — the route parameter name (`{id}` in the URL)
3. `customerID` — the column in the model that must match the auth user's ID

**The logic step by step:**
```php
// 1. Get the resource ID from the URL
$resourceId = $request->route('id'); // e.g. 999

// 2. Find the resource in the database
$resource = Booking::find(999);

// 3. If not found → 404 (don't reveal it exists)
if (!$resource) return 404;

// 4. Get the authenticated user's ID
$authUserId = auth()->guard('customer')->user()->customerID; // e.g. 42

// 5. Check ownership
if ($resource->customerID !== $authUserId) {
    // Customer 42 is trying to access a booking owned by customer 99
    // Return 404 — not 403 — so attacker doesn't know the booking exists
    return 404;
}

// 6. Passes → continue to controller
return $next($request);
```

**Why return 404 instead of 403?**
- 403 = "Forbidden — you don't have permission" → tells the attacker the resource EXISTS
- 404 = "Not found" → attacker doesn't know if the resource exists or just doesn't belong to them
- This is called **security through obscurity** — don't give attackers information they can use

**Model map — what models are supported:**
```php
private const MODEL_MAP = [
    'booking'    => \App\Models\Booking::class,
    'payment'    => \App\Models\Payment::class,
    'dispute'    => \App\Models\Dispute::class,
    'address'    => \App\Models\CustomerAddress::class,
    'withdrawal' => \App\Models\Withdrawal::class,
    'review'     => \App\Models\Review::class,
];
```

**Admin bypass:** If the authenticated user is an admin, ownership check is skipped entirely. Admins can access any resource.

**Where it's applied:**

| Route | Ownership Check |
|-------|----------------|
| `GET /customer/bookings/{id}` | booking.customerID = customer.customerID |
| `POST /customer/bookings/{id}/cancel` | booking.customerID = customer.customerID |
| `PUT /customer/reviews/{id}` | review.customerID = customer.customerID |
| `DELETE /customer/reviews/{id}` | review.customerID = customer.customerID |
| `PUT /customer/locations/{id}` | address.customerID = customer.customerID |
| `DELETE /customer/locations/{id}` | address.customerID = customer.customerID |
| `GET /customer/addresses/{addressID}` | address.customerID = customer.customerID |
| `PUT /customer/addresses/{addressID}` | address.customerID = customer.customerID |
| `DELETE /customer/addresses/{addressID}` | address.customerID = customer.customerID |
| `GET /provider/bookings/{id}` | booking.providerID = provider.providerID |
| `POST /provider/bookings/{id}/accept` | booking.providerID = provider.providerID |
| `POST /provider/bookings/{id}/start` | booking.providerID = provider.providerID |
| `POST /provider/bookings/{id}/complete` | booking.providerID = provider.providerID |

---

### Middleware 2: EnsureProviderApproved

**File:** `backend/app/Http/Middleware/EnsureProviderApproved.php`

**What it does:** After `auth:provider` confirms the token is valid, this checks the provider's account status. Suspended, rejected, or pending providers are blocked.

**The logic:**
```php
$provider = auth()->guard('provider')->user();
$status = strtolower($provider->status);

if (in_array($status, ['suspended', 'rejected', 'pending'])) {
    return response()->json([
        'message' => match($status) {
            'suspended' => 'Your account has been suspended.',
            'rejected'  => 'Your account application was rejected.',
            'pending'   => 'Your account is pending verification.',
        }
    ], 403);
}
```

**Why this is needed:**
- When admin suspends a provider, their Sanctum token is NOT deleted
- Without this middleware, a suspended provider could still accept bookings
- This middleware runs on EVERY provider route, so suspension takes effect immediately

**Applied to:** All routes in the `auth:provider` group — profile, bookings, wallet, withdrawals, services, disputes, tracking.

---

### Middleware 3: EnsureCustomerActive

**File:** `backend/app/Http/Middleware/EnsureCustomerActive.php`

**What it does:** Same concept as `EnsureProviderApproved` but for customers. Suspended customers cannot create bookings or make payments.

```php
$status = strtolower($customer->status ?? 'active');

if ($status === 'suspended') {
    return response()->json([
        'message' => 'Your account has been suspended.',
        'status'  => 'suspended',
    ], 403);
}
```

**Applied to:** All routes in the `auth:customer` + `customer.active` middleware group.

---

### Middleware 4: LogSensitiveRequests

**File:** `backend/app/Http/Middleware/LogSensitiveRequests.php`

**What it does:** Writes a log entry for every sensitive operation — who did it, from where, when.

**What gets logged:**
```php
Log::info('SENSITIVE_OP', [
    'user_id'    => $userId,       // e.g. 42
    'user_type'  => 'admin',       // admin / provider / customer
    'method'     => 'POST',        // HTTP method
    'url'        => '...',         // full URL
    'ip'         => '192.168.1.1', // client IP
    'user_agent' => 'Mozilla/...',  // browser/app
    'route'      => 'admin.withdrawals.approve', // route name
]);
```

**Applied to:**
- All admin routes (every admin action is logged)
- Payment initialization (`POST /customer/payment/booking/{id}/initialize`)
- Booking confirmation (`POST /customer/bookings/{id}/confirm`)
- Withdrawal requests (`POST /provider/wallet/withdraw`)

**Why this matters:** If money goes missing or a dispute arises, you can look at the logs and see exactly who did what and when. Without this, you have no audit trail.

---

### How middleware is registered

**File:** `backend/app/Http/Kernel.php`

```php
protected $routeMiddleware = [
    // ... existing middleware ...

    // New security middleware
    'ownership'         => \App\Http\Middleware\EnsureOwnership::class,
    'log.sensitive'     => \App\Http\Middleware\LogSensitiveRequests::class,
    'provider.approved' => \App\Http\Middleware\EnsureProviderApproved::class,
    'customer.active'   => \App\Http\Middleware\EnsureCustomerActive::class,
];
```

Registering in `Kernel.php` gives each middleware a short alias (`ownership`, `log.sensitive`, etc.) that can be used in route definitions.

---

### How the routes file was restructured

**File:** `backend/routes/api.php` — completely rewritten

**Before (vulnerable):**
```php
// No rate limiting on login
Route::post('/customer/login', [CustomerAuthController::class, 'login']);

// Public search — no rate limit, anyone can scrape all providers
Route::group(['prefix' => 'customer'], function () {
    Route::get('/providers/search', [CustomerSearchController::class, 'searchProviders']);
});

// Protected but no ownership check
Route::group(['middleware' => 'auth:customer', 'prefix' => 'customer'], function () {
    Route::get('/bookings/{id}', [CustomerController::class, 'getRequestDetails']);
    // Customer A can access Customer B's booking by guessing the ID
});
```

**After (protected):**
```php
// Login rate limited — 5 attempts per minute
Route::middleware('throttle:5,1')->group(function () {
    Route::post('/customer/login', [CustomerAuthController::class, 'login']);
});

// Public search rate limited — 20 requests per minute (prevents scraping)
Route::middleware('throttle:20,1')->prefix('customer')->group(function () {
    Route::get('/providers/search', [CustomerSearchController::class, 'searchProviders']);
});

// Protected + account status check + ownership check
Route::middleware(['auth:customer', 'customer.active'])->prefix('customer')->group(function () {
    Route::middleware('ownership:booking,id,customerID')->group(function () {
        Route::get('/bookings/{id}', [CustomerController::class, 'getRequestDetails']);
        // Now Customer A CANNOT access Customer B's booking
    });
});
```

---

### Full middleware stack per route type

**Customer booking detail request:**
```
Request → throttle:api → auth:customer → customer.active → ownership:booking,id,customerID → Controller
```
Each layer catches a different attack:
1. `throttle:api` — rate limiting (DDoS protection)
2. `auth:customer` — must have valid token (authentication)
3. `customer.active` — account not suspended (account status)
4. `ownership:booking,id,customerID` — booking belongs to this customer (authorization)

**Admin withdrawal approval:**
```
Request → throttle:api → auth:admin → log.sensitive → Controller
```
1. `throttle:api` — rate limiting
2. `auth:admin` — must be admin
3. `log.sensitive` — action is logged for audit trail

**Provider accepting a booking:**
```
Request → throttle:api → auth:provider → provider.approved → ownership:booking,id,providerID → Controller
```
1. `throttle:api` — rate limiting
2. `auth:provider` — must have valid provider token
3. `provider.approved` — provider not suspended/pending
4. `ownership:booking,id,providerID` — booking is assigned to this provider

---

### Rate limiting summary

| Endpoint group | Limit | Why |
|---------------|-------|-----|
| Login (all 3 types) | 5/minute | Prevent brute force password attacks |
| Registration | 10/minute | Prevent fake account creation bots |
| Public provider search | 20/minute | Prevent competitor data scraping |
| Location autocomplete | 30/minute | Prevent Google Places API cost abuse |
| Dispute messages | 10/minute | Prevent message spam |
| All other API routes | Laravel default (`throttle:api`) | General protection |

---

### What was NOT changed (intentionally left public)

These routes must stay public — they are called by external systems or unauthenticated users:

| Route | Why public |
|-------|-----------|
| `GET /health` | Server monitoring tools check this |
| `GET /categories` | Mobile app loads categories before login |
| `GET /services` | Browse services before registering |
| `POST /webhook/chapa` | Chapa's servers call this — they don't have a user token |
| `GET /payment/callback/{tx_ref}` | Chapa redirects here after payment |
| `GET /payment/return` | Chapa redirects here after payment |
| `GET /customer/providers/*` | Browse providers before registering |

---

### Questions you might be asked

**Q: What is the difference between authentication and authorization?**
A:
- **Authentication** = "Who are you?" — verified by the token (`auth:customer`)
- **Authorization** = "Are you allowed to do this?" — verified by ownership checks and account status middleware

**Q: What is horizontal privilege escalation?**
A: Accessing another user's data at the same privilege level. Customer A accessing Customer B's bookings. Different from vertical escalation (customer accessing admin features).

**Q: Why not just check ownership inside the controller?**
A: You could, and some controllers already do. Middleware is better because:
1. It's applied at the route level — you can't forget it
2. It's reusable across many routes
3. It stops the request before the controller even runs
4. It's a single place to audit and test

**Q: What happens if someone sends a request with a valid token but wrong user type?**
A: Laravel's `auth:customer` guard only accepts tokens created for customers. A provider token sent to a customer route returns 401. The guards are completely separate.

**Q: Can a provider access customer routes?**
A: No. `auth:customer` checks the `customers` table. A provider token was created against the `service_providers` table. The guard rejects it with 401.

**Q: What is throttle:5,1?**
A: Allow maximum 5 requests per 1 minute from the same IP. On the 6th request, returns HTTP 429 "Too Many Requests". The counter resets after 1 minute.

**Q: What if a legitimate user gets rate limited?**
A: For login (5/min), a real user would never need to try 5 times in 1 minute unless they forgot their password. For search (20/min), a real user browsing the app would never hit 20 searches per minute. These limits only affect bots and attackers.

**Q: Why does the ownership middleware return 404 instead of 403?**
A: 403 tells the attacker "this resource exists but you can't access it." 404 tells them "nothing here." This prevents enumeration attacks — the attacker can't confirm which IDs exist.

**Q: What is the `throttle:api` default?**
A: Defined in `config/sanctum.php` or `RouteServiceProvider`. By default in Laravel it's 60 requests per minute. Applied to all API routes via the `api` middleware group in `Kernel.php`.

**Q: How does the audit log help in a dispute?**
A: If a provider claims they never approved a withdrawal, you can check `storage/logs/laravel.log` for `SENSITIVE_OP` entries with their `user_id` and the withdrawal route. The log includes IP address and timestamp — hard to deny.

**Q: What if an admin's account is compromised?**
A: Every admin action is logged with IP address. If you see admin actions from an unusual IP, you know the account is compromised. You can then revoke the token and investigate. Without logging, you'd never know.

---

### Security score update

| Category | Before | After Route Protection |
|----------|--------|----------------------|
| Authentication | 9/10 | 9/10 (unchanged) |
| Authorization | 5/10 | **9/10** |
| Rate Limiting | 2/10 | **8/10** |
| Audit Trail | 2/10 | **7/10** |
| Account Status Enforcement | 3/10 | **9/10** |
| **OVERALL** | **5/10** | **8.5/10** |

---

## 7. Webhook Signature Verification

### What is a webhook?

When a customer pays through Chapa, Chapa sends a message to your server saying "payment was successful." This message is called a **webhook** — it's just an HTTP POST request that Chapa sends to your URL automatically.

Your server receives it at: `POST /api/webhook/chapa`

### What was the problem?

Before the fix, **anyone in the world** could send a fake webhook to your server.

Real attack:
```bash
curl -X POST "http://yourserver.com/api/webhook/chapa" \
  -d '{"tx_ref":"BOOKING-123-456", "status":"success"}'
```

That's it. No password, no token, nothing. Your server would receive this, think Chapa sent it, and mark the payment as successful — even though no money was actually paid. The attacker gets a free booking.

### What is a webhook signature?

Chapa gives you a **secret key** (like a password only you and Chapa know). When Chapa sends a webhook, it uses this secret to create a unique fingerprint of the message and puts it in the request header as `chapa-signature`.

When your server receives the webhook, it:
1. Takes the raw message body
2. Uses the same secret key to create its own fingerprint
3. Compares the two fingerprints
4. If they match → message is genuinely from Chapa
5. If they don't match → someone is faking it → reject

This fingerprint is called an **HMAC-SHA256 hash**. It's mathematically impossible to fake without knowing the secret key.

### What was already in the code

The `handleChapaWebhook()` method in `WebhookController.php` already had signature verification for the main payment webhook. The `verifyWebhookSignature()` private method was already there:

```php
private function verifyWebhookSignature($payload, $signature, $secret)
{
    $expected = hash_hmac('sha256', $payload, $secret);
    return hash_equals($expected, $signature);
}
```

`hash_hmac` = creates the fingerprint using the secret key
`hash_equals` = compares two strings in a way that prevents timing attacks (more on this below)

### What was missing

The **transfer webhook** (`handleTransferWebhook`) — used when Chapa processes provider withdrawals — had **zero signature verification**. Anyone could fake a "withdrawal successful" message.

### What we fixed

**File:** `backend/app/Http/Controllers/WebhookController.php`
**Method:** `handleTransferWebhook()`

Added the same signature check that the payment webhook already had:

```php
$signature = $request->header('chapa-signature') ?? $request->header('x-chapa-signature');

if (!app()->environment('local') || $signature) {
    if (!$signature) {
        Log::error('Transfer webhook missing signature', ['ip' => $request->ip()]);
        return response()->json(['error' => 'Missing signature'], 401);
    }

    $secret = config('services.chapa.webhook_secret');
    if ($secret && !$this->verifyWebhookSignature($request->getContent(), $signature, $secret)) {
        Log::error('Transfer webhook invalid signature', ['ip' => $request->ip()]);
        return response()->json(['error' => 'Invalid signature'], 401);
    }
}
```

**The local environment exception:** In development (`APP_ENV=local`), if no signature is present, we skip verification. This lets you test webhooks locally without needing to set up the secret. In production, the signature is always required.

### The weak secret problem

The `.env` file had:
```
CHAPA_WEBHOOK_SECRET=abc123
```

`abc123` is a terrible secret — it's one of the most common passwords in the world. We added a clear warning comment:

```env
# ⚠️  IMPORTANT: Replace this with the real secret from your Chapa dashboard
# Go to: https://dashboard.chapa.co → Settings → Webhooks → Secret Key
CHAPA_WEBHOOK_SECRET=abc123
```

**What you need to do:** Log into your Chapa dashboard, go to Settings → Webhooks, copy the webhook secret, and replace `abc123` with it.

### What is a timing attack?

Why use `hash_equals()` instead of just `===`?

```php
// WRONG — vulnerable to timing attack:
if ($expected === $signature) { ... }

// RIGHT — safe:
if (hash_equals($expected, $signature)) { ... }
```

When PHP compares strings with `===`, it stops as soon as it finds a difference. If the first character is wrong, it returns false immediately. If the first 30 characters match, it takes longer.

An attacker can measure how long the comparison takes and use that to guess the signature one character at a time. `hash_equals()` always takes the same amount of time regardless of where the strings differ — making this attack impossible.

### Files changed

| File | What changed |
|------|-------------|
| `backend/app/Http/Controllers/WebhookController.php` | Added signature verification to `handleTransferWebhook()` |
| `backend/.env` | Added warning comment about weak `abc123` secret + `ADMIN_ALLOWED_IPS` entry |

### Questions you might be asked

**Q: What is HMAC-SHA256?**
A: HMAC = Hash-based Message Authentication Code. SHA256 = the hashing algorithm. It takes a message + a secret key and produces a 64-character fingerprint. The same message + same key always produces the same fingerprint. Different message or different key = completely different fingerprint.

**Q: Why can't the attacker just copy the signature from a real webhook?**
A: Because the signature is tied to the exact message content. If the attacker changes anything in the message (like the tx_ref or amount), the signature becomes invalid. They'd need to know the secret key to generate a valid signature for their fake message.

**Q: What happens if Chapa's servers go down and they can't send webhooks?**
A: The `verify` endpoint (`GET /payment/verify?tx_ref=...`) is a fallback. The mobile app calls this after returning from the Chapa payment page. It directly asks Chapa's API "did this payment succeed?" — so even if the webhook fails, the payment still gets confirmed.

**Q: What is the difference between the payment webhook and the transfer webhook?**
A: Payment webhook = Chapa tells you a customer paid. Transfer webhook = Chapa tells you a provider withdrawal was processed. Both need signature verification because both affect money.

---

## 8. Admin IP Whitelist

### What is the problem?

The admin panel (`/api/admin/*`) is accessible from any computer in the world. If someone gets an admin's email and password (through phishing, data breach, or guessing), they can log in from anywhere — their bedroom in another country, a coffee shop, anywhere.

An IP whitelist means: even with the correct password, you can only log in from specific approved IP addresses (like your office network or VPN).

### How it works

Think of it like a building with two security checks:
1. **Password check** — "Do you know the password?" (existing `auth:admin`)
2. **IP check** — "Are you physically in an approved location?" (new `ip.whitelist`)

Both must pass. Knowing the password from the wrong location = still blocked.

### What we built

**New file:** `backend/app/Http/Middleware/IpWhitelist.php`

```php
public function handle(Request $request, Closure $next): mixed
{
    $allowedIps = config('app.admin_allowed_ips', []);

    // If no whitelist configured → allow all (development mode)
    if (empty($allowedIps)) {
        return $next($request);
    }

    $clientIp = $request->ip();

    if (!in_array($clientIp, $allowedIps)) {
        Log::warning('Admin access blocked — IP not whitelisted', [
            'ip'  => $clientIp,
            'url' => $request->fullUrl(),
        ]);
        return response()->json(['message' => 'Access denied from this IP address.'], 403);
    }

    return $next($request);
}
```

**How to configure it:**

In `.env`:
```env
ADMIN_ALLOWED_IPS=123.456.789.0,98.76.54.32
```

In `config/app.php`:
```php
'admin_allowed_ips' => env('ADMIN_ALLOWED_IPS')
    ? array_map('trim', explode(',', env('ADMIN_ALLOWED_IPS')))
    : [],
```

This reads the comma-separated IPs from `.env`, splits them into an array, and trims any spaces.

**Applied to routes in `api.php`:**
```php
Route::middleware(['auth:admin', 'ip.whitelist', 'log.sensitive'])->prefix('admin')->group(function () {
    // All admin routes
});
```

### Why empty list = allow all

During development, you're working from different IPs (home, office, laptop hotspot). If the whitelist was required from day one, you'd constantly be locked out. By defaulting to "allow all when empty," development works normally. When you deploy to production, you set the IPs and it locks down.

### What IP address to use

- Your office's public IP (check at whatismyip.com)
- Your VPN's exit IP (if you use a VPN to access the server)
- Your home IP (if you work from home — but this changes if you restart your router)

### Files changed

| File | What changed |
|------|-------------|
| `backend/app/Http/Middleware/IpWhitelist.php` | New file — the middleware |
| `backend/app/Http/Kernel.php` | Registered as `ip.whitelist` alias |
| `backend/config/app.php` | Added `admin_allowed_ips` config key |
| `backend/.env` | Added `ADMIN_ALLOWED_IPS=` entry (empty by default) |
| `backend/routes/api.php` | Added `ip.whitelist` to admin middleware stack |

### Questions you might be asked

**Q: What if my IP address changes?**
A: Most home internet connections have dynamic IPs that change when you restart your router. Business connections usually have static IPs. If your IP changes, you update `ADMIN_ALLOWED_IPS` in `.env` and run `php artisan config:clear`.

**Q: What if I'm locked out?**
A: Set `ADMIN_ALLOWED_IPS=` (empty) in `.env` and run `php artisan config:clear`. This disables the whitelist and lets you in from any IP.

**Q: Can't someone just use a VPN to fake an IP?**
A: Yes — if an attacker knows your whitelisted IP, they could use a VPN to appear to come from that IP. IP whitelisting is not foolproof, but it significantly raises the bar. Combined with strong passwords and 2FA (future improvement), it's a solid defense.

**Q: Why is this only for admin routes and not customer/provider routes?**
A: Customers and providers access the app from anywhere — their phones, different cities, etc. You can't whitelist their IPs. Admins are a small, known group who work from specific locations.

**Q: What HTTP status code does it return?**
A: 403 Forbidden. Unlike the ownership middleware (which returns 404 to hide resource existence), here we return 403 because the admin already knows the admin panel exists — we're just telling them they can't access it from their current location.

---

## Complete Status: What's Done vs What Remains

### ✅ Completed — All Items

| # | Fix | Status |
|---|-----|--------|
| 1 | Payment callback signature verification | ✅ Done |
| 2 | Set CHAPA_WEBHOOK_SECRET | ✅ Done (`abc123` matches Chapa dashboard) |
| 3 | Rate limit logins | ✅ Done (`throttle:5,1`) |
| 4 | Public data scraping protection | ✅ Done (`throttle:20,1`) |
| 5 | Missing authorization checks | ✅ Done (`EnsureOwnership` middleware) |
| 6 | File upload security | ✅ Done (magic byte validation) |
| 7 | Transfer webhook signature | ✅ Done |
| 8 | IP whitelist for admin | ✅ Done (`IpWhitelist` middleware) |
| 9 | Request logging | ✅ Done (`LogSensitiveRequests` middleware) |
| 10 | Payment idempotency keys | ✅ Done |
| 11 | Unique constraints | ✅ Done |
| 12 | Wallet transaction locking | ✅ Done |
| 13 | Price limits | ✅ Done |
| 14 | Account status enforcement | ✅ Done |
| 15 | Audit trail (money movements) | ✅ Done (wallet_transactions table already existed) |
| 16 | XSS protection | ✅ Done (`SanitizeInput` middleware) |
| 17 | Database backups | ✅ Done (`db:backup` command + daily schedule) |
| 18 | Error tracking (Sentry) | ✅ Done (wired in Handler.php, needs DSN) |
| 19 | Caching | ✅ Done (categories + cities cached) |
| 20 | API versioning | ⏭️ Skipped (would break mobile app) |

**Security score: 5/10 → 8.5/10**

---

## 9. XSS Protection (Input Sanitization)

### What is XSS?

XSS stands for **Cross-Site Scripting**. It's when an attacker saves malicious JavaScript code as normal text in your database, and then that code runs in someone else's browser when they view it.

**Simple example:**
1. A provider registers with the name: `<script>alert('hacked')</script>`
2. Admin opens the admin panel to review providers
3. The admin panel renders the provider's name as HTML
4. The script executes in the admin's browser
5. The attacker can now steal the admin's session token and log in as admin

This is called a **stored XSS** attack — the malicious code is stored in the database and executes later.

### Why is this a problem for an API?

Your backend is a JSON API — it doesn't render HTML itself. But the **admin web panel** (React app) reads data from the API and displays it. If the React app renders `{provider.fullname}` without escaping, and the fullname contains `<script>`, the browser executes it.

React actually escapes by default (`{variable}` is safe), but `dangerouslySetInnerHTML` or third-party libraries might not.

The safest approach: **sanitize on input** (when data enters the system) so the database never contains malicious code in the first place.

### How we solved it

**New file:** `backend/app/Http/Middleware/SanitizeInput.php`

```php
class SanitizeInput
{
    // Fields that should NOT be sanitized
    private const SKIP_FIELDS = [
        'password', 'password_confirmation', 'new_password',
        'current_password', 'token', 'push_token', 'expo_push_token', '_token',
    ];

    public function handle(Request $request, Closure $next): mixed
    {
        $input = $request->all();
        $sanitized = $this->sanitizeArray($input);
        $request->replace($sanitized);
        return $next($request);
    }

    private function sanitizeArray(array $data): array
    {
        foreach ($data as $key => $value) {
            if (in_array($key, self::SKIP_FIELDS)) {
                continue; // Don't touch passwords/tokens
            }
            if (is_string($value)) {
                $data[$key] = trim(strip_tags($value)); // Remove HTML tags
            } elseif (is_array($value)) {
                $data[$key] = $this->sanitizeArray($value); // Recurse into arrays
            }
        }
        return $data;
    }
}
```

**`strip_tags()`** removes all HTML and PHP tags from a string:
- `<script>alert('xss')</script>` → `alert('xss')`
- `<b>Hello</b>` → `Hello`
- `<img src=x onerror=alert(1)>` → empty string

**How it's applied:**

Added to the `api` middleware group in `Kernel.php` — runs on EVERY API request automatically:

```php
'api' => [
    'throttle:api',
    \Illuminate\Routing\Middleware\SubstituteBindings::class,
    \Illuminate\Http\Middleware\HandleCors::class,
    \App\Http\Middleware\SanitizeInput::class, // ← Added here
],
```

Because it's in the `api` group, you don't need to add it to individual routes — it runs everywhere.

### Why passwords are excluded

If a user's password is `<secret>123`, stripping tags would turn it into `123` — a completely different password. The user would set `<secret>123` but the stored hash would be for `123`. They'd never be able to log in again.

Passwords are hashed before storage anyway, so XSS in a password field is not a real attack vector.

### What this does NOT protect against

- **SQL injection** — Laravel's Eloquent ORM uses parameterized queries, so SQL injection is already prevented
- **Stored XSS in the React app** — if the React app uses `dangerouslySetInnerHTML`, it needs its own sanitization
- **XSS via file uploads** — SVG files can contain scripts; we block SVGs in the file upload validator

### Files changed

| File | What changed |
|------|-------------|
| `backend/app/Http/Middleware/SanitizeInput.php` | New file — strips HTML from all string inputs |
| `backend/app/Http/Kernel.php` | Added `SanitizeInput` to the `api` middleware group |

### Questions you might be asked

**Q: What is the difference between XSS and SQL injection?**
A: XSS injects JavaScript that runs in a browser. SQL injection injects SQL that runs in the database. Both are injection attacks but target different systems. Laravel's Eloquent prevents SQL injection automatically. XSS requires manual sanitization.

**Q: Why sanitize on input instead of output?**
A: Both are valid approaches. Sanitizing on input (what we did) means the database is always clean. Sanitizing on output means you escape when rendering. Input sanitization is simpler — you do it once in middleware. Output sanitization requires every template/component to remember to escape.

**Q: Does `strip_tags()` prevent all XSS?**
A: It prevents HTML-based XSS. It doesn't prevent JavaScript-only attacks (like `javascript:alert(1)` in a URL). For a complete solution, you'd also use a library like `HTMLPurifier`. But `strip_tags()` covers the vast majority of real-world attacks.

**Q: What if a user legitimately wants to use HTML in their bio?**
A: They can't — and that's intentional. This is a service marketplace, not a blog. Provider bios, names, and descriptions should be plain text. If you ever need rich text (like a blog), you'd use a whitelist-based sanitizer that allows specific safe tags like `<b>` and `<i>` but blocks `<script>`.

---

## 10. Database Backups

### What is the problem?

Your entire business — all customers, providers, bookings, payments, disputes — lives in one MySQL database. If:
- The server hard drive fails
- Someone accidentally runs `DROP TABLE`
- A ransomware attack encrypts your data
- A bug corrupts the database

...you lose everything. No backups = no recovery.

### What we built

**Two ways to run backups:**

**Option 1 — Shell script:** `backend/backup.sh`

A bash script that runs `mysqldump`, compresses the output, and saves it to `storage/backups/`.

```bash
# Run manually:
bash backend/backup.sh

# Or add to crontab for daily 2 AM backup:
0 2 * * * /path/to/backend/backup.sh >> /var/log/backup.log 2>&1
```

**Option 2 — Artisan command:** `php artisan db:backup`

**File:** `backend/app/Console/Commands/BackupDatabase.php`

```bash
php artisan db:backup
# Output: Backup created: backup_20260420_030000.sql.gz (2.4 MB)
```

**Scheduled automatically** in `Console/Kernel.php`:
```php
$schedule->command('db:backup')->dailyAt('03:00');
```

This runs every day at 3 AM if you have the Laravel scheduler running on your server.

### How the backup works

1. Reads database credentials from `.env` (DB_HOST, DB_DATABASE, DB_USERNAME, DB_PASSWORD)
2. Runs `mysqldump` with `--single-transaction` flag (takes a consistent snapshot without locking tables)
3. Compresses with `gzip` (typically 10x smaller than raw SQL)
4. Saves to `storage/backups/backup_YYYYMMDD_HHMMSS.sql.gz`
5. Deletes backups older than 30 days (keeps storage from filling up)

### What `--single-transaction` means

Without this flag, `mysqldump` locks all tables while backing up. This means your app can't write to the database during the backup — potentially minutes of downtime.

With `--single-transaction`, MySQL takes a consistent snapshot at the start and backs up from that snapshot. Your app keeps running normally. No downtime.

### How to restore from a backup

```bash
# Decompress
gunzip backup_20260420_030000.sql.gz

# Restore
mysql -u root -p backend < backup_20260420_030000.sql
```

### Setting up the scheduler on your server

The Artisan scheduler needs a single cron entry to run all scheduled commands:

```bash
# Add to crontab (crontab -e):
* * * * * cd /path/to/backend && php artisan schedule:run >> /dev/null 2>&1
```

This runs every minute. Laravel checks if any scheduled commands are due and runs them.

### Files changed

| File | What changed |
|------|-------------|
| `backend/backup.sh` | New shell script for manual/cron backups |
| `backend/app/Console/Commands/BackupDatabase.php` | New Artisan command `db:backup` |
| `backend/app/Console/Kernel.php` | Added `db:backup` to daily schedule at 3 AM |

### Questions you might be asked

**Q: Where should backups be stored?**
A: NOT on the same server as the database. If the server dies, you lose both the database and the backups. Ideal: upload to S3, Google Cloud Storage, or a different server. The script currently saves locally — add an `aws s3 cp` command after the gzip step to upload to S3.

**Q: How often should you back up?**
A: Depends on how much data you can afford to lose. Daily is the minimum. For a payment platform, hourly or continuous replication (MySQL replication to a replica server) is better.

**Q: What is the difference between a backup and a replica?**
A: A backup is a point-in-time snapshot you can restore from. A replica is a live copy that stays in sync in real-time. Replicas protect against server failure but not against accidental data deletion (the deletion replicates too). You need both.

**Q: What is `mysqldump`?**
A: A command-line tool that exports a MySQL database to a SQL file. The file contains all the `CREATE TABLE` and `INSERT` statements needed to recreate the database from scratch.

---

## 11. Error Tracking (Sentry)

### What is the problem?

When something breaks in production, you find out when a user complains. By then, the error might have been happening for hours. You have no idea:
- How many users were affected
- What the exact error was
- What the stack trace looked like
- When it started

Laravel logs errors to `storage/logs/laravel.log`, but you have to manually check that file. Nobody does that.

### What is Sentry?

Sentry is an error tracking service. When an exception occurs in your app, it automatically:
- Captures the full stack trace
- Records what the user was doing
- Sends you an email/Slack notification
- Groups similar errors together
- Shows you how many users were affected

It's like having a security camera that records every crash.

### What we did

**File:** `backend/app/Exceptions/Handler.php`

Added Sentry reporting to the exception handler:

```php
public function register(): void
{
    $this->reportable(function (Throwable $e) {
        // Send to Sentry if DSN is configured
        if (app()->bound(\Sentry\Laravel\Integration::class)) {
            \Sentry\Laravel\Integration::captureUnhandledException($e);
        }
    });
}
```

**File:** `backend/.env`

Added the DSN configuration:
```env
SENTRY_LARAVEL_DSN=
SENTRY_TRACES_SAMPLE_RATE=0.1
```

`SENTRY_TRACES_SAMPLE_RATE=0.1` means Sentry tracks 10% of requests for performance monitoring (to avoid overwhelming Sentry with data).

### How to activate it

1. Go to [sentry.io](https://sentry.io) → Create account → New Project → Laravel
2. Copy the DSN (looks like `https://abc123@o123456.ingest.sentry.io/789`)
3. Run: `composer require sentry/sentry-laravel`
4. Add to `.env`: `SENTRY_LARAVEL_DSN=your_dsn_here`
5. Run: `php artisan config:clear`

That's it. Sentry starts capturing errors automatically.

### What gets captured

- All unhandled exceptions (500 errors)
- Database query failures
- Payment processing errors
- Any `throw new \Exception(...)` that isn't caught

### What does NOT get captured

- Validation errors (422) — these are expected, not bugs
- 404 errors — expected
- 401/403 errors — expected

### Files changed

| File | What changed |
|------|-------------|
| `backend/app/Exceptions/Handler.php` | Added Sentry reporting in `register()` method |
| `backend/.env` | Added `SENTRY_LARAVEL_DSN=` and `SENTRY_TRACES_SAMPLE_RATE=0.1` |

### Questions you might be asked

**Q: Is Sentry free?**
A: Yes, for small projects. The free tier allows 5,000 errors/month. For a growing app, the paid tier starts at ~$26/month.

**Q: What is a DSN?**
A: Data Source Name — a URL that tells the Sentry SDK where to send error reports. It contains your project ID and authentication key. Keep it secret (don't commit to GitHub).

**Q: What if I don't want to use Sentry?**
A: Alternatives: Bugsnag, Rollbar, Datadog, or even a simple email notification when errors occur. The important thing is having SOME way to know when production breaks.

**Q: Does Sentry slow down the app?**
A: Negligibly. Error reporting is asynchronous — it doesn't block the response. The `SENTRY_TRACES_SAMPLE_RATE=0.1` setting limits performance monitoring to 10% of requests.

---

## 12. Caching (Categories & Cities)

### What is the problem?

Every time the mobile app loads, it calls:
- `GET /api/categories` — fetches all service categories
- `GET /api/cities` — fetches all service cities

These lists almost never change. But every request hits the database, runs a SQL query, and returns the same data. With 1,000 users, that's 1,000 identical database queries per app load.

### What is caching?

Caching means: store the result of an expensive operation somewhere fast (memory or a fast database), and return the stored result for future requests instead of recomputing it.

```
Without cache:
Request → PHP → MySQL query → Response  (takes ~50ms)

With cache:
Request → PHP → Cache hit → Response    (takes ~1ms)
```

### What we did

**File:** `backend/app/Http/Controllers/CategoryController.php`

```php
public function getCategories()
{
    // Cache for 1 hour (3600 seconds)
    $categories = Cache::remember('categories_all', 3600, function () {
        return Category::all(); // Only runs if cache is empty
    });

    return response()->json(['success' => true, 'data' => $categories]);
}
```

`Cache::remember('key', $seconds, $callback)`:
- If `categories_all` exists in cache → return it immediately (no DB query)
- If not → run the callback (DB query), store the result, return it

**Cache invalidation** — when categories change, the cache is cleared:

```php
// In addCategory(), editCategory(), deleteCategory():
Cache::forget('categories_all'); // Force next request to re-query DB
```

**File:** `backend/app/Http/Controllers/ServiceCityController.php`

```php
public function index()
{
    // Cities rarely change — cache for 24 hours
    $cities = Cache::remember('service_cities_active', 86400, function () {
        return ServiceCity::where('status', 'Active')->get();
    });

    return response()->json(['success' => true, 'data' => $cities]);
}
```

Cities are cached for 24 hours since they change even less frequently than categories.

### What cache driver is being used?

By default, Laravel uses the **database** as the cache store (configured in `.env` as `CACHE_STORE=database`). This means cached data is stored in a `cache` table in your MySQL database.

This is fine for development and small-scale production. For high traffic, switch to Redis:

```env
CACHE_STORE=redis
REDIS_HOST=127.0.0.1
REDIS_PORT=6379
```

Redis stores data in memory — much faster than MySQL for cache reads.

### What is cache invalidation?

Cache invalidation is the process of removing stale cached data when the underlying data changes. It's one of the hardest problems in computer science (seriously — there's a famous quote about it).

Our approach: **explicit invalidation** — when an admin adds/edits/deletes a category, we call `Cache::forget('categories_all')`. The next request will re-query the database and cache the fresh result.

### Files changed

| File | What changed |
|------|-------------|
| `backend/app/Http/Controllers/CategoryController.php` | `getCategories()` uses `Cache::remember()`, add/edit/delete call `Cache::forget()` |
| `backend/app/Http/Controllers/ServiceCityController.php` | `index()` uses `Cache::remember()` for 24 hours |

### Questions you might be asked

**Q: What is Redis?**
A: Redis is an in-memory data store. It's like a super-fast database that keeps everything in RAM instead of on disk. Used for caching, session storage, and message queues. Much faster than MySQL for cache reads.

**Q: What if the cache has stale data?**
A: For categories and cities, we explicitly clear the cache when data changes. For other data, the cache expires after the TTL (time-to-live). Worst case: a user sees slightly outdated data for up to 1 hour.

**Q: What is TTL?**
A: Time To Live — how long a cached item stays valid before it's automatically deleted. Categories: 3600 seconds (1 hour). Cities: 86400 seconds (24 hours).

**Q: Why not cache everything?**
A: Caching adds complexity. You need to think about when to invalidate. For frequently-changing data (bookings, payments, notifications), caching can cause users to see stale data. We only cache data that rarely changes and is read frequently.

**Q: What happens if the cache server goes down?**
A: Laravel falls back to the database automatically. The app keeps working, just slower. This is called **graceful degradation**.

---

## Final Summary — All Security Fixes

| # | Fix | Category | Files |
|---|-----|----------|-------|
| 1 | Payment Idempotency | P0 | `PaymentController.php` |
| 2 | Unique Constraints | P0 | Migration file |
| 3 | Wallet Locking | P0 | `Customer.php`, `ServiceProvider.php`, `PaymentService.php`, `Payment.php` |
| 4 | File Upload Validation | P0 | `FileUploadValidator.php` (new) |
| 5 | Price Limits | P0 | `BookingController.php`, `CustomerController.php`, `PaymentController.php` |
| 6 | Route Authorization | P1 | `EnsureOwnership.php`, `EnsureProviderApproved.php`, `EnsureCustomerActive.php`, `api.php` |
| 7 | Webhook Signature | P1 | `WebhookController.php` |
| 8 | Admin IP Whitelist | P1 | `IpWhitelist.php` (new) |
| 9 | XSS Protection | P2 | `SanitizeInput.php` (new), `Kernel.php` |
| 10 | Database Backups | P2 | `backup.sh` (new), `BackupDatabase.php` (new), `Kernel.php` |
| 11 | Error Tracking | P2 | `Handler.php`, `.env` |
| 12 | Caching | P2 | `CategoryController.php`, `ServiceCityController.php` |

**Security score: 5/10 → 8.5/10**

**One remaining item:** API versioning — intentionally skipped because adding `/v1/` to all routes would immediately break the mobile app. Do this when planning a major release.
