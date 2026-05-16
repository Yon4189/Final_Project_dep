<?php

namespace App\Services;

use App\Models\Customer;
use App\Services\NotificationService;
use Illuminate\Support\Facades\Log;

class AccountService
{
    protected $notificationService;

    public function __construct(NotificationService $notificationService)
    {
        $this->notificationService = $notificationService;
    }

    /**
     * Freeze customer account
     * 
     * @param int $customerId
     * @param string $reason
     * @return void
     */
    public function freezeCustomerAccount(int $customerId, string $reason): void
    {
        $customer = Customer::findOrFail($customerId);
        
        $customer->account_status = 'frozen';
        $customer->frozen_reason = $reason;
        $customer->frozen_at = now();
        $customer->save();
        
        Log::info('Customer account frozen', [
            'customer_id' => $customerId,
            'reason' => $reason
        ]);
        
        // Send notification to customer
        $this->notificationService->toCustomer(
            $customerId,
            'account_frozen',
            'Account Frozen',
            'Your account has been frozen. Reason: ' . $reason,
            [
                'reason' => $reason,
                'frozen_at' => now()->toISOString()
            ]
        );
        
        // Notify admins
        $this->notificationService->notifyAdminsAccountFrozen($customer, 'customer', $reason);
    }

    /**
     * Unfreeze customer account
     * 
     * @param int $customerId
     * @return void
     */
    public function unfreezeCustomerAccount(int $customerId): void
    {
        $customer = Customer::findOrFail($customerId);
        
        $customer->account_status = 'active';
        $customer->frozen_reason = null;
        $customer->frozen_at = null;
        $customer->save();
        
        Log::info('Customer account unfrozen', [
            'customer_id' => $customerId
        ]);
        
        // Send notification
        $this->notificationService->toCustomer(
            $customerId,
            'account_unfrozen',
            'Account Restored',
            'Your account has been restored and is now active.',
            [
                'unfrozen_at' => now()->toISOString()
            ]
        );
    }
}
