<?php

namespace App\Http\Controllers;

use App\Models\CustomerAddress;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Validator;
use Illuminate\Support\Facades\Log;

class AddressController extends Controller
{
    /**
     * Get all addresses for authenticated customer
     */
    public function index(Request $request)
    {
        $customer = auth()->guard('customer')->user();
        
        if (!$customer) {
            return response()->json(['success' => false, 'message' => 'Unauthorized'], 401);
        }
        
        $addresses = CustomerAddress::where('customerID', $customer->customerID)
            ->orderBy('is_default', 'desc')
            ->orderBy('created_at', 'desc')
            ->get();
            
        return response()->json([
            'success' => true,
            'data' => $addresses
        ]);
    }

    /**
     * Get single address
     */
    public function show($addressID)
    {
        $customer = auth()->guard('customer')->user();
        
        if (!$customer) {
            return response()->json(['success' => false, 'message' => 'Unauthorized'], 401);
        }
        
        $address = CustomerAddress::where('addressID', $addressID)
            ->where('customerID', $customer->customerID)
            ->first();
            
        if (!$address) {
            return response()->json([
                'success' => false,
                'message' => 'Address not found'
            ], 404);
        }
        
        return response()->json([
            'success' => true,
            'data' => $address
        ]);
    }

    /**
     * Save new address
     */
    public function store(Request $request)
    {
        $customer = auth()->guard('customer')->user();
        
        if (!$customer) {
            return response()->json(['success' => false, 'message' => 'Unauthorized'], 401);
        }
        
        // Check address count limit (maximum 5 addresses per customer)
        $addressCount = CustomerAddress::where('customerID', $customer->customerID)->count();
        if ($addressCount >= 5) {
            return response()->json([
                'success' => false,
                'message' => 'You can only save up to 5 addresses. Please delete an existing address first.'
            ], 422);
        }
        
        $validator = Validator::make($request->all(), [
            'full_address' => 'required|string',
            'latitude' => 'required|numeric',
            'longitude' => 'required|numeric',
            'label' => 'required|in:home,office,other',
            'custom_label' => 'required_if:label,other|string|nullable',
            'place_id' => 'nullable|string',
            'is_default' => 'boolean'
        ]);

        if ($validator->fails()) {
            return response()->json(['success' => false, 'errors' => $validator->errors()], 422);
        }

        // If setting as default, remove default from other addresses
        if ($request->is_default) {
            CustomerAddress::where('customerID', $customer->customerID)
                ->update(['is_default' => false]);
        }

        $address = CustomerAddress::create([
            'customerID' => $customer->customerID,
            'full_address' => $request->full_address,
            'latitude' => $request->latitude,
            'longitude' => $request->longitude,
            'label' => $request->label,
            'custom_label' => $request->custom_label,
            'place_id' => $request->place_id,
            'is_default' => $request->is_default ?? false
        ]);

        return response()->json([
            'success' => true,
            'message' => 'Address saved successfully',
            'data' => $address
        ], 201);
    }

    /**
     * Update address
     */
    public function update(Request $request, $addressID)
    {
        $customer = auth()->guard('customer')->user();
        
        if (!$customer) {
            return response()->json(['success' => false, 'message' => 'Unauthorized'], 401);
        }
        
        $address = CustomerAddress::where('addressID', $addressID)
            ->where('customerID', $customer->customerID)
            ->first();
            
        if (!$address) {
            return response()->json([
                'success' => false,
                'message' => 'Address not found'
            ], 404);
        }
        
        $validator = Validator::make($request->all(), [
            'full_address' => 'sometimes|string',
            'latitude' => 'sometimes|numeric',
            'longitude' => 'sometimes|numeric',
            'label' => 'sometimes|in:home,office,other',
            'custom_label' => 'required_if:label,other|string|nullable',
            'place_id' => 'nullable|string',
            'is_default' => 'boolean'
        ]);

        if ($validator->fails()) {
            return response()->json(['success' => false, 'errors' => $validator->errors()], 422);
        }

        // If setting as default, remove default from other addresses
        if ($request->has('is_default') && $request->is_default) {
            CustomerAddress::where('customerID', $customer->customerID)
                ->where('addressID', '!=', $addressID)
                ->update(['is_default' => false]);
        }

        $address->update($request->all());

        return response()->json([
            'success' => true,
            'message' => 'Address updated successfully',
            'data' => $address
        ]);
    }

    /**
     * Delete address
     */
    public function destroy($addressID)
    {
        $customer = auth()->guard('customer')->user();
        
        if (!$customer) {
            return response()->json(['success' => false, 'message' => 'Unauthorized'], 401);
        }
        
        $address = CustomerAddress::where('addressID', $addressID)
            ->where('customerID', $customer->customerID)
            ->first();
            
        if (!$address) {
            return response()->json([
                'success' => false,
                'message' => 'Address not found'
            ], 404);
        }

        // Check if this is default address
        $wasDefault = $address->is_default;
        
        $address->delete();

        // If deleted address was default, set another as default
        if ($wasDefault) {
            $newDefault = CustomerAddress::where('customerID', $customer->customerID)
                ->first();
            if ($newDefault) {
                $newDefault->update(['is_default' => true]);
            }
        }

        return response()->json([
            'success' => true,
            'message' => 'Address deleted successfully'
        ]);
    }

    /**
     * Set address as default
     */
    public function setDefault($addressID)
    {
        $customer = auth()->guard('customer')->user();
        
        if (!$customer) {
            return response()->json(['success' => false, 'message' => 'Unauthorized'], 401);
        }
        
        $address = CustomerAddress::where('addressID', $addressID)
            ->where('customerID', $customer->customerID)
            ->first();
            
        if (!$address) {
            return response()->json([
                'success' => false,
                'message' => 'Address not found'
            ], 404);
        }

        // Remove default from all other addresses
        CustomerAddress::where('customerID', $customer->customerID)
            ->update(['is_default' => false]);

        // Set this as default
        $address->update(['is_default' => true]);

        return response()->json([
            'success' => true,
            'message' => 'Default address updated'
        ]);
    }
}