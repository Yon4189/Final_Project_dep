<?php

namespace App\Services;

use App\Models\ServiceProvider;
use App\Models\Withdrawal;
use App\Models\Booking;
use App\Models\Dispute;
use App\Models\Payment;
use Carbon\Carbon;

class RiskAnalyzer
{
    /**
     * Analyze risk indicators for a withdrawal request
     * 
     * @param Withdrawal $withdrawal
     * @param ServiceProvider $provider
     * @return array
     */
    public function analyze(Withdrawal $withdrawal, ServiceProvider $provider)
    {
        $warnings = [];
        $indicators = [];
        
        // 1. Account age check
        $accountAge = $this->calculateAccountAge($provider);
        $indicators['account_age_days'] = $accountAge;
        
        if ($accountAge < 30 && $withdrawal->amount > 5000) {
            $warnings[] = [
                'type' => 'account_age',
                'severity' => 'high',
                'message' => "New account (${accountAge} days) requesting large withdrawal (${withdrawal->amount} ETB)"
            ];
        }
        
        // 2. Withdrawal-to-earnings ratio
        $totalEarnings = $this->calculateTotalEarnings($provider);
        $indicators['total_earnings'] = $totalEarnings;
        
        if ($totalEarnings > 0) {
            $ratio = ($withdrawal->amount / $totalEarnings) * 100;
            $indicators['withdrawal_to_earnings_ratio'] = round($ratio, 2);
            
            if ($ratio > 90) {
                $warnings[] = [
                    'type' => 'high_withdrawal_ratio',
                    'severity' => 'medium',
                    'message' => "Withdrawal amount is " . round($ratio, 1) . "% of total earnings"
                ];
            }
        } else {
            $indicators['withdrawal_to_earnings_ratio'] = 0;
        }
        
        // 3. Active disputes
        $activeDisputes = $this->countActiveDisputes($provider);
        $indicators['active_disputes'] = $activeDisputes;
        
        if ($activeDisputes > 0) {
            $warnings[] = [
                'type' => 'active_disputes',
                'severity' => 'high',
                'message' => "${activeDisputes} active dispute(s) pending resolution"
            ];
        }
        
        // 4. Recent refunds
        $recentRefunds = $this->countRecentRefunds($provider);
        $indicators['recent_refunds'] = $recentRefunds;
        
        if ($recentRefunds > 2) {
            $warnings[] = [
                'type' => 'excessive_refunds',
                'severity' => 'medium',
                'message' => "${recentRefunds} refunds in the last 30 days"
            ];
        }
        
        // 5. Unresolved complaints
        $unresolvedComplaints = $this->countUnresolvedComplaints($provider);
        $indicators['unresolved_complaints'] = $unresolvedComplaints;
        
        if ($unresolvedComplaints > 0) {
            $warnings[] = [
                'type' => 'unresolved_complaints',
                'severity' => 'medium',
                'message' => "${unresolvedComplaints} unresolved customer complaint(s)"
            ];
        }
        
        // 6. Provider rating
        $rating = $provider->rating ?? 0;
        $indicators['provider_rating'] = $rating;
        
        if ($rating < 3.0 && $rating > 0) {
            $warnings[] = [
                'type' => 'low_rating',
                'severity' => 'medium',
                'message' => "Provider rating is low (" . number_format($rating, 1) . "/5.0)"
            ];
        }
        
        // 7. Cancellation rate
        $cancellationRate = $this->calculateCancellationRate($provider);
        $indicators['cancellation_rate'] = $cancellationRate;
        
        if ($cancellationRate > 20) {
            $warnings[] = [
                'type' => 'high_cancellation_rate',
                'severity' => 'medium',
                'message' => "High cancellation rate (" . round($cancellationRate, 1) . "%)"
            ];
        }
        
        // 8. Bank account holder name mismatch
        $nameMismatch = $this->checkNameMismatch($withdrawal, $provider);
        $indicators['name_mismatch'] = $nameMismatch;
        
        if ($nameMismatch) {
            $warnings[] = [
                'type' => 'name_mismatch',
                'severity' => 'high',
                'message' => "Bank account holder name does not match provider name"
            ];
        }
        
        return [
            'indicators' => $indicators,
            'warnings' => $warnings,
            'risk_level' => $this->calculateRiskLevel($warnings)
        ];
    }
    
    /**
     * Calculate account age in days
     */
    private function calculateAccountAge(ServiceProvider $provider)
    {
        return Carbon::parse($provider->created_at)->diffInDays(now());
    }
    
    /**
     * Calculate total earnings from completed bookings
     */
    private function calculateTotalEarnings(ServiceProvider $provider)
    {
        return Booking::where('providerID', $provider->providerID)
            ->where('status', 'completed')
            ->sum('provider_payout');
    }
    
    /**
     * Count active disputes
     */
    private function countActiveDisputes(ServiceProvider $provider)
    {
        return Dispute::whereHas('booking', function($query) use ($provider) {
            $query->where('providerID', $provider->providerID);
        })
        ->whereIn('status', ['open', 'under_review'])
        ->count();
    }
    
    /**
     * Count recent refunds (last 30 days)
     */
    private function countRecentRefunds(ServiceProvider $provider)
    {
        $thirtyDaysAgo = Carbon::now()->subDays(30);
        
        return Payment::whereHas('booking', function($query) use ($provider) {
            $query->where('providerID', $provider->providerID);
        })
        ->where('status', 'refunded')
        ->where('updated_at', '>=', $thirtyDaysAgo)
        ->count();
    }
    
    /**
     * Count unresolved complaints
     */
    private function countUnresolvedComplaints(ServiceProvider $provider)
    {
        return Dispute::whereHas('booking', function($query) use ($provider) {
            $query->where('providerID', $provider->providerID);
        })
        ->where('status', 'open')
        ->count();
    }
    
    /**
     * Calculate cancellation rate
     */
    private function calculateCancellationRate(ServiceProvider $provider)
    {
        $totalBookings = Booking::where('providerID', $provider->providerID)
            ->whereIn('status', ['completed', 'cancelled'])
            ->count();
        
        if ($totalBookings === 0) {
            return 0;
        }
        
        $cancelledBookings = Booking::where('providerID', $provider->providerID)
            ->where('status', 'cancelled')
            ->count();
        
        return ($cancelledBookings / $totalBookings) * 100;
    }
    
    /**
     * Check if bank account holder name matches provider name
     */
    private function checkNameMismatch(Withdrawal $withdrawal, ServiceProvider $provider)
    {
        if ($withdrawal->payment_method === 'bank' && $withdrawal->provider_account_holder_name) {
            $accountName = strtolower(trim($withdrawal->provider_account_holder_name));
            $providerName = strtolower(trim($provider->fullname));
            
            // Simple similarity check
            return $accountName !== $providerName;
        }
        
        if ($withdrawal->payment_method === 'telebir' && $withdrawal->telebir_holder_name) {
            $accountName = strtolower(trim($withdrawal->telebir_holder_name));
            $providerName = strtolower(trim($provider->fullname));
            
            return $accountName !== $providerName;
        }
        
        return false;
    }
    
    /**
     * Calculate overall risk level based on warnings
     */
    private function calculateRiskLevel(array $warnings)
    {
        if (empty($warnings)) {
            return 'low';
        }
        
        $highSeverityCount = count(array_filter($warnings, function($w) {
            return $w['severity'] === 'high';
        }));
        
        if ($highSeverityCount >= 2) {
            return 'critical';
        }
        
        if ($highSeverityCount >= 1) {
            return 'high';
        }
        
        if (count($warnings) >= 3) {
            return 'high';
        }
        
        return 'medium';
    }
}
