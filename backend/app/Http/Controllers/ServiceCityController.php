<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use App\Models\ServiceCity;
use Illuminate\Support\Facades\Cache;

class ServiceCityController extends Controller
{
    public function index()
    {
        // Cities rarely change — cache for 24 hours
        $cities = Cache::remember('service_cities_active', 86400, function () {
            return ServiceCity::where('status', 'Active')->get();
        });

        return response()->json([
            'success' => true,
            'data' => $cities
        ]);
    }
}
