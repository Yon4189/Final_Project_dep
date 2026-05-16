<?php

namespace Database\Seeders;

use App\Models\User;
use Illuminate\Database\Console\Seeds\WithoutModelEvents;
use Illuminate\Database\Seeder;

class DatabaseSeeder extends Seeder
{
    use WithoutModelEvents;

    /**
     * Seed the application's database.
     */
    public function run(): void
    {
        $this->call([
            ServiceCitySeeder::class,
            CategorySeeder::class,
            AdminSeeder::class,
            SystemSettingSeeder::class,
            CustomerApiSeeder::class,
            // CustomerSeeder::class, // Missing for some reason
        ]);
    }
}
