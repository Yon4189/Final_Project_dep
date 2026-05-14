<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use App\Models\Admin;
use Illuminate\Support\Facades\Hash;

class AdminSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        Admin::updateOrCreate(
            ['email' => 'yositilahun21@gmail.com'],
            [
                'fullname' => 'Yoseph Tilahun',
                'phone' => '251911000000',
                'password' => 'Abe1' // The model accessor will hash this
            ]
        );

        Admin::updateOrCreate(
            ['email' => 'admin@hbservicefinder.app'],
            [
                'fullname' => 'System Admin',
                'phone' => '251900000000',
                'password' => 'HBAdmin2026!' 
            ]
        );
    }
}
