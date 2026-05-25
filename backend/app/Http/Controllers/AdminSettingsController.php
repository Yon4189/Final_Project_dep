<?php

namespace App\Http\Controllers;

use App\Models\SystemSetting;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;

class AdminSettingsController extends Controller
{
    /**
     * Get deposit percentage setting
     * 
     * @return \Illuminate\Http\JsonResponse
     */
    public function getDepositPercentage()
    {
        try {
            $depositPercentage = SystemSetting::get('deposit_percentage', 20);
            
            $setting = SystemSetting::where('setting_key', 'deposit_percentage')->first();
            
            return response()->json([
                'success' => true,
                'data' => [
                    'deposit_percentage' => $depositPercentage,
                    'updated_at' => $setting ? $setting->updated_at : null
                ]
            ]);
            
        } catch (\Exception $e) {
            Log::error('Failed to get deposit percentage', [
                'error' => $e->getMessage()
            ]);
            
            return response()->json([
                'success' => false,
                'message' => 'Failed to get deposit percentage'
            ], 500);
        }
    }

    /**
     * Update deposit percentage setting
     * 
     * @param Request $request
     * @return \Illuminate\Http\JsonResponse
     */
    public function updateDepositPercentage(Request $request)
    {
        $request->validate([
            'percentage' => 'required|integer|min:1|max:99'
        ]);
        
        try {
            SystemSetting::set(
                'deposit_percentage',
                $request->percentage,
                'integer',
                'Percentage of agreed price to be paid as deposit (1-99)'
            );
            
            $setting = SystemSetting::where('setting_key', 'deposit_percentage')->first();
            
            Log::info('Deposit percentage updated', [
                'old_value' => $setting->getOriginal('setting_value'),
                'new_value' => $request->percentage,
                'updated_by' => auth()->guard('admin')->id()
            ]);
            
            return response()->json([
                'success' => true,
                'message' => 'Deposit percentage updated successfully',
                'data' => [
                    'deposit_percentage' => (int) $request->percentage,
                    'updated_at' => $setting->updated_at
                ]
            ]);
            
        } catch (\Exception $e) {
            Log::error('Failed to update deposit percentage', [
                'error' => $e->getMessage()
            ]);
            
            return response()->json([
                'success' => false,
                'message' => 'Failed to update deposit percentage'
            ], 500);
        }
    }
}
