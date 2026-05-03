<?php

namespace App\Services;

use App\Models\Withdrawal;
use App\Models\Wallet;
use App\Models\SystemSetting;
use Carbon\Carbon;

class ComplianceChecker
{
    /**
     * Check compliance for a withdrawal request
     * 
     * @param Withdrawal $withdrawal
     * @param Wallet $wallet
     * @return array
     */
    public function check(Withdrawal $withdrawal, Wallet $wallet)
    {
        $violations = [];
        $checks = [];
        
        // 1. Minimum threshold check (50 ETB)
        $minThreshold = 50;
        $checks['minimum_threshold'] = [
            'required' => $minThreshold,
            'actual' => $withdrawal->amount,
            'passed' => $withdrawal->amount >= $minThreshold
        ];
        
        if ($withdrawal->amount < $minThreshold) {
            $violations[] = [
                'type' => 'below_minimum',
                'severity' => 'critical',
                'message' => "Withdrawal amount ({$withdrawal->amount} ETB) is below minimum threshold ({$minThreshold} ETB)"
            ];
        }
        
        // 2. Maximum per-request limit check (50,000 ETB)
        $maxPerRequest = 50000;
        $checks['maximum_per_request'] = [
            'limit' => $maxPerRequest,
            'actual' => $withdrawal->amount,
            'passed' => $withdrawal->amount <= $maxPerRequest
        ];
        
        if ($withdrawal->amount > $maxPerRequest) {
            $violations[] = [
                'type' => 'exceeds_maximum',
                'severity' => 'critical',
                'message' => "Withdrawal amount ({$withdrawal->amount} ETB) exceeds maximum per-request limit ({$maxPerRequest} ETB)"
            ];
        }
        
        // 3. Daily withdrawal limit check (100,000 ETB per provider per day)
        $dailyLimit = SystemSetting::get('max_daily_withdrawal', 100000);
        $todayWithdrawn = $this->calculateTodayWithdrawals($withdrawal->providerID);
        $totalWithToday = $todayWithdrawn + $withdrawal->amount;
        
        $checks['daily_limit'] = [
            'limit' => $dailyLimit,
            'already_withdrawn_today' => $todayWithdrawn,
            'requested' => $withdrawal->amount,
            'total_if_approved' => $totalWithToday,
            'passed' => $totalWithToday <= $dailyLimit
        ];
        
        if ($totalWithToday > $dailyLimit) {
            $violations[] = [
                'type' => 'daily_limit_exceeded',
                'severity' => 'high',
                'message' => "Daily withdrawal limit would be exceeded. Already withdrawn: {$todayWithdrawn} ETB today. Limit: {$dailyLimit} ETB"
            ];
        }
        
        // 4. Sufficient balance check
        $checks['sufficient_balance'] = [
            'available_balance' => $wallet->available_balance,
            'requested' => $withdrawal->amount,
            'passed' => $wallet->available_balance >= $withdrawal->amount
        ];
        
        if ($wallet->available_balance < $withdrawal->amount) {
            $violations[] = [
                'type' => 'insufficient_balance',
                'severity' => 'critical',
                'message' => "Insufficient balance. Available: {$wallet->available_balance} ETB, Requested: {$withdrawal->amount} ETB"
            ];
        }
        
        // 5. Existing pending withdrawal check
        $existingPending = $this->checkExistingPendingWithdrawal($withdrawal->providerID, $withdrawal->withdrawalID);
        $checks['existing_pending'] = [
            'has_pending' => $existingPending,
            'passed' => !$existingPending
        ];
        
        if ($existingPending) {
            $violations[] = [
                'type' => 'existing_pending',
                'severity' => 'info',
                'message' => "Provider has another pending withdrawal request"
            ];
        }
        
        return [
            'checks' => $checks,
            'violations' => $violations,
            'compliant' => empty(array_filter($violations, function($v) {
                return $v['severity'] === 'critical' || $v['severity'] === 'high';
            }))
        ];
    }
    
    /**
     * Calculate total withdrawals for today
     */
    private function calculateTodayWithdrawals($providerID)
    {
        $today = Carbon::now()->startOfDay();
        
        return Withdrawal::where('providerID', $providerID)
            ->whereDate('created_at', $today)
            ->whereIn('status', ['pending', 'approved', 'processing', 'completed'])
            ->sum('amount');
    }
    
    /**
     * Check if provider has another pending withdrawal
     */
    private function checkExistingPendingWithdrawal($providerID, $currentWithdrawalID)
    {
        return Withdrawal::where('providerID', $providerID)
            ->where('withdrawalID', '!=', $currentWithdrawalID)
            ->where('status', 'pending')
            ->exists();
    }
}
