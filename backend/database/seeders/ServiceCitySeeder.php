<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;

class ServiceCitySeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        $cities = [
            ['name' => 'Addis Ababa', 'status' => 'Active', 'created_at' => now(), 'updated_at' => now()],
            ['name' => 'Dire Dawa', 'status' => 'Active', 'created_at' => now(), 'updated_at' => now()],
            ['name' => 'Bahir Dar', 'status' => 'Active', 'created_at' => now(), 'updated_at' => now()],
            ['name' => 'Mekelle', 'status' => 'Active', 'created_at' => now(), 'updated_at' => now()],
            ['name' => 'Gondar', 'status' => 'Active', 'created_at' => now(), 'updated_at' => now()],
            ['name' => 'Adama', 'status' => 'Active', 'created_at' => now(), 'updated_at' => now()],
            ['name' => 'Hawassa', 'status' => 'Active', 'created_at' => now(), 'updated_at' => now()],
            ['name' => 'Jimma', 'status' => 'Active', 'created_at' => now(), 'updated_at' => now()],
            ['name' => 'Dessie', 'status' => 'Active', 'created_at' => now(), 'updated_at' => now()],
            ['name' => 'Jijiga', 'status' => 'Active', 'created_at' => now(), 'updated_at' => now()],
        ];

        foreach ($cities as $city) {
            DB::table('service_cities')->updateOrInsert(
                ['name' => $city['name']],
                $city
            );
        }
    }
}
