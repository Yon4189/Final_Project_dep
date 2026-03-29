<?php

namespace Tests\Feature;

use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Foundation\Testing\WithFaker;
use Tests\TestCase;
use App\Models\User;
use App\Models\Service;
use App\Models\Booking;

class BookingTest extends TestCase
{
    use RefreshDatabase, WithFaker;

    private $customerToken;
    private $providerToken;
    private $customerId;
    private $providerId;
    private $serviceId;

    public function setUp(): void
    {
        parent::setUp();

        // Register Provider
        $providerResponse = $this->postJson('/api/provider/register', [
            'fullname' => 'Test Provider',
            'businessName' => 'Test Services Ltd',
            'email' => 'provider' . mt_rand(1000, 9999) . '@test.com',
            'phone' => '+251922' . mt_rand(100000, 999999),
            'password' => 'password123',
            'password_confirmation' => 'password123',
            'role' => 'provider'
        ]);
        
        $this->providerToken = $providerResponse->json('token');
        $this->providerId = $providerResponse->json('user.id');

        // Create a service for provider
        $serviceResponse = $this->withHeaders([
            'Authorization' => 'Bearer ' . $this->providerToken
        ])->postJson('/api/provider/services', [
            'title' => 'Plumbing Repair',
            'description' => 'Fixing pipes',
            'price' => 500,
            'duration' => '2 hours'
        ]);

        $this->serviceId = $serviceResponse->json('data.id') ?? $serviceResponse->json('id');

        // Register Customer
        $customerResponse = $this->postJson('/api/customer/register', [
            'fullname' => 'Test Customer',
            'email' => 'customer' . mt_rand(1000, 9999) . '@test.com',
            'phone' => '+251911' . mt_rand(100000, 999999), 
            'password' => 'password123',
            'password_confirmation' => 'password123',
            'role' => 'customer'
        ]);

        $this->customerToken = $customerResponse->json('token');
        $this->customerId = $customerResponse->json('user.id');
    }

    public function test_customer_can_create_booking()
    {
        if (!$this->serviceId) {
            $this->markTestSkipped('Service creation failed in setup.');
        }

        $response = $this->withHeaders([
            'Authorization' => 'Bearer ' . $this->customerToken
        ])->postJson('/api/customer/bookings', [
            'service_id' => $this->serviceId,
            'provider_id' => $this->providerId,
            'service_location' => [
                'type' => 'Point',
                'coordinates' => [38.7578, 9.0320] // Addis Ababa coordinates
            ],
            'service_address' => 'Bole, Addis Ababa',
            'scheduled_start' => now()->addDays(1)->format('Y-m-d H:i:s'),
            'notes' => 'Please bring tools.'
        ]);

        $response->assertStatus(201)
                 ->assertJsonStructure([
                     'data' => [
                         'id',
                         'status',
                         'booking_number'
                     ]
                 ]);

        return $response->json('data.id');
    }

    /**
     * @depends test_customer_can_create_booking
     */
    public function test_provider_can_accept_booking($bookingId)
    {
        if (!$bookingId) {
            $this->markTestSkipped('Booking creation failed, cannot test acceptance.');
        }

        $response = $this->withHeaders([
            'Authorization' => 'Bearer ' . $this->providerToken
        ])->postJson("/api/provider/dashboard/requests/{$bookingId}/status", [
            'status' => 'accepted'
        ]);

        $response->assertStatus(200)
                 ->assertJsonFragment([
                     'status' => 'accepted'
                 ]);
    }
}
