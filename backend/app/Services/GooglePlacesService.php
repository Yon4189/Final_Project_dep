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
        $this->baseUrl = 'https://nominatim.openstreetmap.org';
        
        // Configure Guzzle client
        $clientConfig = [
            'base_uri' => $this->baseUrl,
            'timeout' => 10,
            'headers' => [
                'User-Agent' => 'ServiceBookingApp/1.0' // Required by Nominatim
            ]
        ];
        
        // Disable SSL verification in local environment (Windows SSL certificate issue)
        if (app()->environment('local')) {
            $clientConfig['verify'] = false;
        }
        
        $this->client = new Client($clientConfig);
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
            // Use Nominatim (OpenStreetMap) for geocoding - FREE, no API key needed
            $options = [
                'query' => [
                    'q' => $address,
                    'format' => 'json',
                    'limit' => 1,
                    'addressdetails' => 1
                ]
            ];
            
            // Disable SSL verification in local environment
            if (app()->environment('local')) {
                $options['verify'] = false;
            }
            
            Log::info('Nominatim API Request', [
                'address' => $address,
                'environment' => app()->environment(),
            ]);
            
            $response = $this->client->get('/search', $options);
            $results = json_decode($response->getBody(), true);
            
            // Log the response
            Log::info('Nominatim API Response', [
                'address' => $address,
                'results_count' => count($results),
                'results' => $results
            ]);

            if (!empty($results)) {
                $result = $results[0];
                
                // Nominatim returns results even for partial matches
                // Check if it's a reasonable match
                $displayName = $result['display_name'] ?? '';
                
                return [
                    'status' => 'success',
                    'isValid' => true,
                    'data' => [
                        'formatted_address' => $displayName,
                        'latitude' => (float) $result['lat'],
                        'longitude' => (float) $result['lon'],
                        'place_id' => $result['place_id'] ?? 'nominatim_' . $result['osm_id'],
                    ]
                ];
            }

            // Address not found
            Log::warning('Nominatim: Address not found', [
                'address' => $address
            ]);
            
            return [
                'status' => 'error',
                'isValid' => false,
                'message' => 'Address not recognized or invalid'
            ];

        } catch (RequestException $e) {
            Log::error('Nominatim API validation failed', [
                'address' => $address,
                'error' => $e->getMessage(),
                'response' => $e->hasResponse() ? $e->getResponse()->getBody()->getContents() : 'no response'
            ]);
            
            return [
                'status' => 'error',
                'isValid' => false,
                'message' => 'Could not validate address: ' . $e->getMessage()
            ];
        } catch (\Exception $e) {
            Log::error('Nominatim validation exception', [
                'address' => $address,
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString()
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
