<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;
use App\Models\ServiceProvider;
use App\Models\Review;

class RecalculateProviderRatings extends Command
{
    protected $signature = 'providers:recalculate-ratings';
    protected $description = 'Recalculate all provider ratings based on actual reviews';

    public function handle()
    {
        $this->info('Recalculating provider ratings...');
        
        $providers = ServiceProvider::all();
        $updated = 0;
        
        foreach ($providers as $provider) {
            $stats = Review::where('providerID', $provider->providerID)
                ->selectRaw('AVG(rating) as avg_rating, COUNT(*) as total')
                ->first();
            
            $avgRating = round($stats->avg_rating ?? 0, 2);
            $totalReviews = $stats->total ?? 0;
            
            $provider->rating = $avgRating;
            $provider->average_rating = $avgRating;
            $provider->total_reviews = $totalReviews;
            $provider->save();
            
            $updated++;
            $this->line("Provider {$provider->providerID}: {$avgRating} stars ({$totalReviews} reviews)");
        }
        
        $this->info("Successfully recalculated ratings for {$updated} providers.");
        
        return 0;
    }
}
