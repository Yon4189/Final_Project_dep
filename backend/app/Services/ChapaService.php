<?php

namespace App\Services;

use GuzzleHttp\Client;
use GuzzleHttp\Exception\RequestException;
use Illuminate\Support\Facades\Log;

class ChapaService
{
    protected $secretKey;
    protected $baseUrl;
    protected $client;

    public function __construct()
    {
        $this->secretKey = config('services.chapa.secret_key');
        $this->baseUrl = 'https://api.chapa.co/v1';
        $this->client = new Client([
            'base_uri' => $this->baseUrl,
            'timeout' => 30,
            'verify' => false, // For development only
        ]);
    }

    public function initializePayment(array $data)
    {
        Log::info('Chapa Request Debug', [
            'full_url' => 'https://api.chapa.co/v1/transaction/initialize',
            'secret_key_prefix' => substr($this->secretKey, 0, 15) . '...',
            'payload' => $data
        ]);

        

        try {
           $fullUrl = 'https://api.chapa.co/v1/transaction/initialize';
            $response = $this->client->post($fullUrl, [
                'headers' => [
                    'Authorization' => 'Bearer ' . $this->secretKey,
                    'Content-Type' => 'application/json',
                ],
                'json' => $data,
                'verify' => false
            ]);

            $body = json_decode($response->getBody(), true);

            return [
                'status' => 'success',
                'data' => $body
            ];

        } catch (RequestException $e) {
            $errorMessage = $e->getMessage();
            
            // Truncate to 255 characters to fit your column
            $truncatedMessage = substr($errorMessage, 0, 250);
            
            Log::error('Chapa initialization failed', [
                'error' => $errorMessage
            ]);
            
            return [
                'status' => 'error',
                'message' => $truncatedMessage  // Truncated version
            ];
            
        } catch (\Exception $e) {
            Log::error('Chapa exception: ' . $e->getMessage());
            return [
                'status' => 'error',
                'message' => 'Could not connect to payment gateway'
            ];
        }
    }

    public function verifyPayment($txRef)
    {
        try {
            $response = $this->client->get('transaction/verify/' . $txRef, [
                'headers' => [
                    'Authorization' => 'Bearer ' . $this->secretKey,
                ]
            ]);

            $body = json_decode($response->getBody(), true);

            return [
                'status' => 'success',
                'data' => $body
            ];

        } catch (RequestException $e) {
            Log::error('Chapa verification failed', [
                'error' => $e->getMessage()
            ]);
            
            return [
                'status' => 'error',
                'message' => 'Verification failed: ' . $e->getMessage()
            ];
        } catch (\Exception $e) {
            Log::error('Chapa verification exception: ' . $e->getMessage());
            return [
                'status' => 'error',
                'message' => 'Could not verify payment'
            ];
        }
    }

    public function verifySignature($payload, $signature)
    {
        try {
            $webhookSecret = config('services.chapa.webhook_secret');
            
            if (!$webhookSecret) {
                Log::warning('Chapa webhook secret not configured');
                return false;
            }

            $computedSignature = hash_hmac('sha256', $payload, $webhookSecret);
            
            return hash_equals($computedSignature, $signature);
            
        } catch (\Exception $e) {
            Log::error('Chapa signature verification error: ' . $e->getMessage());
            return false;
        }
    }
}