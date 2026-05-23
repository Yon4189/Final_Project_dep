<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\DB;

class AdminSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        DB::table('admins')->insert([
            'name' => 'Admin',
            'email' => 'admin@gmail.com',
            'password' => Hash::make('admin12345'),
            'phone' => '+251912345678',
            'role' => 'super_admin',
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        echo "Admin user created successfully!\n";
        echo "Email: admin@gmail.com\n";
        echo "Password: admin12345\n";
        echo "⚠️  IMPORTANT: Change this password after first login!\n";
    }
}
