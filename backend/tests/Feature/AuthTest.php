<?php

namespace Tests\Feature;

use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Foundation\Testing\WithFaker;
use Tests\TestCase;
use App\Models\User;

class AuthTest extends TestCase
{
    use RefreshDatabase, WithFaker;

    public function test_customer_can_register()
    {
        $response = $this->postJson('/api/customer/register', [
            'fullname' => 'Test Customer',
            'email' => 'customer' . mt_rand(1000, 9999) . '@test.com',
            'phone' => '+251911' . mt_rand(100000, 999999), // e.g., +251911234567
            'password' => 'password123',
            'password_confirmation' => 'password123',
            'role' => 'customer'
        ]);

        $response->assertStatus(201)
                 ->assertJsonStructure([
                     'user' => ['id', 'fullname', 'email', 'role'],
                     'token'
                 ]);
    }

    public function test_provider_can_register()
    {
        $response = $this->postJson('/api/provider/register', [
            'fullname' => 'Test Provider',
            'businessName' => 'Test Services Ltd',
            'email' => 'provider' . mt_rand(1000, 9999) . '@test.com',
            'phone' => '+251922' . mt_rand(100000, 999999),
            'password' => 'password123',
            'password_confirmation' => 'password123',
            'role' => 'provider'
        ]);

        $response->assertStatus(201)
                 ->assertJsonStructure([
                     'user' => ['id', 'fullname', 'email', 'role', 'businessName'],
                     'token'
                 ]);
    }

    public function test_user_can_login()
    {
        $email = 'login' . mt_rand(1000, 9999) . '@test.com';
        
        // Register first
        $this->postJson('/api/customer/register', [
            'fullname' => 'Login Test',
            'email' => $email,
            'phone' => '+251933' . mt_rand(100000, 999999),
            'password' => 'password123',
            'password_confirmation' => 'password123',
            'role' => 'customer'
        ]);

        // Then login
        $response = $this->postJson('/api/customer/login', [
            'email' => $email,
            'password' => 'password123'
        ]);

        $response->assertStatus(200)
                 ->assertJsonStructure([
                     'user',
                     'token'
                 ]);
    }
}
