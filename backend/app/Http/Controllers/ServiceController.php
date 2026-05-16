<?php

namespace App\Http\Controllers;

use App\Models\Service;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Validator;
use Illuminate\Support\Facades\Log;

class ServiceController extends Controller
{
    /**
     * Get all services for the authenticated provider
     */
    public function index(Request $request)
    {
        try {
            $provider = $request->user(); // get authenticated provider
            
            $services = Service::where('providerID', $provider->providerID)
                ->with('category')
                ->get();

            return response()->json([
                'success' => true,
                'data' => $services
            ]);
        } catch (\Exception $e) {
            Log::error('Error fetching provider services: ' . $e->getMessage());
            return response()->json([
                'success' => false,
                'message' => 'Failed to fetch services'
            ], 500);
        }
    }

    /**
     * Store a new service for the provider
     */
    public function store(Request $request)
    {
        $validator = Validator::make($request->all(), [
            'catagoryID' => 'required|exists:catagories,catagoryID',
            'title' => 'required|string|max:255',
            'description' => 'nullable|string',
            'estimatedPrice' => 'required|numeric|min:0'
        ]);

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'message' => 'Validation errors',
                'errors' => $validator->errors()
            ], 422);
        }

        try {
            $provider = $request->user(); // get authenticated provider

            $service = Service::create([
                'providerID' => $provider->providerID,
                'catagoryID' => $request->catagoryID,
                'title' => $request->title,
                'description' => $request->description,
                'estimatedPrice' => $request->estimatedPrice
            ]);

            return response()->json([
                'success' => true,
                'message' => 'Service created successfully',
                'data' => $service->load('category')
            ], 201);

        } catch (\Exception $e) {
            Log::error('Error creating service: ' . $e->getMessage());
            return response()->json([
                'success' => false,
                'message' => 'Failed to create service'
            ], 500);
        }
    }

    /**
     * Update a service
     */
    public function update(Request $request, $id)
    {
        $validator = Validator::make($request->all(), [
            'catagoryID' => 'sometimes|exists:catagories,catagoryID',
            'title' => 'sometimes|string|max:255',
            'description' => 'nullable|string',
            'estimatedPrice' => 'sometimes|numeric|min:0'
        ]);

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'message' => 'Validation errors',
                'errors' => $validator->errors()
            ], 422);
        }

        try {
            $provider = $request->user();
            
            $service = Service::where('serviceID', $id)
                ->where('providerID', $provider->providerID)
                ->first();

            if (!$service) {
                return response()->json([
                    'success' => false,
                    'message' => 'Service not found'
                ], 404);
            }

            $service->update($request->only([
                'catagoryID', 'title', 'description', 'estimatedPrice'
            ]));

            return response()->json([
                'success' => true,
                'message' => 'Service updated successfully',
                'data' => $service->load('category')
            ]);

        } catch (\Exception $e) {
            Log::error('Error updating service: ' . $e->getMessage());
            return response()->json([
                'success' => false,
                'message' => 'Failed to update service'
            ], 500);
        }
    }

    /**
     * Delete a service
     */
    public function destroy(Request $request, $id)
    {
        try {
            $provider = $request->user();
            
            $service = Service::where('serviceID', $id)
                ->where('providerID', $provider->providerID)
                ->first();

            if (!$service) {
                return response()->json([
                    'success' => false,
                    'message' => 'Service not found'
                ], 404);
            }

            $service->delete();

            return response()->json([
                'success' => true,
                'message' => 'Service deleted successfully'
            ]);

        } catch (\Exception $e) {
            Log::error('Error deleting service: ' . $e->getMessage());
            return response()->json([
                'success' => false,
                'message' => 'Failed to delete service'
            ], 500);
        }
    }
}