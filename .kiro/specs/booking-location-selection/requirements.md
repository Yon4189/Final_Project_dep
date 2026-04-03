# Requirements Document: Booking Location Selection

## Introduction

This feature enables customers to select service locations for bookings through four methods: current GPS location, saved addresses, manual text entry with validation, and pin-on-map with Google Maps integration. The backend must validate, process, and store location data from these sources while ensuring data integrity and security.

## Glossary

- **Location_System**: The backend subsystem responsible for processing and validating location data
- **Booking_System**: The backend subsystem responsible for creating and managing bookings
- **GPS_Coordinates**: Latitude and longitude values representing a geographic position
- **Saved_Address**: A customer address stored in the customer_addresses table
- **Manual_Address**: A text address entered by the customer with optional coordinates
- **Pin_On_Map_Address**: A location selected by pinning on Google Maps with precise coordinates and formatted address
- **Location_Type**: An enumeration with values: "current", "saved", "manual", "pin_on_map"
- **Address_Validation**: The process of verifying that a manual address is legitimate using Google Places API
- **Place_ID**: A unique identifier for a location in Google Places API

## Requirements

### Requirement 1: Process Current GPS Location

**User Story:** As a customer, I want to use my current GPS location for a booking, so that I can quickly request service at my present location.

#### Acceptance Criteria

1. WHEN a customer selects location_type "current" and provides latitude and longitude, THE Location_System SHALL validate the coordinates are within valid ranges (latitude: -90 to 90, longitude: -180 to 180)
2. WHEN GPS coordinates are valid, THE Location_System SHALL store them with 8 decimal precision
3. WHEN a place_id is provided with GPS coordinates, THE Location_System SHALL store it with the booking
4. WHEN GPS location is processed, THE Location_System SHALL set the address_text field to the formatted address from Google Places API if place_id is provided, otherwise to "GPS Location"
5. WHEN GPS coordinates are invalid, THE Location_System SHALL return a validation error and reject the booking creation

### Requirement 2: Process Saved Address Selection

**User Story:** As a customer, I want to select from my saved addresses for a booking, so that I can quickly reuse frequently visited locations.

#### Acceptance Criteria

1. WHEN a customer selects location_type "saved" and provides an address_id, THE Location_System SHALL verify the address exists in the customer_addresses table
2. WHEN verifying a saved address, THE Location_System SHALL confirm the address belongs to the authenticated customer
3. WHEN a saved address is verified, THE Location_System SHALL retrieve the full_address, latitude, and longitude from the database
4. WHEN a saved address does not exist or does not belong to the customer, THE Location_System SHALL return an authorization error
5. WHEN a saved address is processed, THE Location_System SHALL populate the booking with the saved address coordinates and text

### Requirement 3: Process Manual Address Entry with Validation

**User Story:** As a customer, I want to manually enter an address for a booking, so that I can specify locations not in my saved addresses.

#### Acceptance Criteria

1. WHEN a customer selects location_type "manual" and provides manual_address text, THE Location_System SHALL validate the address length is between 5 and 500 characters
2. WHEN a manual address is provided, THE Location_System SHALL validate it using Google Places API to ensure it is a legitimate address
3. WHEN Google Places API validation succeeds, THE Location_System SHALL store the validated address with coordinates from the API response
4. WHEN a manual address is provided with coordinates but no place_id, THE Location_System SHALL display a warning that coordinates should be verified
5. WHEN a manual address fails validation (e.g., "ddfhsdoffoe"), THE Location_System SHALL return a validation error indicating the address is invalid
6. WHEN a manual address is validated, THE Location_System SHALL store the place_id for future reference

### Requirement 4: Process Pin-On-Map Location Selection

**User Story:** As a customer, I want to pin my exact location on a map, so that I can specify the precise service location visually.

#### Acceptance Criteria

1. WHEN a customer selects location_type "pin_on_map", THE Location_System SHALL expect latitude, longitude, and formatted_address from the Google Maps interface
2. WHEN pin-on-map coordinates are received, THE Location_System SHALL validate they are within valid ranges (latitude: -90 to 90, longitude: -180 to 180)
3. WHEN pin-on-map location is processed, THE Location_System SHALL store the precise coordinates with 8 decimal precision
4. WHEN pin-on-map location includes a place_id from Google Places, THE Location_System SHALL store it with the booking
5. WHEN pin-on-map location is processed, THE Location_System SHALL store the formatted_address in the address_text field
6. WHEN a customer pins a location on the map, THE Location_System SHALL allow saving this location to saved addresses for future use

### Requirement 5: Create Booking with Location Data

**User Story:** As a customer, I want my selected location to be stored with my booking, so that the service provider knows where to deliver the service.

#### Acceptance Criteria

1. WHEN a booking is created with validated location data, THE Booking_System SHALL store the latitude in service_latitude field
2. WHEN a booking is created with validated location data, THE Booking_System SHALL store the longitude in service_longitude field
3. WHEN a booking is created with validated location data, THE Booking_System SHALL store the formatted address in address_text field
4. WHEN a booking is created, THE Booking_System SHALL use a database transaction to ensure atomicity
5. WHEN a booking creation fails, THE Booking_System SHALL rollback the transaction and return an error
6. WHEN a booking is created successfully, THE Booking_System SHALL return the booking object with all location fields populated
