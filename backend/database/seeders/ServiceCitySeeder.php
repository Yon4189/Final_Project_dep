<?php

namespace Database\Seeders;

use Illuminate\Database\Console\Seeds\WithoutModelEvents;
use Illuminate\Database\Seeder;

class ServiceCitySeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        $cities = [
            'Addis Ababa',
            'Bahirdar',
            'Jimma',
            'Adama',
            'Hawassa',
            'Mekelle',
            'Gondar',
            'Dire Dawa',
            'Adwa',
            'Axum',
            'Lalibela',
            'Debre Markos',
            'Debre Birhan',
            'Shashamane',
            'Arba Minch',
            'Jijiga',
            'Harar',
            'Nekemte',
            'Assosa',
            'Gambela',
        ];

        foreach ($cities as $city) {
            \App\Models\ServiceCity::updateOrCreate(
                ['name' => $city],
                ['status' => 'Active']
            );
        }
    }
}
