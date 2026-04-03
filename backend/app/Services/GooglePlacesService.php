<?php

namespace App\Services;

use GuzzleHttp\Client;
use GuzzleHttp\Exception\RequestException;
use Illuminate\Support\Facades\Log;

class GooglePlacesService
{
    protected $apiKey;
    protected $baseUrl;
    protected $client;

    public function __construct()
    {
        $this->apiKey = config('services.google_places.api_key');
        $this->baseUrl = 'https://maps.googleapis.com/maps/api';
        $this->client = new Client([
            'base_uri' => $this->baseUrl,
            'timeout' => 10,
        ]);
    }

    /**
     * Validate an address using Google Places API
     * 
     * @param string $address The address to validate
     * @return array Response with validation result
     */
    public function validateAddress(string $address): array
    {
        try {
            $response = $this->client->get('/geocode/json', [
                'query' => [
                    'address' => $address,
                    'key' => $this->apiKey,
                ]
            ]);

            $body = json_decode($response->getBody(), true);

            if ($body['status'] === 'OK' && !empty($body['results'])) {
                $result = $body['results'][0];
                
                return [
                    'status' => 'success',
                    'isValid' => true,
                    'data' => [
                        'formatted_address' => $result['formatted_address'],
                        'latitude' => $result['geometry']['location']['lat'],
                        'longitude' => $result['geometry']['location']['lng'],
                        'place_id' => $result['place_id'],
                    ]
                ];
            }

            // Address not found or invalid
            return [
                'status' => 'error',
                'isValid' => false,
                'message' => 'Address not recognized or invalid'
            ];

        } catch (RequestException $e) {
            Log::error('Google Places API validation failed', [
                'address' => $address,
                'error' => $e->getMessage()
            ]);
            
            return [
                'status' => 'error',
                'isValid' => false,
                'message' => 'Could not validate address: ' . $e->getMessage()
            ];
        } catch (\Exception $e) {
            Log::error('Google Places validation exception', [
                'address' => $address,
                'error' => $e->getMessage()
            ]);
            
            return [
                'status' => 'error',
                'isValid' => false,
                'message' => 'Address validation service unavailable'
            ];
        }
    }

    /**
     * Get coordinates from a validated address
     * 
     * @param string $address The address to geocode
     * @return array Response with coordinates
     */
    public function getCoordinates(string $address): array
    {
        $validationResult = $this->validateAddress($address);
        
        if ($validationResult['status'] === 'success' && $validationResult['isValid']) {
            return [
                'status' => 'success',
                'data' => [
                    'latitude' => $validationResult['data']['latitude'],
                    'longitude' => $validationResult['data']['longitude'],
                ]
            ];
        }

        return [
            'status' => 'error',
            'message' => $validationResult['message'] ?? 'Could not get coordinates'
        ];
    }
}
