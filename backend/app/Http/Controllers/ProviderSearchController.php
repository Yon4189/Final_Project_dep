<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use App\Models\ServiceProvider;

class ProviderSearchController extends Controller
{
    public function search(Request $request)
    {
        $query = ServiceProvider::query();

        // Only verified providers
        $query->where('status', 'approved');

        // Filter by name (partial match)
        if ($request->has('name')) {
            $query->where('fullname', 'LIKE', '%' . $request->name . '%');
        }

        // Filter by category (partial match)
        if ($request->has('category')) {
            $query->where('category', 'LIKE', '%' . $request->category . '%');
        }

        // Filter by city
        if ($request->has('city')) {
            $query->where('service_city', $request->city);
        }

        // Filter by estimated price
        if ($request->has('min_price')) {
            $query->where('estimatedPrice', '>=', $request->min_price);
        }

        if ($request->has('max_price')) {
            $query->where('estimatedPrice', '<=', $request->max_price);
        }

        // Order by rating descending
        $query->orderBy('rating', 'desc');

        // Limit to 10 results
        $providers = $query->take(10)->get();

        return response()->json([
            'success' => true,
            'data' => $providers
        ]);
    }

    // what this does:
    /*
    customer can search by name, catagory, city, price
    only verified user appear
    limited to 10 results
    
    
    */
}