<?php

namespace App\Http\Controllers;

use App\Models\ServiceProvider;
use App\Models\Service;
use App\Models\Transaction;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;

class ProviderDashboardController extends Controller
{
    /**
     * Get statistics for the authenticated provider.
     */
    public function getStats(Request $request)
    {
        try {
            // NOTE: In a real app, we'd use auth()->id()
            // For now, let's assume providerID is passed or we pick one for testing
            $providerID = $request->query('providerID');

            if (!$providerID) {
                return response()->json([
                    'success' => false,
                    'message' => 'Provider ID is required for demo'
                ], 400);
            }

            $provider = ServiceProvider::find($providerID);
            if (!$provider) {
                return response()->json(['success' => false, 'message' => 'Provider not found'], 404);
            }

            // Mocking some data for the dashboard stats
            return response()->json([
                'success' => true,
                'data' => [
                    'pendingRequests' => 5,
                    'todayJobs' => 2,
                    'weeklyEarnings' => 1250.50,
                    'rating' => $provider->rating ?? 4.8,
                    'completionRate' => 95,
                    'responseRate' => 98
                ]
            ]);
        } catch (\Exception $e) {
            Log::error("Provider Dashboard Stats Error: " . $e->getMessage());
            return response()->json([
                'success' => false,
                'message' => 'Failed to fetch dashboard stats'
            ], 500);
        }
    }

    /**
     * Get today's schedule for the provider.
     */
    public function getTodaySchedule(Request $request)
    {
        // Mocking schedule data
        return response()->json([
            'success' => true,
            'data' => [
                [
                    'id' => '1',
                    'customerName' => 'John Doe',
                    'serviceName' => 'Plumbing Repair',
                    'status' => 'confirmed',
                    'scheduledDate' => date('Y-m-d'),
                    'scheduledTime' => '10:00 AM',
                    'customerAddress' => '123 Main St, Addis Ababa',
                    'estimatedPrice' => 500,
                    'customerImage' => 'https://via.placeholder.com/40'
                ],
                [
                    'id' => '2',
                    'customerName' => 'Jane Smith',
                    'serviceName' => 'Leak Fix',
                    'status' => 'confirmed',
                    'scheduledDate' => date('Y-m-d'),
                    'scheduledTime' => '02:00 PM',
                    'customerAddress' => '456 Bole Rd, Addis Ababa',
                    'estimatedPrice' => 350,
                    'customerImage' => 'https://via.placeholder.com/40'
                ]
            ]
        ]);
    }

    /**
     * Get earnings summary for the provider.
     */
    public function getEarningsSummary(Request $request)
    {
        return response()->json([
            'success' => true,
            'data' => [
                'totalEarnings' => 15750.00,
                'thisMonth' => 4500.00,
                'thisWeek' => 1250.50,
                'lastMonth' => 4200.00,
                'availableForWithdrawal' => 2800.00,
                'pendingClearance' => 1200.00,
                'completedJobs' => 45
            ]
        ]);
    }

    /**
     * Get service requests for the provider.
     */
    public function getRequests(Request $request)
    {
        $status = $request->query('status');
        
        // Mocking some request data
        $requests = [
            [
                'id' => '101',
                'customerName' => 'Alice Walker',
                'serviceName' => 'Emergency Pipe Leak',
                'status' => 'pending',
                'scheduledDate' => date('Y-m-d', strtotime('+1 day')),
                'scheduledTime' => '09:00 AM',
                'description' => 'Pipe burst in the kitchen, needs urgent fix.',
                'address' => 'Bole Sub-city, Addis Ababa'
            ],
            [
                'id' => '102',
                'customerName' => 'Bob Marley',
                'serviceName' => 'Faucet Installation',
                'status' => 'pending',
                'scheduledDate' => date('Y-m-d', strtotime('+2 days')),
                'scheduledTime' => '11:00 AM',
                'description' => 'Replacing old kitchen faucet with a new one.',
                'address' => 'Piassa, Addis Ababa'
            ]
        ];

        if ($status) {
            $requests = array_filter($requests, function($req) use ($status) {
                return $req['status'] === $status;
            });
        }

        return response()->json([
            'success' => true,
            'data' => array_values($requests)
        ]);
    }

    /**
     * Get reviews for the provider.
     */
    public function getReviews(Request $request)
    {
        return response()->json([
            'success' => true,
            'data' => [
                'reviews' => [
                    [
                        'id' => 'r1',
                        'customerName' => 'Sarah Connor',
                        'rating' => 5,
                        'comment' => 'Great service! Very professional.',
                        'date' => '2024-02-20'
                    ],
                    [
                        'id' => 'r2',
                        'customerName' => 'John Wick',
                        'rating' => 4,
                        'comment' => 'Good job, arrived on time.',
                        'date' => '2024-02-18'
                    ]
                ],
                'averageRating' => 4.5,
                'total' => 2
            ]
        ]);
    }
}
