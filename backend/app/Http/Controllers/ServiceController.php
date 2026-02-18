<?php

namespace App\Http\Controllers;

use App\Models\Service;
use Illuminate\Http\Request;

class ServiceController extends Controller
{
    /**
     * Fetch all services for the Admin (Read-Only)
     */
    public function index()
    {
        try {
            // We fetch the service and its related category and provider
            // Make sure these relationships exist in your Service.php model
            $services = Service::with(['category', 'provider'])->get();

            return response()->json([
                'success' => true,
                'data' => $services
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Error fetching services: ' . $e->getMessage()
            ], 500);
        }
    }
}