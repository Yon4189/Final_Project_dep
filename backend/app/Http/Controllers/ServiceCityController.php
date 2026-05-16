<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use App\Models\ServiceCity;
use Illuminate\Support\Facades\Cache;

class ServiceCityController extends Controller
{
    public function index()
    {
        // For admin, we might want all cities. For public, only active.
        // If it's an admin request, return all.
        if (request()->is('api/admin/*')) {
            return response()->json([
                'success' => true,
                'data' => ServiceCity::all()
            ]);
        }

        // Cities rarely change — cache for 24 hours
        $cities = Cache::remember('service_cities_active', 86400, function () {
            return ServiceCity::where('status', 'Active')->get();
        });

        return response()->json([
            'success' => true,
            'data' => $cities
        ]);
    }

    public function store(Request $request)
    {
        $request->validate([
            'name' => 'required|string|unique:service_cities,name',
            'status' => 'required|in:Active,Inactive'
        ]);

        $city = ServiceCity::create($request->all());

        Cache::forget('service_cities_active');

        return response()->json([
            'success' => true,
            'message' => 'City added successfully',
            'data' => $city
        ]);
    }

    public function update(Request $request, $id)
    {
        $city = ServiceCity::findOrFail($id);

        $request->validate([
            'name' => 'sometimes|string|unique:service_cities,name,' . $id . ',cityID',
            'status' => 'sometimes|in:Active,Inactive'
        ]);

        $city->update($request->all());

        Cache::forget('service_cities_active');

        return response()->json([
            'success' => true,
            'message' => 'City updated successfully',
            'data' => $city
        ]);
    }

    public function destroy($id)
    {
        $city = ServiceCity::findOrFail($id);
        $city->delete();

        Cache::forget('service_cities_active');

        return response()->json([
            'success' => true,
            'message' => 'City deleted successfully'
        ]);
    }
}
