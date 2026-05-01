<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use App\Models\Category;
use App\Models\ServiceProvider;
use App\Models\Service;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

class CustomerApiSeeder extends Seeder
{
    public function run()
    {
        // Clear existing data safely
        Schema::disableForeignKeyConstraints();
        Service::truncate();
        ServiceProvider::truncate();
        Schema::enableForeignKeyConstraints();

        // Create sample providers matching the actual table structure
        $providers = [
            [
                'providerID' => 1,
                'fullname' => 'John Smith',
                'phone' => '251911000001',
                'email' => 'john.smith@example.com',
                'password' => bcrypt('password'),
                'catagoryID' => 1,
                'profilePicture' => 'https://via.placeholder.com/150',
                'idPhoto' => 'https://via.placeholder.com/150',
                'status' => 'Active',
                'bio' => 'Professional plumbing services with 8+ years of experience',
                'walletBalance' => 0,
                'serviceRadiusKm' => 50,
                'service_city' => 'Bole',
                'current_latitude' => 9.03,
                'current_longitude' => 38.74,
                'is_online' => true,
                'completed_jobs' => 342,
                'total_earned' => 250000,
                'success_rate' => 95.50,
                'hourly_rate' => 500,
                'rating' => 4.8,
            ],
            [
                'providerID' => 2,
                'fullname' => 'Michael Johnson',
                'phone' => '251911000002',
                'email' => 'michael.johnson@example.com',
                'password' => bcrypt('password'),
                'catagoryID' => 2,
                'profilePicture' => 'https://via.placeholder.com/150',
                'idPhoto' => 'https://via.placeholder.com/150',
                'status' => 'Active',
                'bio' => 'Professional cleaning services for homes and offices',
                'walletBalance' => 0,
                'serviceRadiusKm' => 50,
                'service_city' => 'Kazanchis',
                'current_latitude' => 9.05,
                'current_longitude' => 38.76,
                'is_online' => true,
                'completed_jobs' => 256,
                'total_earned' => 320000,
                'success_rate' => 98.20,
                'hourly_rate' => 800,
                'rating' => 4.9,
            ],
            [
                'providerID' => 3,
                'fullname' => 'Sarah Williams',
                'phone' => '251911000003',
                'email' => 'sarah.williams@example.com',
                'password' => bcrypt('password'),
                'catagoryID' => 3,
                'profilePicture' => 'https://via.placeholder.com/150',
                'idPhoto' => 'https://via.placeholder.com/150',
                'status' => 'Active',
                'bio' => 'Certified electrician specializing in residential and commercial services',
                'walletBalance' => 0,
                'serviceRadiusKm' => 50,
                'service_city' => 'Mekelle',
                'current_latitude' => 9.02,
                'current_longitude' => 38.75,
                'is_online' => true,
                'completed_jobs' => 423,
                'total_earned' => 180000,
                'success_rate' => 92.80,
                'hourly_rate' => 300,
                'rating' => 4.7,
            ],
            [
                'providerID' => 4,
                'fullname' => 'David Brown',
                'phone' => '251911000004',
                'email' => 'david.brown@example.com',
                'password' => bcrypt('password'),
                'catagoryID' => 4,
                'profilePicture' => 'https://via.placeholder.com/150',
                'idPhoto' => 'https://via.placeholder.com/150',
                'status' => 'Active',
                'bio' => 'Professional internet and TV setup services',
                'walletBalance' => 0,
                'serviceRadiusKm' => 50,
                'service_city' => 'Piassa',
                'current_latitude' => 9.04,
                'current_longitude' => 38.73,
                'is_online' => false,
                'completed_jobs' => 189,
                'total_earned' => 280000,
                'success_rate' => 89.60,
                'hourly_rate' => 1000,
                'rating' => 4.6,
            ],
            [
                'providerID' => 5,
                'fullname' => 'Robert Davis',
                'phone' => '251911000005',
                'email' => 'robert.davis@example.com',
                'password' => bcrypt('password'),
                'catagoryID' => 5,
                'profilePicture' => 'https://via.placeholder.com/150',
                'idPhoto' => 'https://via.placeholder.com/150',
                'status' => 'Active',
                'bio' => 'Interior and exterior painting and finishing',
                'walletBalance' => 0,
                'serviceRadiusKm' => 50,
                'service_city' => 'CMC',
                'current_latitude' => 9.06,
                'current_longitude' => 38.77,
                'is_online' => true,
                'completed_jobs' => 267,
                'total_earned' => 350000,
                'success_rate' => 94.20,
                'hourly_rate' => 1500,
                'rating' => 4.5,
            ],
        ];

        foreach ($providers as $data) {
            // Using forceCreate to allow setting the primary key providerID
            $provider = ServiceProvider::forceCreate($data);
            
            $category = Category::find($data['catagoryID']);
            $categoryName = $category ? $category->name : 'Service';

            // Add a default service for each provider
            Service::create([
                'providerID' => $provider->providerID,
                'catagoryID' => $data['catagoryID'],
                'title' => 'General ' . $categoryName,
                'description' => 'Professional ' . strtolower($categoryName) . ' services.',
                'estimatedPrice' => $data['hourly_rate'] * 2,
                'hourly_rate' => $data['hourly_rate'],
            ]);
        }

        echo "Sample data seeded successfully!\n";
        echo "Providers: " . count($providers) . "\n";
        echo "Services: " . count($providers) . "\n";
    }
}
