<?php

namespace App\Services;

use App\Models\CustomerAddress;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Validator;
use Illuminate\Validation\ValidationException;

class LocationValidator
{
    protected $googlePlacesService;

    public function __construct(GooglePlacesService $googlePlacesService)
    {
        $this->googlePlacesService = $googlePlacesService;
    }

    /**
     * Validate location input based on location_type
     * 
     * @param Request $request
     * @param int $customerId
     * @return array LocationData
     * @throws ValidationException
     */
    public function validateLocationInput(Request $request, int $customerId): array
    {
        $locationType = $request->input('location_type');

        // Validate location_type
        if (!in_array($locationType, ['current', 'saved', 'manual', 'pin_on_map'])) {
            throw ValidationException::withMessages([
                'location_type' => ['Invalid location_type. Must be one of: current, saved, manual, pin_on_map']
            ]);
        }

        // Route to appropriate processor based on location_type
        switch ($locationType) {
            case 'current':
                return $this->processCurrentLocation(
                    $request->input('latitude'),
                    $request->input('longitude'),
                    $request->input('place_id')
                );

            case 'saved':
                return $this->processSavedAddress(
                    $request->input('address_id'),
                    $customerId
                );

            case 'manual':
                return $this->processManualAddress(
                    $request->input('manual_address'),
                    $request->input('place_id')
                );

            case 'pin_on_map':
                return $this->processPinOnMapLocation(
                    $request->input('latitude'),
                    $request->input('longitude'),
                    $request->input('formatted_address'),
                    $request->input('place_id')
                );

            default:
                throw ValidationException::withMessages([
                    'location_type' => ['Invalid location_type']
                ]);
        }
    }

    /**
     * Validate GPS coordinate bounds
     * 
     * @param float $latitude
     * @param float $longitude
     * @throws ValidationException
     */
    protected function validateCoordinateBounds(float $latitude, float $longitude): void
    {
        if ($latitude < -90 || $latitude > 90) {
            throw ValidationException::withMessages([
                'latitude' => ['Latitude must be between -90 and 90']
            ]);
        }

        if ($longitude < -180 || $longitude > 180) {
            throw ValidationException::withMessages([
                'longitude' => ['Longitude must be between -180 and 180']
            ]);
        }
    }

    /**
     * Process current GPS location
     * 
     * @param float|null $latitude
     * @param float|null $longitude
     * @param string|null $placeId
     * @return array LocationData
     * @throws ValidationException
     */
    public function processCurrentLocation(?float $latitude, ?float $longitude, ?string $placeId = null): array
    {
        // Validate required fields
        if ($latitude === null || $longitude === null) {
            throw ValidationException::withMessages([
                'latitude' => ['Latitude is required for current location'],
                'longitude' => ['Longitude is required for current location']
            ]);
        }

        // Validate coordinate bounds
        $this->validateCoordinateBounds($latitude, $longitude);

        // Store with 8 decimal precision
        $latitude = round($latitude, 8);
        $longitude = round($longitude, 8);

        return [
            'full_address' => $placeId ? 'GPS Location' : 'GPS Location',
            'latitude' => $latitude,
            'longitude' => $longitude,
            'place_id' => $placeId,
            'source' => 'gps'
        ];
    }

    /**
     * Process saved address
     * 
     * @param int|null $addressId
     * @param int $customerId
     * @return array LocationData
     * @throws ValidationException
     */
    public function processSavedAddress(?int $addressId, int $customerId): array
    {
        // Validate required fields
        if ($addressId === null) {
            throw ValidationException::withMessages([
                'address_id' => ['Address ID is required for saved address']
            ]);
        }

        // Query with ownership check
        $address = CustomerAddress::where('addressID', $addressId)
            ->where('customerID', $customerId)
            ->first();

        if (!$address) {
            throw ValidationException::withMessages([
                'address_id' => ['Address not found or access denied']
            ]);
        }

        // Validate address has required fields
        if (!$address->latitude || !$address->longitude || !$address->full_address) {
            throw ValidationException::withMessages([
                'address_id' => ['Saved address is missing required location data']
            ]);
        }

        return [
            'full_address' => $address->full_address,
            'latitude' => (float) $address->latitude,
            'longitude' => (float) $address->longitude,
            'place_id' => $address->place_id,
            'source' => 'saved_address'
        ];
    }

    /**
     * Process manual address with Google Places validation
     * 
     * @param string|null $manualAddress
     * @param string|null $placeId
     * @return array LocationData
     * @throws ValidationException
     */
    public function processManualAddress(?string $manualAddress, ?string $placeId = null): array
    {
        // Validate required fields
        if (!$manualAddress) {
            throw ValidationException::withMessages([
                'manual_address' => ['Manual address is required']
            ]);
        }

        // Trim and sanitize
        $manualAddress = trim($manualAddress);

        // Validate length
        if (strlen($manualAddress) < 5 || strlen($manualAddress) > 500) {
            throw ValidationException::withMessages([
                'manual_address' => ['Address must be between 5 and 500 characters']
            ]);
        }

        // Validate address using Google Places API
        $validationResult = $this->googlePlacesService->validateAddress($manualAddress);

        if (!$validationResult['isValid']) {
            throw ValidationException::withMessages([
                'manual_address' => ['Invalid address: address not recognized']
            ]);
        }

        // Extract validated data from Google Places API
        $data = $validationResult['data'];

        return [
            'full_address' => $data['formatted_address'],
            'latitude' => round($data['latitude'], 8),
            'longitude' => round($data['longitude'], 8),
            'place_id' => $data['place_id'],
            'source' => 'manual'
        ];
    }

    /**
     * Process pin-on-map location
     * 
     * @param float|null $latitude
     * @param float|null $longitude
     * @param string|null $formattedAddress
     * @param string|null $placeId
     * @return array LocationData
     * @throws ValidationException
     */
    public function processPinOnMapLocation(
        ?float $latitude,
        ?float $longitude,
        ?string $formattedAddress,
        ?string $placeId = null
    ): array {
        // Validate required fields
        if ($latitude === null || $longitude === null) {
            throw ValidationException::withMessages([
                'latitude' => ['Latitude is required for pin-on-map location'],
                'longitude' => ['Longitude is required for pin-on-map location']
            ]);
        }

        if (!$formattedAddress) {
            throw ValidationException::withMessages([
                'formatted_address' => ['Formatted address is required for pin-on-map location']
            ]);
        }

        // Validate coordinate bounds
        $this->validateCoordinateBounds($latitude, $longitude);

        // Store with 8 decimal precision
        $latitude = round($latitude, 8);
        $longitude = round($longitude, 8);

        return [
            'full_address' => $formattedAddress,
            'latitude' => $latitude,
            'longitude' => $longitude,
            'place_id' => $placeId,
            'source' => 'pin_on_map'
        ];
    }
}
