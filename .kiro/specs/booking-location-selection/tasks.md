# Implementation Plan: Booking Location Selection

## Overview

Implement backend logic to support 4 location selection methods (GPS coordinates, saved addresses, manual address entry with Google Places validation, and pin-on-map) in the Laravel/PHP booking creation flow. This includes validation, processing, storage, and integration with the existing BookingController.

## Tasks

- [x] 1. Set up Google Places API integration
  - Create GooglePlacesService class in app/Services
  - Add Google Places API key to .env configuration
  - Implement validateAddress() method for address validation
  - Implement getCoordinates() method to fetch lat/lng from validated addresses
  - _Requirements: 3.2, 3.3, 3.5_

- [ ]* 1.1 Write unit tests for GooglePlacesService
  - Test successful address validation
  - Test rejection of invalid addresses (e.g., "ddfhsdoffoe")
  - Test API error handling
  - _Requirements: 3.2, 3.5_

- [x] 2. Create location validation service
  - [x] 2.1 Create LocationValidator service class
    - Implement validateLocationInput() method with location_type routing
    - Implement coordinate bounds validation (-90 to 90 lat, -180 to 180 lng)
    - Add validation rules for each location type
    - _Requirements: 1.1, 2.1, 3.1, 4.1, 4.2_

  - [ ]* 2.2 Write property test for coordinate bounds validation
    - **Property 2: GPS Coordinate Bounds**
    - **Validates: Requirements 1.1, 4.2**

  - [x] 2.3 Implement processCurrentLocation() method
    - Accept latitude, longitude, and optional place_id
    - Return LocationData with GPS coordinates
    - Set full_address to "GPS Location" if no place_id
    - Store coordinates with 8 decimal precision
    - _Requirements: 1.1, 1.2, 1.4_

  - [x] 2.4 Implement processSavedAddress() method
    - Query customer_addresses table with addressID and customerID
    - Verify address ownership
    - Throw exception if address not found or unauthorized
    - Return LocationData from saved address
    - _Requirements: 2.1, 2.2, 2.5_

  - [ ]* 2.5 Write property test for saved address ownership
    - **Property 3: Saved Address Ownership**
    - **Validates: Requirements 2.1, 2.2**

  - [x] 2.6 Implement processManualAddress() method
    - Validate address length (5-500 characters)
    - Call GooglePlacesService to validate address
    - Reject invalid addresses with ValidationException
    - Extract coordinates from Google Places API response
    - Return LocationData with validated address and coordinates
    - _Requirements: 3.1, 3.2, 3.3, 3.5_

  - [ ]* 2.7 Write property test for manual address validation
    - **Property 6: Manual Address Validation**
    - **Validates: Requirements 3.2, 3.5**

  - [ ]* 2.8 Write property test for manual address length validation
    - **Property 7: Manual Address Length Validation**
    - **Validates: Requirements 3.1**

  - [x] 2.9 Implement processPinOnMapLocation() method
    - Accept latitude, longitude, formatted_address, and optional place_id
    - Validate coordinates are within bounds
    - Store coordinates with 8 decimal precision
    - Return LocationData with formatted address from Google Maps
    - _Requirements: 4.1, 4.2, 4.3, 4.5_

  - [ ]* 2.10 Write property test for pin-on-map coordinate precision
    - **Property 8: Pin-On-Map Coordinate Precision**
    - **Validates: Requirements 4.3, 4.5**

- [x] 3. Checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [x] 4. Update BookingController to integrate location validation
  - [x] 4.1 Modify store() method validation rules
    - Add location_type field validation (required, in: current, saved, manual, pin_on_map)
    - Add conditional validation for each location type
    - Update service_latitude and service_longitude validation
    - Add address_text field for storing location address
    - _Requirements: 1.1, 2.1, 3.1, 4.1, 5.1_

  - [x] 4.2 Integrate LocationValidator into booking creation flow
    - Inject LocationValidator service
    - Call validateLocationInput() before creating booking
    - Handle validation exceptions and return appropriate error responses
    - Map LocationData to booking fields (service_latitude, service_longitude, address_text)
    - _Requirements: 5.1, 5.2, 5.3_

  - [ ]* 4.3 Write property test for booking location consistency
    - **Property 5: Booking Location Consistency**
    - **Validates: Requirements 5.1, 5.2, 5.3**

  - [x] 4.4 Add transaction handling for booking creation
    - Ensure database transaction wraps location validation and booking creation
    - Rollback on any validation or creation failure
    - _Requirements: 5.4, 5.5_

  - [ ]* 4.5 Write property test for transaction atomicity
    - **Property 9: Transaction Atomicity**
    - **Validates: Requirements 5.4, 5.5**

- [x] 5. Add support for saving pin-on-map locations to customer_addresses
  - [x] 5.1 Add optional save_address flag to booking request
    - Add save_address boolean field validation
    - Add address_label field validation (optional, max 50 chars)
    - _Requirements: 4.6_

  - [x] 5.2 Implement saveLocationToAddresses() method
    - Check if save_address flag is true
    - Create new CustomerAddress record with location data
    - Handle duplicate address detection
    - _Requirements: 4.6_

  - [ ]* 5.3 Write property test for pin-on-map save to addresses
    - **Property 11: Pin-On-Map Save to Addresses**
    - **Validates: Requirements 4.6**

- [x] 6. Update API documentation and response formats
  - [x] 6.1 Update booking creation response
    - Include location_type in response
    - Include address_text in response
    - Maintain backward compatibility with service_address field
    - _Requirements: 5.1, 5.2, 5.3_

  - [x] 6.2 Update booking retrieval endpoints
    - Include address_text in show() method response
    - Include address_text in customerBookings() response
    - Include address_text in providerBookings() response
    - _Requirements: 5.1, 5.2, 5.3_

- [x] 7. Final checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

## Notes

- Tasks marked with `*` are optional and can be skipped for faster MVP
- Each task references specific requirements for traceability
- Checkpoints ensure incremental validation
- Property tests validate universal correctness properties from the design document
- Manual address validation through Google Places API prevents invalid addresses like "ddfhsdoffoe"
- All location types are integrated into the existing BookingController
- Database transactions ensure atomicity of booking creation with location data
