<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use App\Models\ServiceProvider;
use App\Models\Customer;

class ProviderSearchController extends Controller
{
    public function search(Request $request)
    {
        // 1 Validate required inputs
        if (!$request->customerID) {
            return response()->json([
                'success' => false,
                'message' => 'customerID is required'
            ], 400);
        }

        if (!$request->search_text || trim($request->search_text) === '') {
            return response()->json([
                'success' => false,
                'message' => 'search_text is required'
            ], 400);
        }

        // 2 Get Customer
        $customer = Customer::where('customerID', $request->customerID)->first();

        if (!$customer) {
            return response()->json([
                'success' => false,
                'message' => 'Customer not found'
            ], 404);
        }

        if (!$customer->service_city) {
            return response()->json([
                'success' => false,
                'message' => 'Customer city is not set'
            ], 400);
        }

        $searchText = $request->search_text;

        //  Get Providers in same city with matched services
        $providers = ServiceProvider::where('status', 'approved')
            ->where('service_city', $customer->service_city)
            ->whereHas('services', function ($query) use ($searchText) {
                $query->where('title', 'LIKE', "%{$searchText}%");
            })
            ->with(['services' => function ($query) use ($searchText) {
                $query->where('title', 'LIKE', "%{$searchText}%");
            }])
            ->get();

        // 3 Optional predefined price range filter
        if ($request->has('min_price') || $request->has('max_price')) {

            $min = $request->min_price ?? 0;
            $max = $request->max_price ?? PHP_INT_MAX;

            $providers = $providers->filter(function ($provider) use ($min, $max) {
                return $provider->services->contains(function ($service) use ($min, $max) {
                    return $service->estimatedPrice >= $min &&
                           $service->estimatedPrice <= $max;
                });
            });
        }

        $customerLat = $customer->current_latitude;
        $customerLng = $customer->current_longitude;

        //  Transform providers
        $providers = $providers->map(function ($provider) use ($customerLat, $customerLng) {

            // Calculate distance (if coordinates exist)
            $distance = null;

            if ($customerLat && $customerLng &&
                $provider->current_latitude && $provider->current_longitude) {

                $latFrom = deg2rad($customerLat);
                $lngFrom = deg2rad($customerLng);
                $latTo = deg2rad($provider->current_latitude);
                $lngTo = deg2rad($provider->current_longitude);

                $latDelta = $latTo - $latFrom;
                $lngDelta = $lngTo - $lngFrom;

                $a = sin($latDelta/2) * sin($latDelta/2) +
                     cos($latFrom) * cos($latTo) *
                     sin($lngDelta/2) * sin($lngDelta/2);

                $c = 2 * atan2(sqrt($a), sqrt(1 - $a));

                $distance = 6371 * $c; // KM
            }

            // Get lowest matched price (ONLY for sorting)
            $lowestMatchedPrice = $provider->services->min('estimatedPrice');

            return [
                'providerID' => $provider->providerID,
                'fullname' => $provider->fullname,
                'profilePicture' => $provider->profilePicture,
                'city' => $provider->service_city,
                'success_rate' => $provider->success_rate,


                'rating' => $provider->rating,
                'hourly_rate' => $provider->hourly_rate,
                'distance' => $distance ? round($distance, 2) : null,
                'lowest_matched_price' => $lowestMatchedPrice, // internal use
                'matched_services' => $provider->services->map(function ($service) {
                    return [
                        'title' => $service->title,
                        'estimatedPrice' => $service->estimatedPrice
                    ];
                })->values()
            ];
        });

        //  Sorting Logic

        if ($request->sort_by === 'nearest' && $customerLat && $customerLng) {

            $providers = $providers->sortBy([
                ['distance', 'asc'],
                ['success_rate', 'desc'],
                ['rating', 'desc'],
                ['lowest_matched_price', 'asc']
            ]);

        } else {

            if ($customerLat && $customerLng) {
                $providers = $providers->sortBy([
                    ['success_rate', 'desc'],
                    ['rating', 'desc'],
                    ['distance', 'asc'],
                    ['lowest_matched_price', 'asc']
                ]);
            } else {
                $providers = $providers->sortBy([
                    ['success_rate', 'desc'],
                    ['rating', 'desc'],
                    ['lowest_matched_price', 'asc']
                ]);
            }
        }

        // Remove lowest_matched_price before returning
        $providers = $providers->map(function ($provider) {
            unset($provider['lowest_matched_price']);
            return $provider;
        });

        return response()->json([
            'success' => true,
            'data' => $providers->values()
        ]);

        $customer = auth('customer')->user();
        if (!$customer) {
            return response()->json([
                'success' => false,
                'message' => 'Not authenticated as customer',
                'debug' => 'Auth check failed'
            ], 401);
        }
            }

    
}