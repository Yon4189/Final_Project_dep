# Security Quick Checklist

## 🔴 CRITICAL - DO TODAY (2-3 hours)

### ✅ Task 1: Enforce Webhook Signature (15 min)
**File**: `backend/app/Http/Controllers/WebhookController.php`
**Line**: ~40-56
**Action**: Make signature verification mandatory in production
- [ ] Update `handleChapaWebhook()` method
- [ ] Ensure signature is required when `APP_ENV=production`
- [ ] Test with curl (should reject unsigned webhooks)

### ✅ Task 2: Add Payment Callback Signature (20 min)
**File**: `backend/app/Http/Controllers/PaymentController.php`
**Line**: ~127
**Action**: Add signature verification to `callback()` method
- [ ] Add signature header check
- [ ] Call `$this->chapaService->verifySignature()`
- [ ] Return 401 if signature invalid
- [ ] Test with curl

### ✅ Task 3: Rate Limit Auth Routes (10 min)
**File**: `backend/routes/api.php`
**Line**: ~40
**Action**: Wrap auth routes with throttle middleware
- [ ] Login: `throttle:5,1` (5 per minute)
- [ ] Register: `throttle:3,60` (3 per hour)
- [ ] Test by attempting 6 logins quickly

### ✅ Task 4: Rate Limit Public Search (10 min)
**File**: `backend/routes/api.php`
**Line**: ~60
**Action**: Wrap public search routes with `throttle:20,1`
- [ ] Apply to all `/customer/providers/*` routes
- [ ] Test by making 21 requests quickly

### ✅ Task 5: Verify Authorization in BookingController (30 min)
**File**: `backend/app/Http/Controllers/BookingController.php`
**Action**: Check `show()` method verifies ownership
- [ ] Ensure customer can only see their bookings
- [ ] Ensure provider can only see their bookings
- [ ] Test by trying to access another user's booking

### ✅ Task 6: Set Webhook Secret in Production (5 min)
**File**: `backend/.env` (production server)
**Action**: Add Chapa webhook secret
```env
CHAPA_WEBHOOK_SECRET=your_actual_secret_from_chapa_dashboard
APP_ENV=production
```
- [ ] Get secret from Chapa dashboard
- [ ] Add to production .env
- [ ] Run `php artisan config:clear`

---

## 🟡 HIGH PRIORITY - THIS WEEK (3-4 hours)

### ✅ Task 7: IP Whitelist for Admin (45 min)
**Files**: 
- Create: `backend/app/Http/Middleware/IpWhitelist.php`
- Edit: `backend/app/Http/Kernel.php`
- Edit: `backend/config/app.php`
- Edit: `backend/routes/api.php`

**Steps**:
- [ ] Create IpWhitelist middleware
- [ ] Register in Kernel.php
- [ ] Add config in app.php
- [ ] Apply to admin routes
- [ ] Add your IP to .env: `ADMIN_ALLOWED_IPS=123.456.789.0`
- [ ] Test admin access from different IP (should block)

### ✅ Task 8: Log Sensitive Operations (30 min)
**Files**:
- Create: `backend/app/Http/Middleware/LogSensitiveRequests.php`
- Edit: `backend/app/Http/Kernel.php`
- Edit: `backend/routes/api.php`

**Steps**:
- [ ] Create LogSensitiveRequests middleware
- [ ] Register in Kernel.php
- [ ] Apply to withdrawal/verification routes
- [ ] Test and check logs

### ✅ Task 9: Review All Controller Authorization (2 hours)
**Files**: All controllers in `backend/app/Http/Controllers/`

**Check each method**:
- [ ] CustomerController - verify ownership checks
- [ ] BookingController - verify ownership checks
- [ ] PaymentController - verify ownership checks
- [ ] WalletController - verify ownership checks
- [ ] ReviewController - verify ownership checks
- [ ] DisputeController - verify ownership checks

---

## 🟢 MEDIUM PRIORITY - THIS MONTH

### ✅ Task 10: Add API Key Authentication (4 hours)
- [ ] Create API keys table
- [ ] Generate keys for mobile apps
- [ ] Add middleware to verify API keys
- [ ] Rotate keys regularly

### ✅ Task 11: Implement 2FA for Admin (3 hours)
- [ ] Install 2FA package
- [ ] Add 2FA setup page
- [ ] Require 2FA for admin login
- [ ] Add backup codes

### ✅ Task 12: Set Up Security Monitoring (2 hours)
- [ ] Install monitoring tool (e.g., Sentry)
- [ ] Set up alerts for failed signatures
- [ ] Set up alerts for rate limit hits
- [ ] Set up alerts for unauthorized access attempts

---

## 🧪 TESTING CHECKLIST

After each fix, test:

### Test Webhook Security
```bash
# Should FAIL (no signature):
curl -X POST "http://yourapi.com/api/webhook/chapa" \
  -H "Content-Type: application/json" \
  -d '{"tx_ref": "TEST-123", "status": "success"}'

# Expected: 401 Unauthorized
```

### Test Rate Limiting
```bash
# Try 6 login attempts (should block after 5):
for i in {1..6}; do
  curl -X POST "http://yourapi.com/api/customer/login" \
    -d "email=test@test.com&password=wrong"
  echo "Attempt $i"
done

# Expected: 429 Too Many Requests on 6th attempt
```

### Test Authorization
```bash
# Login as Customer A, try to access Customer B's data:
curl "http://yourapi.com/api/customer/bookings/999" \
  -H "Authorization: Bearer $CUSTOMER_A_TOKEN"

# Expected: 404 Not Found or 403 Forbidden
```

### Test IP Whitelist
```bash
# Try admin login from unauthorized IP:
curl -X POST "http://yourapi.com/api/admin/login" \
  -d "email=admin@test.com&password=password"

# Expected: 403 Access Denied (if IP not whitelisted)
```

---

## 📊 PROGRESS TRACKER

| Task | Priority | Time | Status | Tested |
|------|----------|------|--------|--------|
| 1. Webhook Signature | 🔴 Critical | 15m | ⬜ | ⬜ |
| 2. Callback Signature | 🔴 Critical | 20m | ⬜ | ⬜ |
| 3. Auth Rate Limit | 🔴 Critical | 10m | ⬜ | ⬜ |
| 4. Search Rate Limit | 🔴 Critical | 10m | ⬜ | ⬜ |
| 5. Booking Authorization | 🔴 Critical | 30m | ⬜ | ⬜ |
| 6. Set Webhook Secret | 🔴 Critical | 5m | ⬜ | ⬜ |
| 7. IP Whitelist | 🟡 High | 45m | ⬜ | ⬜ |
| 8. Request Logging | 🟡 High | 30m | ⬜ | ⬜ |
| 9. Review Authorization | 🟡 High | 2h | ⬜ | ⬜ |

**Total Critical Time**: ~1.5 hours
**Total High Priority Time**: ~3.5 hours
**Total Time to Secure**: ~5 hours

---

## 🚨 BEFORE DEPLOYING TO PRODUCTION

- [ ] All critical tasks completed
- [ ] All tests passing
- [ ] Tested in staging environment
- [ ] CHAPA_WEBHOOK_SECRET set in production .env
- [ ] APP_ENV=production in production .env
- [ ] Cleared all caches: `php artisan config:clear`
- [ ] Monitoring/logging enabled
- [ ] Backup database before deployment
- [ ] Have rollback plan ready

---

## 🆘 EMERGENCY CONTACTS

If something breaks after deployment:

1. **Check logs**: `tail -f storage/logs/laravel.log`
2. **Rollback**: Revert to previous version
3. **Disable rate limiting temporarily**: Comment out throttle middleware
4. **Disable IP whitelist temporarily**: Remove from admin routes
5. **Check .env**: Ensure all secrets are set correctly

---

## 📈 SECURITY SCORE IMPROVEMENT

**Before**: 5/10
- ✅ Authentication: 9/10
- ⚠️ Authorization: 5/10
- ❌ Rate Limiting: 2/10
- ❌ Payment Security: 3/10

**After Critical Fixes**: 7.5/10
- ✅ Authentication: 9/10
- ✅ Authorization: 8/10
- ✅ Rate Limiting: 8/10
- ✅ Payment Security: 8/10

**After All Fixes**: 8.5/10
- ✅ Authentication: 9/10
- ✅ Authorization: 9/10
- ✅ Rate Limiting: 9/10
- ✅ Payment Security: 9/10
- ✅ Monitoring: 7/10

---

## 💡 QUICK WINS (Do First)

If you only have 30 minutes right now, do these:

1. **Set webhook secret in .env** (5 min)
2. **Add rate limiting to login** (10 min)
3. **Enforce webhook signature** (15 min)

These 3 fixes alone will prevent the most critical attacks!

---

## 📚 REFERENCE DOCUMENTS

- **Full Implementation Guide**: `SECURITY_FIXES_IMPLEMENTATION.md`
- **Security Analysis**: `ROUTE_SECURITY_ANALYSIS.md`
- **Issues Explained**: `CRITICAL_ISSUES_EXPLAINED_SIMPLY.md`
- **Overall Assessment**: `BRUTAL_HONEST_ASSESSMENT.md`

---

**Last Updated**: April 3, 2026
**Next Review**: After implementing all critical fixes
