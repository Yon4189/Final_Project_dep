<?php

namespace App\Http\Controllers;

use App\Models\ServiceProvider;
use App\Models\Category;
use App\Models\Service;
use App\Models\Review;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use App\Models\Booking;
use Illuminate\Support\Facades\Validator;
use Carbon\Carbon;

class CustomerSearchController extends Controller
{
    public function searchProviders(Request $request)
    {
        // check if search query is empty
        $query = $request->query('q') ?? $request->query('query');
        
        if (!$query || trim($query) === '') {
            return response()->json([
                'success' => false,
                'message' => 'Please enter a search term',
                'data' => [],
                'pagination' => [
                    'current_page' => 1,
                    'total_pages' => 0,
                    'total_items' => 0,
                    'per_page' => $request->query('per_page', 20)
                ]
            ], 400);
        }
        
        // only search if query has at least 2 characters
        if (strlen(trim($query)) < 2) {
            return response()->json([
                'success' => false,
                'message' => 'Please enter at least 2 characters',
                'data' => [],
                'pagination' => [
                    'current_page' => 1,
                    'total_pages' => 0,
                    'total_items' => 0,
                    'per_page' => $request->query('per_page', 20)
                ]
            ], 400);
        }
        
        $categoryId = $request->query('category_id');
        $serviceId = $request->query('service_id');
        $minRating = $request->query('min_rating', 0);
        $maxDistance = $request->query('max_distance', 50);
        $sortBy = $request->query('sort_by', 'rating');
        $page = $request->query('page', 1);
        $perPage = $request->query('per_page', 20);
        $latitude = $request->query('latitude');
        $longitude = $request->query('longitude');
        $verifiedOnly = $request->query('verified_only');
        $availableNow = $request->query('available_now');

        $providers = ServiceProvider::where('status', 'approved')
            ->when($query, function ($q) use ($query) {
                $q->where(function ($subQuery) use ($query) {
                    // name must start with search term (like vs code)
                    $subQuery->where('fullname', 'like', $query . '%')
                        // bio can contain search term anywhere
                        ->orWhere('bio', 'like', '%' . $query . '%')
                        // also search in service titles
                        ->orWhereHas('services', function ($serviceQuery) use ($query) {
                            $serviceQuery->where('title', 'like', '%' . $query . '%');
                        });
                });
            })
            ->when($categoryId, function ($q) use ($categoryId) {
                $q->where('catagoryID', $categoryId);
            })
            ->when($serviceId, function ($q) use ($serviceId) {
                $q->whereHas('services', function ($sq) use ($serviceId) {
                    $sq->where('serviceID', $serviceId);
                });
            })
            ->when($minRating, function ($q) use ($minRating) {
                $q->where('rating', '>=', $minRating);
            })
            ->when($availableNow, function ($q) {
                $q->where('is_online', true);
            });

        // sort
        switch ($sortBy) {
            case 'rating':
                $providers = $providers->orderByDesc('rating');
                break;
            case 'distance':
                // will be calculated after getting results
                $providers = $providers->orderBy('fullname');
                break;
            case 'completed_jobs':
                $providers = $providers->orderByDesc('completed_jobs');
                break;
            case 'success_rate':
                $providers = $providers->orderByDesc('success_rate');
                break;
            default:
                $providers = $providers->orderByDesc('rating');
        }

        $providers = $providers->paginate($perPage, ['*'], 'page', $page);

        // calculate distances if coordinates provided
        if ($latitude && $longitude) {
            $providers->getCollection()->transform(function ($provider) use ($latitude, $longitude, $maxDistance) {
                $distance = $this->calculateDistance(
                    $latitude,
                    $longitude,
                    $provider->current_latitude ?? 9.03,
                    $provider->current_longitude ?? 38.74
                );
                
                $provider->distance = $distance;
                
                // filter by max distance
                if ($distance > $maxDistance) {
                    return null;
                }
                
                return $provider;
            });
            
            // remove null entries (providers outside max distance)
            $providers->setCollection(
                $providers->getCollection()->filter()->values()
            );
            
            // re-sort by distance if requested
            if ($sortBy === 'distance') {
                $providers->setCollection(
                    $providers->getCollection()->sortBy('distance')->values()
                );
            }
        }

        // load services/categories for the current page of providers
        $providerIds = $providers->getCollection()->pluck('providerID')->all();
        $servicesByProvider = Service::whereIn('providerID', $providerIds)
            ->with('category')
            ->get()
            ->groupBy('providerID');

        // transform to match frontend expectations
        $transformedProviders = $providers->getCollection()->map(function ($provider) use ($servicesByProvider) {
            $services = $servicesByProvider[$provider->providerID] ?? collect([]);
            return [
                'id' => $provider->providerID,
                'userId' => $provider->providerID,
                'businessName' => $provider->fullname,
                'firstName' => explode(' ', $provider->fullname)[0] ?? '',
                'lastName' => explode(' ', $provider->fullname)[1] ?? '',
                'phone' => $provider->phone,
                'profileImage' => $provider->profilePicture,
                'rating' => round($provider->rating, 1),
                'reviewCount' => 0, // will be calculated from reviews table
                'completedJobs' => $provider->completed_jobs ?? 0,
                'yearsExperience' => 5, // default since not in table
                'verified' => $provider->status === 'Active',
                'insured' => true, // default since not in table
                'isAvailable' => $provider->is_online ?? false,
                'services' => $this->transformServices($services),
                'priceRange' => [
                    'min' => $provider->hourly_rate ?? 500,
                    'max' => ($provider->hourly_rate ?? 500) * 3,
                    'currency' => 'ETB'
                ],
                'location' => [
                    'latitude' => $provider->current_latitude ?? 9.03,
                    'longitude' => $provider->current_longitude ?? 38.74,
                    'address' => $provider->service_city ?? 'Addis Ababa, Ethiopia'
                ],
                'distance' => $provider->distance ?? null,
                'responseTime' => '1 hour',
                'availability' => [],
                'reviews' => [],
                'about' => $provider->bio ?? 'Professional service provider',
                'languages' => ['English', 'Amharic'],
                'specializations' => [],
                'certifications' => []
            ];
        });

        return response()->json([
            'success' => true,
            'data' => $transformedProviders,
            'pagination' => [
                'current_page' => $providers->currentPage(),
                'total_pages' => $providers->lastPage(),
                'total_items' => $providers->total(),
                'per_page' => $providers->perPage()
            ]
        ]);
    }

    

    public function getTopRated(Request $request)
    {
        $limit = $request->query('limit', 5);
        
        $providers = ServiceProvider::where('status', 'Active')
            ->where('rating', '>=', 4.0)
            ->orderByDesc('rating')
            ->limit($limit)
            ->get();

        $transformedProviders = $providers->map(function ($provider) {
            return [
                'id' => $provider->providerID,
                'userId' => $provider->providerID,
                'businessName' => $provider->fullname,
                'firstName' => explode(' ', $provider->fullname)[0] ?? '',
                'lastName' => explode(' ', $provider->fullname)[1] ?? '',
                'phone' => $provider->phone,
                'profileImage' => $provider->profilePicture,
                'rating' => round($provider->rating, 1),
                'reviewCount' => 0,
                'completedJobs' => $provider->completed_jobs ?? 0,
                'yearsExperience' => 5,
                'verified' => $provider->status === 'Active',
                'insured' => true,
                'isAvailable' => $provider->is_online ?? false,
                'services' => [],
                'priceRange' => [
                    'min' => $provider->hourly_rate ?? 500,
                    'max' => ($provider->hourly_rate ?? 500) * 3,
                    'currency' => 'ETB'
                ],
                'location' => [
                    'latitude' => $provider->current_latitude ?? 9.03,
                    'longitude' => $provider->current_longitude ?? 38.74,
                    'address' => $provider->service_city ?? 'Addis Ababa, Ethiopia'
                ],
                'about' => $provider->bio ?? 'Professional service provider',
                'specializations' => []
            ];
        });

        return response()->json([
            'success' => true,
            'data' => $transformedProviders
        ]);
    }

    public function getProviderDetails($id)
    {
        $provider = ServiceProvider::where('providerID', $id)
            ->where('status', 'approved')
            ->with('category') // eager load category
            ->first();

        if (!$provider) {
            return response()->json([
                'success' => false,
                'message' => 'Provider not found'
            ], 404);
        }

        $services = Service::where('providerID', $provider->providerID)
            ->with('category')
            ->get();

        // group services by category
        $servicesByCategory = [];
        foreach ($services as $service) {
            $categoryId = $service->category->catagoryID ?? 0;
            $categoryName = $service->category->name ?? 'uncategorized';
            
            if (!isset($servicesByCategory[$categoryId])) {
                $servicesByCategory[$categoryId] = [
                    'id' => $categoryId,
                    'name' => $categoryName,
                    'services' => []
                ];
            }
            
            $servicesByCategory[$categoryId]['services'][] = [
                'id' => $service->serviceID,
                'name' => $service->title,
                'description' => $service->description,
                'basePrice' => $service->estimatedPrice,
                'duration' => 60 // default, adjust if you have this field
            ];
        }

        // convert to indexed array
        $categories = array_values($servicesByCategory);

        // clean provider info - remove repetition
        $transformedProvider = [
            'id' => $provider->providerID,
            'businessName' => $provider->fullname,
            'firstName' => explode(' ', $provider->fullname)[0] ?? '',
            'lastName' => explode(' ', $provider->fullname)[1] ?? '',
            'phone' => $provider->phone,
            'profileImage' => $provider->profilePicture,
            'rating' => round($provider->rating, 1),
            'reviewCount' => 0, // calculate from reviews table
            'completedJobs' => $provider->completed_jobs ?? 0,
            'yearsExperience' => 5, // calculate from join date
            'verified' => $provider->status === 'approved',
            'insured' => true,
            'isAvailable' => $provider->is_online ?? false,
            'about' => $provider->bio ?? 'professional service provider',
            'languages' => ['english', 'amharic'],
            'responseTime' => '1 hour',
            'location' => [
                'city' => $provider->service_city ?? 'addis ababa',
                'address' => $provider->service_city ?? 'addis ababa, ethiopia',
                'latitude' => $provider->current_latitude ?? 9.03,
                'longitude' => $provider->current_longitude ?? 38.74
            ],
            'categories' => $categories, // services grouped by category
            'reviews' => [], // load from reviews table
            'availability' => [] // load from schedule table
        ];

        return response()->json([
            'success' => true,
            'data' => $transformedProvider
        ]);
    }
    public function getProviderAvailability($id, Request $request)
    {
        $provider = ServiceProvider::where('providerID', $id)
            ->where('status', 'Active')
            ->first();

        if (!$provider) {
            return response()->json([
                'success' => false,
                'message' => 'Provider not found'
            ], 404);
        }

        $date = $request->query('date', now()->format('Y-m-d'));
        
        $availability = [
            [
                'id' => '1',
                'date' => $date,
                'startTime' => '09:00',
                'endTime' => '10:00',
                'isAvailable' => true
            ],
            [
                'id' => '2',
                'date' => $date,
                'startTime' => '10:00',
                'endTime' => '11:00',
                'isAvailable' => true
            ],
            [
                'id' => '3',
                'date' => $date,
                'startTime' => '14:00',
                'endTime' => '15:00',
                'isAvailable' => true
            ]
        ];

        return response()->json([
            'success' => true,
            'data' => $availability
        ]);
    }

    public function getProviderReviews($id, Request $request)
    {
        $provider = ServiceProvider::where('providerID', $id)
            ->where('status', 'Active')
            ->first();

        if (!$provider) {
            return response()->json([
                'success' => false,
                'message' => 'Provider not found'
            ], 404);
        }

        $page = $request->query('page', 1);
        $perPage = $request->query('per_page', 10);

        // Return empty reviews for now
        $reviews = collect([]);

        return response()->json([
            'success' => true,
            'data' => $reviews,
            'pagination' => [
                'current_page' => $page,
                'total_pages' => 1,
                'total_items' => 0,
                'per_page' => $perPage
            ]
        ]);
    }

    public function getNearbyProviders(Request $request)
    {
        $latitude = $request->query('lat');
        $longitude = $request->query('lng');
        $radius = $request->query('radius', 10);

        if (!$latitude || !$longitude) {
            return response()->json([
                'success' => false,
                'message' => 'Latitude and longitude are required'
            ], 400);
        }

        $providers = ServiceProvider::where('status', 'Active')
            ->whereNotNull('current_latitude')
            ->whereNotNull('current_longitude')
            ->selectRaw('*, (6371 * acos(cos(radians(?)) * cos(radians(current_latitude)) * cos(radians(current_longitude) - radians(?)) + sin(radians(?)) * sin(radians(current_latitude)))) AS distance', [$latitude, $longitude, $latitude])
            ->having('distance', '<=', $radius)
            ->orderBy('distance')
            ->limit(20)
            ->get();

        $transformedProviders = $providers->map(function ($provider) {
            return [
                'id' => $provider->providerID,
                'businessName' => $provider->fullname,
                'firstName' => explode(' ', $provider->fullname)[0] ?? '',
                'lastName' => explode(' ', $provider->fullname)[1] ?? '',
                'phone' => $provider->phone,
                'profileImage' => $provider->profilePicture,
                'rating' => round($provider->rating, 1),
                'reviewCount' => 0,
                'verified' => $provider->status === 'Active',
                'distance' => round($provider->distance, 2),
                'location' => [
                    'latitude' => $provider->current_latitude,
                    'longitude' => $provider->current_longitude,
                    'address' => $provider->service_city ?? 'Addis Ababa, Ethiopia'
                ],
                'specializations' => []
            ];
        });

        return response()->json([
            'success' => true,
            'data' => $transformedProviders
        ]);
    }

    public function getSearchSuggestions(Request $request)
    {
        $query = $request->query('query');
        
        if (!$query || strlen($query) < 2) {
            return response()->json([
                'success' => true,
                'data' => []
            ]);
        }

        // Category suggestions  
        $categories = Category::where('name', 'like', "%{$query}%")
            ->limit(5)
            ->pluck('name');

        return response()->json([
            'success' => true,
            'data' => $categories
        ]);
    }

    private function calculateDistance($lat1, $lon1, $lat2, $lon2)
    {
        if ($lat1 == $lat2 && $lon1 == $lon2) {
            return 0;
        }

        $theta = $lon1 - $lon2;
        $dist = sin(deg2rad($lat1)) * sin(deg2rad($lat2)) +  cos(deg2rad($lat1)) * cos(deg2rad($lat2)) * cos(deg2rad($theta));
        $dist = acos($dist);
        $dist = rad2deg($dist);
        $miles = $dist * 60 * 1.1515;
        
        return ($miles * 1.609344);
    }

    private function transformServices($services)
    {
        if (!$services) {
            return [];
        }

        return collect($services)->map(function ($service) {
            return [
                // Frontend expects `id` to be the service identifier used when creating requests
                'id' => $service->serviceID,
                'professionalProfileId' => $service->providerID,
                'serviceId' => $service->serviceID,
                'name' => $service->title ?? 'Service',
                'description' => $service->description ?? '',
                // Use whatever exists in your schema (estimatedCost migration vs estimatedPrice model fillable)
                'basePrice' => $service->estimatedCost ?? $service->estimatedPrice ?? 1000,
                'categoryId' => $service->catagoryID,
                'categoryName' => $service->category ? $service->category->name : 'General',
                'duration' => 60,
                'isActive' => true
            ];
        })->toArray();
    }
}
