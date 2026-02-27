# Chapa Payment Integration Guide

This document provides a comprehensive guide for the Chapa.it payment gateway integration in your home services marketplace platform.

## Overview

The integration includes:
- **Customer Payments**: Process payments from customers using Chapa's payment gateway
- **Provider Withdrawals**: Transfer earnings to provider bank accounts
- **Webhook Handling**: Real-time payment status updates
- **Multi-platform Support**: Web app and React Native mobile app

## Backend Implementation

### 1. Database Tables Created

#### `payments` table
- Stores customer payment transactions
- Links to customers and bookings
- Tracks payment status and Chapa transaction details

#### `withdrawals` table  
- Stores provider withdrawal requests
- Includes bank details and processing status
- Tracks platform fees and net amounts

#### `payment_methods` table
- Configures available payment methods
- Stores fees and limits per method

### 2. API Endpoints

#### Payment Endpoints
```
POST /api/payment/initialize     # Initialize payment
GET  /api/payment/verify/{tx_ref} # Verify payment
GET  /api/payment/{tx_ref}       # Get payment details
POST /api/payment/cancel/{tx_ref} # Cancel payment
GET  /api/payment/history/customer/{customer_id} # Customer history
```

#### Withdrawal Endpoints
```
POST /api/withdrawal/create      # Create withdrawal request
POST /api/withdrawal/process/{id} # Process withdrawal
GET  /api/withdrawal/status/{ref} # Check withdrawal status
GET  /api/withdrawal/history/provider/{id} # Provider history
GET  /api/withdrawals            # All withdrawals (admin)
POST /api/withdrawal/cancel/{id} # Cancel withdrawal (admin)
```

#### Webhook Endpoint
```
POST /api/webhook/chapa          # Chapa webhook handler
```

### 3. Environment Configuration

Add these to your `.env` file:
```env
# Chapa Payment Gateway Configuration
CHAPA_SECRET_KEY=your_chapa_secret_key_here
CHAPA_PUBLIC_KEY=your_chapa_public_key_here  
CHAPA_WEBHOOK_SECRET=your_chapa_webhook_secret_here
CHAPA_ENVIRONMENT=test
```

### 4. Key Features

#### Payment Processing
- Initialize payment with customer details
- Redirect to Chapa checkout page
- Handle payment verification
- Update booking status on successful payment
- Webhook processing for real-time updates

#### Withdrawal System
- Providers can request withdrawals to bank accounts
- 5% platform fee automatically calculated
- Support for all major Ethiopian banks
- Admin approval and processing workflow
- Transfer status tracking via Chapa API

#### Security Features
- Webhook signature verification
- Transaction reference validation
- Secure payment data handling
- Error logging and monitoring

## Frontend Implementation

### Web App (React)

#### Components Created
- `PaymentForm.jsx` - Customer payment interface
- `WithdrawalForm.jsx` - Provider withdrawal interface  
- `Payment.jsx` - Payment details page
- `payment.js` - API service functions

#### Features
- Multiple payment method selection (Telebirr, CBE Birr, etc.)
- Real-time payment status updates
- Withdrawal fee calculation
- Payment history display
- Responsive design with Tailwind CSS

### Mobile App (React Native)

#### Updated Services
- `payment.service.ts` - Updated to use new backend endpoints
- Support for WebView payment processing
- Deep link handling for payment callbacks
- Withdrawal request functionality

#### Features
- Mobile-optimized payment flow
- Biometric authentication support
- Push notification integration
- Offline payment status caching

## Payment Flow

### Customer Payment Process
1. Customer selects service and proceeds to payment
2. System initializes payment with Chapa API
3. Customer is redirected to Chapa checkout page
4. Customer completes payment using preferred method
5. Chapa sends webhook confirmation
6. System updates payment status and booking
7. Customer receives payment confirmation

### Provider Withdrawal Process
1. Provider requests withdrawal from earnings
2. System calculates platform fee (5%)
3. Admin reviews and approves withdrawal
4. System initiates bank transfer via Chapa
5. Chapa processes transfer to provider's bank
6. System updates withdrawal status
7. Provider receives notification

## Testing Instructions

### 1. Setup Test Environment
1. Create Chapa test account at [dashboard.chapa.co](https://dashboard.chapa.co)
2. Get test API keys from settings
3. Configure webhook URL: `https://your-domain.com/api/webhook/chapa`
4. Set environment to test mode

### 2. Test Payment Flow
```bash
# Test payment initialization
curl -X POST http://localhost:8000/api/payment/initialize \
  -H "Content-Type: application/json" \
  -d '{
    "amount": 100,
    "customer_id": 1,
    "customer_email": "test@example.com",
    "customer_first_name": "Test",
    "customer_last_name": "User",
    "customer_phone": "0912345678"
  }'
```

### 3. Test Withdrawal Flow
```bash
# Test withdrawal creation
curl -X POST http://localhost:8000/api/withdrawal/create \
  -H "Content-Type: application/json" \
  -d '{
    "provider_id": 1,
    "amount": 500,
    "bank_name": "Commercial Bank of Ethiopia",
    "account_number": "1234567890",
    "account_holder_name": "Test Provider"
  }'
```

### 4. Test Webhook
```bash
# Simulate Chapa webhook
curl -X POST http://localhost:8000/api/webhook/chapa \
  -H "Content-Type: application/json" \
  -H "X-Chapa-Signature: test_signature" \
  -d '{
    "event": "payment.success",
    "data": {
      "tx_ref": "test_tx_ref",
      "status": "success",
      "amount": 100
    }
  }'
```

## Production Deployment

### 1. Security Checklist
- [ ] Use production Chapa API keys
- [ ] Configure HTTPS for webhook URL
- [ ] Set up webhook signature verification
- [ ] Enable payment logging and monitoring
- [ ] Test all payment methods in production

### 2. Performance Optimization
- [ ] Implement payment caching
- [ ] Set up database indexes
- [ ] Configure CDN for payment assets
- [ ] Monitor API response times

### 3. Monitoring & Alerts
- [ ] Set up payment failure alerts
- [ ] Monitor webhook processing
- [ ] Track withdrawal processing times
- [ ] Set up revenue dashboards

## Troubleshooting

### Common Issues

#### Payment Initialization Fails
- Check API key configuration
- Verify customer data format
- Ensure webhook URL is accessible
- Check Chapa service status

#### Webhook Not Received
- Verify webhook URL is publicly accessible
- Check webhook signature configuration
- Review Chapa webhook settings
- Check server logs for errors

#### Withdrawal Processing Delays
- Verify bank account details
- Check Chapa transfer status
- Review admin approval workflow
- Monitor bank processing times

### Error Codes
- `400`: Invalid payment data
- `401`: Invalid API credentials
- `404`: Payment/withdrawal not found
- `500`: Server processing error

## Support

### Chapa Support
- Documentation: [developer.chapa.co](https://developer.chapa.co)
- Email: info@chapa.co
- Dashboard: [dashboard.chapa.co](https://dashboard.chapa.co)

### Platform Support
- Check application logs for detailed error messages
- Monitor webhook processing status
- Review payment and withdrawal histories

## Future Enhancements

### Planned Features
- [ ] Multi-currency support
- [ ] Subscription payments
- [ ] Refund processing
- [ ] Payment analytics dashboard
- [ ] Advanced fraud detection
- [ ] Split payments for multiple providers

### API Extensions
- [ ] Payment method management API
- [ ] Advanced reporting endpoints
- [ ] Bulk withdrawal processing
- [ ] Payment dispute resolution

---

**Note**: This integration supports Ethiopian payment methods including Telebirr, CBE Birr, and other local bank transfers through the Chapa payment gateway.
