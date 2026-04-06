# Implementation Tasks: Dispute Messaging System Improvements

## Overview
This document outlines the implementation tasks for transforming the dispute messaging system from a 3-way group chat to separate private conversation threads.

## Task Breakdown

### Phase 1: Database Schema Changes

- [x] 1. Create database migration for recipient_type column
  - [x] 1.1 Create migration file: `add_recipient_type_to_dispute_messages`
  - [x] 1.2 Add recipient_type column as nullable VARCHAR(20)
  - [x] 1.3 Write data migration logic to populate recipient_type for existing messages
  - [x] 1.4 Duplicate admin public messages for provider thread
  - [x] 1.5 Make recipient_type column NOT NULL
  - [x] 1.6 Add indexes: `recipient_type` and `(disputeID, recipient_type)`
  - [x] 1.7 Test migration on local database
  - [x] 1.8 Test rollback functionality

### Phase 2: Backend Model Updates

- [x] 2. Update DisputeMessage model
  - [x] 2.1 Add `recipient_type` to fillable array
  - [x] 2.2 Add `forRecipient()` query scope
  - [x] 2.3 Add `customerThread()` query scope
  - [x] 2.4 Add `providerThread()` query scope
  - [x] 2.5 Update model documentation

### Phase 3: Backend Controller Updates - DisputeController

- [x] 3. Update DisputeController for message filtering
  - [x] 3.1 Update `show()` method to filter messages by recipient_type
  - [x] 3.2 Add `isUserInvolved()` helper method for access control
  - [x] 3.3 Update `addMessage()` method to set recipient_type = 'admin' for customer/provider
  - [x] 3.4 Add `processAttachments()` helper method with video support
  - [x] 3.5 Add `validateAttachment()` method for file validation
  - [x] 3.6 Update file upload validation rules to include video types (mp4, mov, avi, webm)
  - [x] 3.7 Implement file size validation (5MB for documents, 50MB for videos)
  - [x] 3.8 Add MIME type validation
  - [x] 3.9 Update notification logic to not reveal other party's messages
  - [x] 3.10 Add input sanitization for message content

### Phase 4: Backend Controller Updates - AdminDisputeController

- [x] 4. Update AdminDisputeController for dual-thread support
  - [x] 4.1 Update `addMessage()` method to require recipient_type parameter
  - [x] 4.2 Add validation for recipient_type (customer, provider, admin)
  - [x] 4.3 Update notification logic based on recipient_type
  - [x] 4.4 Keep `show()` method unchanged (admin sees all messages)
  - [x] 4.5 Update `addPrivateNote()` to set recipient_type = 'admin'

### Phase 5: API Endpoint Standardization

- [x] 5. Standardize API endpoints and field names
  - [x] 5.1 Verify customer endpoint: `POST /customer/bookings/{bookingID}/dispute`
  - [x] 5.2 Verify provider endpoint: `POST /provider/bookings/{bookingID}/dispute`
  - [x] 5.3 Ensure consistent use of `bookingID` (not `bookingId` or `booking_id`)
  - [x] 5.4 Ensure consistent use of `disputeID` (not `id` or `dispute_id`)
  - [x] 5.5 Update API response format consistency
  - [x] 5.6 Update validation rules to use `title`, `description`, `category`, `attachments`

### Phase 6: Security Enhancements

- [x] 6. Implement security measures
  - [x] 6.1 Add rate limiting to message endpoints (10 messages per minute)
  - [x] 6.2 Implement file extension vs MIME type validation
  - [x] 6.3 Add malware scanning for uploaded files (if antivirus available)
  - [x] 6.4 Implement input sanitization (strip_tags, htmlspecialchars)
  - [x] 6.5 Add authorization checks in all dispute endpoints
  - [x] 6.6 Ensure database queries use parameterized statements
  - [x] 6.7 Add CSRF protection verification

### Phase 7: Frontend Updates - Web App (Admin)

- [ ] 7. Update admin web interface for dual-thread view
  - [ ] 7.1 Update Disputes.jsx to group messages by recipient_type
  - [ ] 7.2 Create two-column layout for customer and provider threads
  - [ ] 7.3 Add "Send to Customer" button
  - [ ] 7.4 Add "Send to Provider" button
  - [ ] 7.5 Update `handleSendMessage()` to include recipient_type parameter
  - [ ] 7.6 Update API call in `disputeAPI.addDisputeMessage()` to include recipient_type
  - [ ] 7.7 Add visual indicators for thread separation
  - [ ] 7.8 Update message display to show which thread each message belongs to
  - [ ] 7.9 Add unread message count per thread
  - [ ] 7.10 Test admin interface with sample disputes

### Phase 8: Frontend Updates - Mobile App

- [ ] 8. Update mobile app API service and hooks
  - [ ] 8.1 Update `provider.service.ts` createDispute endpoint URL
  - [ ] 8.2 Change field name from `reason` to `title`
  - [ ] 8.3 Change field name from `evidence` to `attachments`
  - [ ] 8.4 Add `category` field to createDispute
  - [ ] 8.5 Remove `addDisputeEvidence()` method
  - [ ] 8.6 Update `sendMessage()` method to use attachments
  - [ ] 8.7 Update TypeScript types for Dispute and DisputeMessage
  - [ ] 8.8 Update `useProviderDisputes` hook
  - [ ] 8.9 Update `useCreateDispute` hook
  - [ ] 8.10 Test mobile app dispute creation flow

### Phase 9: Testing

- [ ] 9. Write and execute tests
  - [ ] 9.1 Write unit tests for message filtering logic
  - [ ] 9.2 Write unit tests for recipient_type determination
  - [ ] 9.3 Write unit tests for access control
  - [ ] 9.4 Write unit tests for file upload validation
  - [ ] 9.5 Write integration test: customer raises dispute
  - [ ] 9.6 Write integration test: customer sends message to admin
  - [ ] 9.7 Write integration test: admin responds to customer
  - [ ] 9.8 Write integration test: provider sends message to admin
  - [ ] 9.9 Write integration test: admin responds to provider
  - [ ] 9.10 Write integration test: verify customer cannot see provider messages
  - [ ] 9.11 Write integration test: verify provider cannot see customer messages
  - [ ] 9.12 Write integration test: admin sees both threads
  - [ ] 9.13 Write security test: unauthorized access attempts
  - [ ] 9.14 Write security test: file upload with invalid types
  - [ ] 9.15 Write security test: oversized file uploads
  - [ ] 9.16 Execute all tests and fix failures

### Phase 10: Documentation

- [ ] 10. Update documentation
  - [ ] 10.1 Update API documentation with new endpoints
  - [ ] 10.2 Document recipient_type field usage
  - [ ] 10.3 Create admin user guide for dual-thread interface
  - [ ] 10.4 Create mobile app migration guide
  - [ ] 10.5 Document file upload limits and supported types
  - [ ] 10.6 Update Postman collection with new endpoints
  - [ ] 10.7 Create deployment checklist

### Phase 11: Deployment Preparation

- [ ] 11. Prepare for deployment
  - [ ] 11.1 Backup production database
  - [ ] 11.2 Test migration on staging environment
  - [ ] 11.3 Verify rollback procedure on staging
  - [ ] 11.4 Create deployment runbook
  - [ ] 11.5 Set up monitoring alerts
  - [ ] 11.6 Prepare rollback plan
  - [ ] 11.7 Schedule deployment window
  - [ ] 11.8 Notify stakeholders of deployment

### Phase 12: Deployment

- [ ] 12. Execute deployment
  - [ ] 12.1 Put application in maintenance mode
  - [ ] 12.2 Run database migration
  - [ ] 12.3 Deploy backend code changes
  - [ ] 12.4 Deploy web app changes
  - [ ] 12.5 Deploy mobile app changes (submit to stores)
  - [ ] 12.6 Verify migration completed successfully
  - [ ] 12.7 Run smoke tests on production
  - [ ] 12.8 Take application out of maintenance mode
  - [ ] 12.9 Monitor logs for errors
  - [ ] 12.10 Verify notifications are working

### Phase 13: Post-Deployment

- [ ] 13. Post-deployment activities
  - [ ] 13.1 Monitor application logs for 24 hours
  - [ ] 13.2 Check database query performance
  - [ ] 13.3 Verify file uploads are working
  - [ ] 13.4 Test dispute creation from mobile app
  - [ ] 13.5 Test admin interface with real disputes
  - [ ] 13.6 Collect user feedback
  - [ ] 13.7 Address any issues found
  - [ ] 13.8 Update documentation based on feedback
  - [ ] 13.9 Create post-deployment report
  - [ ] 13.10 Archive old dispute data if needed

## Task Dependencies

```
Phase 1 (Database) → Phase 2 (Models) → Phase 3 (DisputeController)
                                      → Phase 4 (AdminDisputeController)
                                      → Phase 5 (API Standardization)
                                      → Phase 6 (Security)

Phase 3,4,5,6 → Phase 7 (Web App)
             → Phase 8 (Mobile App)

Phase 7,8 → Phase 9 (Testing)

Phase 9 → Phase 10 (Documentation)
       → Phase 11 (Deployment Prep)

Phase 11 → Phase 12 (Deployment)

Phase 12 → Phase 13 (Post-Deployment)
```

## Estimated Timeline

- **Phase 1-2:** 1-2 days (Database and Models)
- **Phase 3-6:** 3-4 days (Backend Controllers and Security)
- **Phase 7-8:** 2-3 days (Frontend Updates)
- **Phase 9:** 2-3 days (Testing)
- **Phase 10-11:** 1-2 days (Documentation and Prep)
- **Phase 12-13:** 1 day (Deployment and Monitoring)

**Total Estimated Time:** 10-15 days

## Priority Tasks (Must Complete First)

1. Phase 1: Database migration
2. Phase 2: Model updates
3. Phase 3: DisputeController updates
4. Phase 4: AdminDisputeController updates
5. Phase 9: Core integration tests

## Optional Enhancements (Future Work)

- [ ]* Real-time messaging with WebSockets
- [ ]* Read receipts for messages
- [ ]* Message editing/deletion with audit trail
- [ ]* Automated dispute resolution for common cases
- [ ]* Dispute analytics dashboard
- [ ]* SLA tracking for admin response times
- [ ]* Voice message attachments
- [ ]* Multi-language support

## Notes

- All tasks marked with `*` are optional and can be implemented in future iterations
- Ensure backward compatibility during migration
- Test thoroughly on staging before production deployment
- Keep ChatController independent - do not modify it
- Monitor performance after deployment, especially database queries
- Consider implementing feature flags for gradual rollout
