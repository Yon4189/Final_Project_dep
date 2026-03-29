<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        // Update payments status enum to include all needed values
        DB::statement("ALTER TABLE payments MODIFY status ENUM(
            'pending', 
            'processing', 
            'paid', 
            'held', 
            'releasable', 
            'released', 
            'withdrawn', 
            'refunded',
            'failed',
            'cancelled'
        ) NOT NULL DEFAULT 'pending'");
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        // Revert back to original enum (remove processing, releasable, withdrawn)
        DB::statement("ALTER TABLE payments MODIFY status ENUM(
            'pending', 
            'paid', 
            'held', 
            'released', 
            'refunded',
            'failed',
            'cancelled'
        ) NOT NULL DEFAULT 'pending'");
    }
};