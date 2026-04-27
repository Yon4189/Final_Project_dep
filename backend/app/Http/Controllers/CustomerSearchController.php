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
        $inputs = $this->getSearchInputs($request);
        
        // Initialize Query with approved status
        $query = ServiceProvider::approved();

        // Distance Filtering (Database Level)
        if ($inputs['latitude'] && $inputs['longitude']) {
            $query->nearest($inputs['latitude'], $inputs['longitude']);
            if ($inputs['maxDistance'] < 999999) {
                $query->having('distance', '<=', (float)$inputs['maxDistance']);
            }
        }

        // Apply Filters
        $this->applySearchFilters($query, $request, $inputs);

        // Apply Sorting
        $this->applySearchSorting($query, $inputs);

        // Paginate
        $paginator = $query->paginate($inputs['perPage'], ['*'], 'page', $inputs['page']);

        // Transform results
        $transformedData = $this->transformSearchCollection($paginator);

        return response()->json([
            'success' => true,
            'data' => $transformedData,
            'pagination' => [
                'current_page' => $paginator->currentPage(),
                'total_pages' => $paginator->lastPage(),
                'total_items' => $paginator->total(),
                'per_page' => $paginator->perPage()
            ]
        ]);
    }

    private function getSearchInputs(Request $request)
    {
        return [
            'query' => $request->query('q') ?? $request->query('query', ''),
            'categoryId' => $request->query('category_id'),
            'serviceId' => $request->query('service_id'),
            'minRating' => $request->query('min_rating', 0),
            'maxDistance' => $request->query('max_distance', 999999),
            'sortBy' => $request->query('sort_by', 'rating'),
            'page' => $request->query('page', 1),
            'perPage' => $request->query('per_page', 20),
            'latitude' => $request->query('latitude'),
            'longitude' => $request->query('longitude'),
            'verifiedOnly' => $request->query('verified_only'),
            'availableNow' => $request->query('available_now'),
            'city' => $request->query('city'),
            'priceMin' => $request->query('price_min'),
            'priceMax' => $request->query('price_max'),
        ];
    }

    private function applySearchFilters($query, Request $request, array $inputs)
    {
        $searchTerm = $inputs['query'];
        $query->when($searchTerm, function ($q) use ($searchTerm) {
            $q->where(function ($subQuery) use ($searchTerm) {
                $subQuery->where('fullname', 'like', '%' . $searchTerm . '%')
                    ->orWhere('bio', 'like', '%' . $searchTerm . '%')
                    ->orWhereHas('services', function ($serviceQuery) use ($searchTerm) {
                        $serviceQuery->where('title', 'like', '%' . $searchTerm . '%');
                    });
            });
        })
        ->when($inputs['categoryId'], function ($q, $catId) {
            $q->where('catagoryID', $catId);
        })
        ->when($inputs['city'], function ($q, $city) {
            $q->where('service_city', $city);
        })
        ->when($inputs['serviceId'], function ($q, $serviceId) {
            $q->whereHas('services', function ($sq) use ($serviceId) {
                $sq->where('serviceID', $serviceId);
            });
        })
        ->when($inputs['minRating'], function ($q, $minRating) {
            $q->where('rating', '>=', $minRating);
        })
        ->when($inputs['availableNow'], function ($q) {
            $q->where('is_online', true);
        });

        // Price Range Filter
        $priceMin = $inputs['priceMin'];
        $priceMax = $inputs['priceMax'];
        if ($priceMin !== null || $priceMax !== null) {
            $query->where(function($q) use ($priceMin, $priceMax) {
                $q->where(function($sq) use ($priceMin, $priceMax) {
                    if ($priceMin !== null) {
                        $sq->where(function($ssq) use ($priceMin) {
                            $ssq->where('estimatedPrice', '>=', (float)$priceMin)
                                ->orWhere('hourly_rate', '>=', (float)$priceMin);
                        });
                    }
                    if ($priceMax !== null) {
                        $sq->where(function($ssq) use ($priceMax) {
                            $ssq->where('estimatedPrice', '<=', (float)$priceMax)
                                ->orWhere('hourly_rate', '<=', (float)$priceMax);
                        });
                    }
                })->orWhereHas('services', function($sq) use ($priceMin, $priceMax) {
                    if ($priceMin !== null) {
                        $sq->where(function($ssq) use ($priceMin) {
                            $ssq->where('estimatedPrice', '>=', (float)$priceMin)
                                ->orWhere('hourly_rate', '>=', (float)$priceMin);
                        });
                    }
                    if ($priceMax !== null) {
                        $sq->where(function($ssq) use ($priceMax) {
                            $ssq->where('estimatedPrice', '<=', (float)$priceMax)
                                ->orWhere('hourly_rate', '<=', (float)$priceMax);
                        });
                    }
                });
            });
        }
    }

    private function applySearchSorting($query, array $inputs)
    {
        $sortBy = $inputs['sortBy'];
        switch ($sortBy) {
            case 'rating':
            case 'rating_high':
                $query->orderByDesc('rating');
                break;
            case 'rating_low':
                $query->orderBy('rating');
                break;
            case 'price_high':
                $query->orderByRaw('COALESCE(estimatedPrice, hourly_rate, 0) DESC');
                break;
            case 'price_low':
                $query->orderByRaw('COALESCE(estimatedPrice, hourly_rate, 999999) ASC');
                break;
            case 'distance':
            case 'nearest':
                if (!$inputs['latitude'] || !$inputs['longitude']) {
                    $query->orderByDesc('rating');
                }
                // If coordinates present, nearest scope already handles sorting
                break;
            case 'reviews':
            case 'completed_jobs':
                $query->orderByDesc('completed_jobs');
                break;
            default:
                $query->orderByDesc('rating');
        }
    }

    private function transformSearchCollection($paginator)
    {
        $providerIds = $paginator->getCollection()->pluck('providerID')->all();
        $servicesByProvider = Service::whereIn('providerID', $providerIds)
            ->with('category')
            ->get()
            ->groupBy('providerID');

        return $paginator->getCollection()->map(function ($provider) use ($servicesByProvider) {
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
                'reviewCount' => $provider->total_reviews ?? 0,
                'completedJobs' => $provider->completed_jobs ?? 0,
                'yearsExperience' => 5,
                'verified' => in_array($provider->status, ['Active', 'approved', 'active']),
                'insured' => true,
                'isAvailable' => (bool)$provider->is_online,
                'services' => $this->transformServices($services),
                'priceRange' => [
                    'min' => $provider->hourly_rate ?? $services->min('estimatedPrice') ?? 500,
                    'max' => $provider->hourly_rate ?? $services->max('estimatedPrice') ?? 1500,
                    'currency' => 'ETB'
                ],
                'location' => [
                    'latitude' => (float)($provider->current_latitude ?? 9.03),
                    'longitude' => (float)($provider->current_longitude ?? 38.74),
                    'address' => $provider->service_city ?? 'Addis Ababa, Ethiopia'
                ],
                'distance' => isset($provider->distance) ? round($provider->distance, 2) : null,
                'responseTime' => '1 hour',
                'availability' => [],
                'reviews' => [],
                'about' => $provider->bio ?? 'Professional service provider',
                'languages' => ['English', 'Amharic'],
                'specializations' => [],
                'certifications' => []
            ];
        });
    }

    

    public function getTopRated(Request $request)
    {
        $limit = $request->query('limit', 5);
        
        $providers = ServiceProvider::whereIn('status', ['Active', 'approved'])
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
                'verified' => in_array($provider->status, ['Active', 'approved']),
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
            ->whereIn('status', ['Active', 'approved'])
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
            'verified' => in_array($provider->status, ['Active', 'approved']),
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
            'services' => $this->transformServices($services), // add flat services array
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
            ->whereIn('status', ['Active', 'approved'])
            ->first();

        if (!$provider) {
            return response()->json([
                'success' => false,
                'message' => 'Provider not found'
            ], 404);
        }

        $dateString = $request->query('date', now()->format('Y-m-d'));
        try {
            $date = Carbon::parse($dateString);
        } catch (\Exception $e) {
            return response()->json(['success' => false, 'message' => 'Invalid date format'], 400);
        }

        $dayOfWeek = $date->dayOfWeek; // 0 (Sun) - 6 (Sat)

        $availabilityRecord = \App\Models\ProviderAvailability::where('providerID', $id)
            ->where('day_of_week', $dayOfWeek)
            ->where('is_active', true)
            ->first();

        $availability = [];

        if ($availabilityRecord) {
            // Generate 1-hour slots
            $startTime = Carbon::parse($dateString . ' ' . $availabilityRecord->start_time);
            $endTime = Carbon::parse($dateString . ' ' . $availabilityRecord->end_time);

            // Fetch busy slots (bookings that are pending, accepted, or in progress)
            $busyTimeStrings = Booking::where('providerID', $id)
                ->whereDate('scheduledDate', $dateString)
                ->whereIn('status', ['pending', 'accepted', 'in_progress'])
                ->get()
                ->map(function ($booking) {
                    return Carbon::parse($booking->scheduledDate)->format('H:i');
                })
                ->toArray();

            $slotId = 1;

            while ($startTime->copy()->addHour() <= $endTime) {
                $startSlotString = $startTime->format('H:i');
                $endSlotString = $startTime->copy()->addHour()->format('H:i');
                
                $isAvailable = true;
                
                // If it's today, filter out past times (with a 1 hour buffer)
                if ($date->isToday() && $startTime < now()->addHour()) {
                    $isAvailable = false;
                }
                
                if (in_array($startSlotString, $busyTimeStrings)) {
                    $isAvailable = false;
                }

                if ($isAvailable) {
                    $availability[] = [
                        'id' => (string)$slotId++,
                        'date' => $dateString,
                        'startTime' => $startSlotString,
                        'endTime' => $endSlotString,
                        'isAvailable' => true
                    ];
                }

                $startTime->addHour();
            }
        }

        return response()->json([
            'success' => true,
            'data' => $availability
        ]);
    }

    public function getProviderReviews($id, Request $request)
    {
        $provider = ServiceProvider::where('providerID', $id)
            ->whereIn('status', ['Active', 'approved'])
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

        $providers = ServiceProvider::whereIn('status', ['Active', 'approved'])
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
                'verified' => in_array($provider->status, ['Active', 'approved']),
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
            $price = $service->estimatedCost ?? $service->estimatedPrice ?? 1000;
            return [
                // IDs
                'id' => (string)$service->serviceID,
                'serviceId' => (string)$service->serviceID,
                'professionalProfileId' => (string)$service->providerID,
                
                // Flat fields for simple consumption
                'name' => $service->title ?? 'Service',
                'serviceName' => $service->title ?? 'Service',
                'description' => $service->description ?? '',
                'price' => $price,
                'basePrice' => $price,
                'customPrice' => $price,
                
                // Nested object for standard frontend DTOs
                'service' => [
                    'id' => (string)$service->serviceID,
                    'name' => $service->title ?? 'Service',
                    'basePrice' => $price,
                    'estimatedDuration' => [
                        'min' => 30,
                        'max' => 90,
                        'unit' => 'minutes'
                    ]
                ],
                
                'categoryId' => $service->catagoryID,
                'categoryName' => $service->category ? $service->category->name : 'General',
                'duration' => 60,
                'isActive' => true
            ];
        })->toArray();
    }
}
