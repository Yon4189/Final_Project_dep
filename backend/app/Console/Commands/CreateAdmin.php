<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Validator;

class CreateAdmin extends Command
{
    /**
     * The name and signature of the console command.
     *
     * @var string
     */
    protected $signature = 'admin:create 
                            {name : The admin name}
                            {email : The admin email}
                            {password : The admin password}
                            {--phone= : The admin phone number}
                            {--role=admin : The admin role (admin or super_admin)}';

    /**
     * The console command description.
     *
     * @var string
     */
    protected $description = 'Create a new admin user with encrypted password';

    /**
     * Execute the console command.
     */
    public function handle()
    {
        $name = $this->argument('name');
        $email = $this->argument('email');
        $password = $this->argument('password');
        $phone = $this->option('phone') ?? '+251900000000';
        $role = $this->option('role');

        // Validate email
        $validator = Validator::make(['email' => $email], [
            'email' => 'required|email|unique:admins,email'
        ]);

        if ($validator->fails()) {
            $this->error('Validation failed:');
            foreach ($validator->errors()->all() as $error) {
                $this->error($error);
            }
            return 1;
        }

        // Create admin
        try {
            DB::table('admins')->insert([
                'name' => $name,
                'email' => $email,
                'password' => Hash::make($password),
                'phone' => $phone,
                'role' => $role,
                'created_at' => now(),
                'updated_at' => now(),
            ]);

            $this->info('✅ Admin user created successfully!');
            $this->line('');
            $this->line('Login credentials:');
            $this->line("Email: {$email}");
            $this->line("Password: {$password}");
            $this->line("Role: {$role}");
            $this->line('');
            $this->warn('⚠️  IMPORTANT: Store these credentials securely!');

            return 0;
        } catch (\Exception $e) {
            $this->error('Failed to create admin: ' . $e->getMessage());
            return 1;
        }
    }
}
