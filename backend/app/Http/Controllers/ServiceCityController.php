<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;

use App\Models\ServiceCity;

class ServiceCityController extends Controller
{
    public function index()
    {
        $cities = ServiceCity::where('status', 'Active')->get();
        return response()->json([
            'success' => true,
            'data' => $cities
        ]);
    }
}
