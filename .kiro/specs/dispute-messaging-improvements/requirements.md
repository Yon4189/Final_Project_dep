# Requirements Document: Dispute Messaging System Improvements

## 1. Overview

This document specifies requirements for improving the existing dispute handling system by changing the messaging model from a 3-way group chat to separate private conversations between each party and the admin, along with fixing API mismatches and adding missing features.

## 2. Background

### 2.1 Current System
The existing dispute system implements a 3-way group chat where:
- Customer, Provider, and Admin all see each other's messages
- Messages are stored in a single thread per dispute
- Admin can optionally mark messages as private (admin-only)
- Web app implements the group chat model
- Mobile app has incomplete implementation with API mismatches

### 2.2 Problems with Current System
1. **Privacy Issues**: Customer and Provider can see each other's messages, which can escalate conflicts
2. **Biased Investigation**: Parties can coordinate their stories after seeing each other's claims
3. **Conflict Escalation**: Direct visibility of accusations can lead to emotional arguments
4. **API Mismatches**: Mobile app expects different endpoints and field names than backend provides
5. **Missing Features**: Evidence management endpoint doesn't exist, mobile messaging UI not implemented
6. **Unprofessional Process**: Doesn't follow standard mediation/arbitration practices

### 2.3 Proposed Solution
Implement separate private message threads:
- Thread A: Customer ↔ Admin (private, provider cannot see)
- Thread B: Provider ↔ Admin (private, customer cannot see)
- Admin sees both threads and mediates between parties
- Maintains existing ChatController for normal customer-provider communication

## 3. Functional Requirements

### 3.1 Message Thread Separation

**REQ-3.1.1**: The system SHALL maintain two separate message threads for each dispute: one between customer and admin, and one between provider and admin.

**REQ-3.1.2**: Messages in the customer-admin thread SHALL NOT be visible to the provider.

**REQ-3.1.3**: Messages in the provider-admin thread SHALL NOT be visible to the customer.

**REQ-3.1.4**: Admin SHALL be able to view both threads simultaneously or switch between them.

**REQ-3.1.5**: Each message SHALL be tagged with a `recipient_type` field indicating which party should see it (customer, provider, or admin).

### 3.2 Message Creation and Retrieval

**REQ-3.2.1**: Customer SHALL be able to send messages to admin with text content and optional file attachments.

**REQ-3.2.2**: Provider SHALL be able to send messages to admin with text content and optional file attachments.

**REQ-3.2.3**: Admin SHALL be able to send messages to customer privately (provider cannot see).

**REQ-3.2.4**: Admin SHALL be able to send messages to provider privately (customer cannot see).

**REQ-3.2.5**: When customer views dispute messages, system SHALL return only messages where `recipient_type` is 'customer' or 'admin'.

**REQ-3.2.6**: When provider views dispute messages, system SHALL return only messages where `recipient_type` is 'provider' or 'admin'.

**REQ-3.2.7**: When admin views dispute messages, system SHALL return all messages from both threads.

### 3.3 File Attachments

**REQ-3.3.1**: Messages SHALL support multiple file attachments (images, PDFs, documents).

**REQ-3.3.2**: Each attachment SHALL have a maximum size of 5MB.

**REQ-3.3.3**: Supported file types SHALL include: jpg, jpeg, png, pdf, doc, docx, mp4, mov, avi, webm.

**REQ-3.3.4**: Video files SHALL have a maximum size of 50MB (larger than document limit due to evidence needs).

**REQ-3.3.5**: Attachments SHALL be stored with metadata: filename, path, type, size, duration (for videos).

**REQ-3.3.5**: Attachments SHALL be accessible only to parties who can see the message.

### 3.4 User Type Identification

**REQ-3.4.1**: System SHALL use Laravel Sanctum guard-based authentication to identify user types.

**REQ-3.4.2**: Customer authentication SHALL use `auth()->guard('customer')` guard.

**REQ-3.4.3**: Provider authentication SHALL use `auth()->guard('provider')` guard.

**REQ-3.4.4**: Admin authentication SHALL use `auth()->guard('admin')` guard.

**REQ-3.4.5**: API tokens SHALL be associated with specific guards to identify user type.

**REQ-3.4.6**: System SHALL determine sender_type based on which guard authenticated the request.

**REQ-3.4.7**: System SHALL determine recipient_type based on sender_type and dispute context.

### 3.5 Dispute Creation

**REQ-3.5.1**: Customer SHALL be able to raise a dispute against a provider for a specific booking.

**REQ-3.5.2**: Provider SHALL be able to raise a dispute against a customer for a specific booking.

**REQ-3.5.3**: Only one dispute SHALL be allowed per booking.

**REQ-3.5.4**: Dispute creation SHALL require: title, description, category.

**REQ-3.5.5**: Dispute categories SHALL include: payment, service_quality, no_show, behavior, cancellation, other.

**REQ-3.5.6**: Initial dispute description SHALL be automatically added as the first message in the appropriate thread.

**REQ-3.5.7**: When dispute is created, booking status SHALL change to 'disputed'.

### 3.6 Notifications

**REQ-3.6.1**: When customer raises dispute, system SHALL notify all admins and the provider.

**REQ-3.6.2**: When provider raises dispute, system SHALL notify all admins and the customer.

**REQ-3.6.3**: When admin sends message to customer, system SHALL notify the customer.

**REQ-3.6.4**: When admin sends message to provider, system SHALL notify the provider.

**REQ-3.6.5**: When customer sends message, system SHALL notify all admins.

**REQ-3.6.6**: When provider sends message, system SHALL notify all admins.

**REQ-3.6.7**: Notifications SHALL NOT reveal the content of messages from the other party's thread.

### 3.7 Admin Resolution

**REQ-3.7.1**: Admin SHALL be able to update dispute status to: under_review, resolved, rejected, escalated.

**REQ-3.7.2**: Admin SHALL be able to specify resolution type: refund, partial_refund, cancellation, warning, dismissed.

**REQ-3.7.3**: Admin SHALL be able to specify refund amount for refund/partial_refund resolutions.

**REQ-3.7.4**: Admin SHALL be able to add resolution notes visible to both parties.

**REQ-3.7.5**: When dispute is resolved, booking status SHALL change to 'dispute_resolved'.

**REQ-3.7.6**: System SHALL track which admin resolved the dispute and when.

**REQ-3.7.7**: Both customer and provider SHALL be notified when dispute status changes.

### 3.8 Admin Private Notes

**REQ-3.7.1**: Admin SHALL be able to add private internal notes that are not visible to customer or provider.

**REQ-3.7.2**: Private notes SHALL be stored separately from the message threads.

**REQ-3.7.3**: Private notes SHALL be visible to all admins.

**REQ-3.7.4**: Private notes SHALL support the `admin_notes` field in the disputes table.

### 3.8 Access Control

**REQ-3.8.1**: Customer SHALL only access disputes where they are the raised_by party or the against party.

**REQ-3.8.2**: Provider SHALL only access disputes where they are the raised_by party or the against party.

**REQ-3.8.3**: Admin SHALL access all disputes in the system.

**REQ-3.8.4**: Customer SHALL NOT see provider's messages to admin.

**REQ-3.8.5**: Provider SHALL NOT see customer's messages to admin.

**REQ-3.8.6**: Customer and Provider SHALL NOT see admin's private notes.

## 4. API Requirements

### 4.1 Backend API Standardization

**REQ-4.1.1**: Create dispute endpoint SHALL use consistent URL structure: `POST /customer/bookings/{bookingID}/dispute` and `POST /provider/bookings/{bookingID}/dispute`.

**REQ-4.1.2**: Create dispute request SHALL use consistent field names: `title`, `description`, `category`, `attachments`.

**REQ-4.1.3**: Get messages endpoint SHALL filter messages based on authenticated user's role and return only visible messages.

**REQ-4.1.4**: Send message endpoint SHALL automatically set `recipient_type` based on sender's role.

**REQ-4.1.5**: All dispute-related endpoints SHALL use `disputeID` consistently (not `id` or `dispute_id`).

**REQ-4.1.6**: All booking-related parameters SHALL use `bookingID` consistently (not `bookingId` or `booking_id`).

### 4.2 Mobile App API Alignment

**REQ-4.2.1**: Mobile app create dispute endpoint SHALL match backend: `POST /provider/bookings/{bookingID}/dispute`.

**REQ-4.2.2**: Mobile app SHALL use `title` instead of `reason` for dispute creation.

**REQ-4.2.3**: Mobile app SHALL use `category` field matching backend categories.

**REQ-4.2.4**: Mobile app SHALL use `attachments` instead of `evidence` for file uploads.

**REQ-4.2.5**: Mobile app evidence endpoint SHALL be removed or replaced with standard message attachments.

### 4.3 Response Format Standardization

**REQ-4.3.1**: All API responses SHALL follow format: `{ success: boolean, message: string, data: object }`.

**REQ-4.3.2**: Error responses SHALL include `errors` object with field-specific validation errors.

**REQ-4.3.3**: Dispute objects SHALL include: disputeID, bookingID, raised_by, against, title, description, category, status, priority, created_at, updated_at.

**REQ-4.3.4**: Message objects SHALL include: messageID, disputeID, sender_id, sender_type, recipient_type, message, attachments, created_at.

## 5. Data Model Requirements

### 5.1 Database Schema Changes

**REQ-5.1.1**: `dispute_messages` table SHALL add `recipient_type` column with values: 'customer', 'provider', 'admin'.

**REQ-5.1.2**: `recipient_type` SHALL be NOT NULL with no default value (must be explicitly set).

**REQ-5.1.3**: Existing `is_admin_only` field SHALL be deprecated but maintained for backward compatibility.

**REQ-5.1.4**: Migration SHALL convert existing messages: if `is_admin_only = true` then `recipient_type = 'admin'`, else determine based on sender.

**REQ-5.1.5**: Index SHALL be added on `recipient_type` for query performance.

### 5.2 Message Recipient Logic

**REQ-5.2.1**: When customer sends message, `recipient_type` SHALL be set to 'admin'.

**REQ-5.2.2**: When provider sends message, `recipient_type` SHALL be set to 'admin'.

**REQ-5.2.3**: When admin sends message to customer thread, `recipient_type` SHALL be set to 'customer'.

**REQ-5.2.4**: When admin sends message to provider thread, `recipient_type` SHALL be set to 'provider'.

**REQ-5.2.5**: When admin adds private note, `recipient_type` SHALL be set to 'admin'.

## 6. Non-Functional Requirements

### 6.1 Performance

**REQ-6.1.1**: Message retrieval SHALL complete within 500ms for disputes with up to 100 messages.

**REQ-6.1.2**: File upload SHALL support concurrent uploads of up to 5 files.

**REQ-6.1.3**: Dispute list SHALL be paginated with 20 items per page.

### 6.2 Security

**REQ-6.2.1**: All message access SHALL be authenticated and authorized.

**REQ-6.2.2**: File uploads SHALL be validated for type and size before storage.

**REQ-6.2.3**: File paths SHALL be sanitized to prevent directory traversal attacks.

**REQ-6.2.4**: Message content SHALL be sanitized to prevent XSS attacks.

**REQ-6.2.5**: Database queries SHALL use parameterized statements to prevent SQL injection.

**REQ-6.2.6**: Video files SHALL be scanned for malware before storage.

**REQ-6.2.7**: Video file extensions SHALL be validated against MIME type to prevent spoofing.

### 6.3 Reliability

**REQ-6.3.1**: Message sending SHALL use database transactions to ensure atomicity.

**REQ-6.3.2**: File uploads SHALL be atomic (all files succeed or all fail).

**REQ-6.3.3**: Failed file uploads SHALL not create orphaned database records.

**REQ-6.3.4**: System SHALL log all dispute status changes for audit trail.

### 6.4 Usability

**REQ-6.4.1**: Admin interface SHALL clearly distinguish between customer and provider threads.

**REQ-6.4.2**: Admin interface SHALL show unread message counts for each thread.

**REQ-6.4.3**: Mobile app SHALL provide intuitive dispute creation flow.

**REQ-6.4.4**: Error messages SHALL be clear and actionable.

## 7. Migration Requirements

### 7.1 Data Migration

**REQ-7.1.1**: Existing disputes SHALL remain accessible after migration.

**REQ-7.1.2**: Existing messages SHALL be migrated to new thread structure.

**REQ-7.1.3**: Migration SHALL determine `recipient_type` for existing messages based on sender and `is_admin_only` flag.

**REQ-7.1.4**: Migration logic: 
- If `is_admin_only = true`: `recipient_type = 'admin'`
- If `sender_type = 'customer'`: `recipient_type = 'admin'` (customer talking to admin)
- If `sender_type = 'provider'`: `recipient_type = 'admin'` (provider talking to admin)
- If `sender_type = 'admin'`: Determine based on dispute context (default to both parties for backward compatibility)

**REQ-7.1.5**: Migration SHALL be reversible in case of issues.

### 7.2 Backward Compatibility

**REQ-7.2.1**: Existing web app SHALL continue to function during migration period.

**REQ-7.2.2**: API changes SHALL be versioned if breaking changes are required.

**REQ-7.2.3**: `is_admin_only` field SHALL remain functional until all clients are updated.

## 8. Testing Requirements

### 8.1 Functional Testing

**REQ-8.1.1**: Test customer can send message and admin receives it.

**REQ-8.1.2**: Test provider can send message and admin receives it.

**REQ-8.1.3**: Test customer cannot see provider's messages.

**REQ-8.1.4**: Test provider cannot see customer's messages.

**REQ-8.1.5**: Test admin can see both threads.

**REQ-8.1.6**: Test admin can respond to customer privately.

**REQ-8.1.7**: Test admin can respond to provider privately.

**REQ-8.1.8**: Test file attachments upload and download correctly.

**REQ-8.1.9**: Test notifications are sent to correct parties.

**REQ-8.1.10**: Test dispute resolution updates booking status.

### 8.2 Security Testing

**REQ-8.2.1**: Test unauthorized users cannot access dispute messages.

**REQ-8.2.2**: Test customer cannot access provider's thread.

**REQ-8.2.3**: Test provider cannot access customer's thread.

**REQ-8.2.4**: Test file upload validation rejects invalid file types.

**REQ-8.2.5**: Test file upload validation rejects oversized files.

### 8.3 Integration Testing

**REQ-8.3.1**: Test mobile app can create disputes using new API.

**REQ-8.3.2**: Test web app displays separate threads correctly.

**REQ-8.3.3**: Test notifications are delivered to mobile and web clients.

**REQ-8.3.4**: Test ChatController remains independent and functional.

## 9. Documentation Requirements

**REQ-9.1**: API documentation SHALL be updated with new endpoints and field names.

**REQ-9.2**: Migration guide SHALL be provided for updating mobile app.

**REQ-9.3**: Admin user guide SHALL explain how to use dual-thread interface.

**REQ-9.4**: Developer documentation SHALL explain message visibility logic.

## 10. Success Criteria

**REQ-10.1**: Customer and provider cannot see each other's messages in any scenario.

**REQ-10.2**: Admin can effectively mediate disputes using separate threads.

**REQ-10.3**: Mobile app successfully creates disputes and sends messages.

**REQ-10.4**: All API endpoints use consistent naming conventions.

**REQ-10.5**: Zero data loss during migration from old to new system.

**REQ-10.6**: ChatController continues to function independently for normal communication.

**REQ-10.7**: System passes all security and privacy tests.
