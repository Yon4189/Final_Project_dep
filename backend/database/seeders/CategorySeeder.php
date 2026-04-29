<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;

class CategorySeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        $categories = [
            ['catagoryID' => 1, 'name' => 'Plumbing', 'icon' => '🔧', 'description' => 'Professional plumbing services, leak repairs, and installations.'],
            ['catagoryID' => 2, 'name' => 'Home Cleaning', 'icon' => '🧹', 'description' => 'Deep cleaning for homes and offices.'],
            ['catagoryID' => 3, 'name' => 'Electrical Services', 'icon' => '⚡', 'description' => 'Electrical installation, wiring, and repair services.'],
            ['catagoryID' => 4, 'name' => 'Internet & TV Setup', 'icon' => '📡', 'description' => 'Setup and troubleshooting for internet, Wi-Fi, and TV systems.'],
            ['catagoryID' => 5, 'name' => 'Painting & Finishing', 'icon' => '🎨', 'description' => 'Interior and exterior painting and finishing services.'],
            ['catagoryID' => 6, 'name' => 'Carpentry', 'icon' => '🪚', 'description' => 'Furniture repair, custom woodwork, and cabinetry.'],
            ['catagoryID' => 7, 'name' => 'AC & Home Appliances', 'icon' => '❄️', 'description' => 'Repair and maintenance for AC, refrigerators, and other appliances.'],
            ['catagoryID' => 8, 'name' => 'Home Maintenance', 'icon' => '🏠', 'description' => 'General handyman services and home repairs.'],
            ['catagoryID' => 9, 'name' => 'Gardening', 'icon' => '🌱', 'description' => 'Lawn care, landscaping, and garden maintenance.'],
            ['catagoryID' => 10, 'name' => 'Moving Services', 'icon' => '📦', 'description' => 'Professional packing and moving services.'],
            ['catagoryID' => 11, 'name' => 'Beauty & Salon', 'icon' => '💄', 'description' => 'Hairdressing, makeup, and spa services at home.'],
            ['catagoryID' => 12, 'name' => 'Tutoring', 'icon' => '📚', 'description' => 'Private academic tutoring and skill development.'],
        ];

        foreach ($categories as $category) {
            DB::table('catagories')->updateOrInsert(
                ['catagoryID' => $category['catagoryID']],
                $category
            );
        }
    }
}
