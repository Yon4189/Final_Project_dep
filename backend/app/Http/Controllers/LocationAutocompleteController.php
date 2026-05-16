<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use GuzzleHttp\Client;
use Illuminate\Support\Facades\Log;

class LocationAutocompleteController extends Controller
{
    /**
     * Get autocomplete suggestions for an address
     * 
     * @param Request $request
     * @return \Illuminate\Http\JsonResponse
     */
    public function autocomplete(Request $request)
    {
        $request->validate([
            'query' => 'required|string|min:2|max:200'
        ]);

        $query = $request->input('query');

        try {
            $client = new Client([
                'base_uri' => 'https://nominatim.openstreetmap.org',
                'timeout' => 5,
                'headers' => [
                    'User-Agent' => 'ServiceBookingApp/1.0'
                ],
                'verify' => !app()->environment('local') // Disable SSL verification in local
            ]);

            $response = $client->get('/search', [
                'query' => [
                    'q' => $query,
                    'format' => 'json',
                    'limit' => 5,
                    'addressdetails' => 1,
                    'countrycodes' => 'et' // Limit to Ethiopia for better results
                ]
            ]);

            $results = json_decode($response->getBody(), true);

            // Format results for frontend
            $suggestions = array_map(function($result) {
                return [
                    'display_name' => $result['display_name'],
                    'address' => $result['display_name'],
                    'latitude' => (float) $result['lat'],
                    'longitude' => (float) $result['lon'],
                    'place_id' => $result['place_id'] ?? 'nominatim_' . $result['osm_id'],
                ];
            }, $results);

            return response()->json([
                'success' => true,
                'suggestions' => $suggestions
            ]);

        } catch (\Exception $e) {
            Log::error('Autocomplete failed', [
                'query' => $query,
                'error' => $e->getMessage()
            ]);

            return response()->json([
                'success' => false,
                'message' => 'Could not fetch suggestions',
                'suggestions' => []
            ], 500);
        }
    }
}
