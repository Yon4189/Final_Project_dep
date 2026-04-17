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
        $query = $request->query('q') ?? $request->query('query', '');
        
        $categoryId = $request->query('category_id');
        $serviceId = $request->query('service_id');
        $minRating = $request->query('min_rating', 0);
        $maxDistance = $request->query('max_distance', 999999);
        $sortBy = $request->query('sort_by', 'rating');
        $page = $request->query('page', 1);
        $perPage = $request->query('per_page', 20);
        $latitude = $request->query('latitude');
        $longitude = $request->query('longitude');
        $verifiedOnly = $request->query('verified_only');
        $availableNow = $request->query('available_now');

        $providers = ServiceProvider::whereIn('status', ['Active', 'approved'])
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
            ->when($request->query('city'), function ($q, $city) {
                $q->where('service_city', $city);
            }) // filter by city if provided. accept this change if conflict occurs
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
        // this switch is updated. accept this change if conflict occurs
        switch ($sortBy) {
            case 'rating':
            case 'rating_high':
                $providers = $providers->orderByDesc('rating');
                break;
            case 'rating_low':
                $providers = $providers->orderBy('rating');
                break;
            case 'price_high':
                $providers = $providers->orderByDesc('estimatedPrice');
                break;
            case 'price_low':
                $providers = $providers->orderBy('estimatedPrice');
                break;
            case 'distance':
            case 'nearest':
                // handled after distance calculation below
                $providers = $providers->orderBy('fullname'); // temporary placeholder
                break;
            case 'reviews':
            case 'completed_jobs':
                $providers = $providers->orderByDesc('completed_jobs');
                break;
            default:
                $providers = $providers->orderByDesc('rating');
        }

        // price range filter
        $priceMin = $request->query('price_min');
        $priceMax = $request->query('price_max');
        if ($priceMin !== null) {
            $providers = $providers->where('estimatedPrice', '>=', (float)$priceMin);
        }
        if ($priceMax !== null) {
            $providers = $providers->where('estimatedPrice', '<=', (float)$priceMax);
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
            if ($sortBy === 'distance' || $sortBy === 'nearest') {
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
                'verified' => in_array($provider->status, ['Active', 'approved']),
                'insured' => true, // default since not in table
                'isAvailable' => $provider->is_online ?? false,
                'services' => $this->transformServices($services),
                'priceRange' => [
                    'min' => $provider->hourly_rate ?? $services->min('estimatedPrice') ?? 500,
                    'max' => $provider->hourly_rate ?? $services->max('estimatedPrice') ?? 1500,
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
