<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('reviews', function (Blueprint $table) {
            // Add missing columns
            if (!Schema::hasColumn('reviews', 'customerID')) {
                $table->unsignedBigInteger('customerID')->after('bookingID');
                $table->foreign('customerID')->references('customerID')->on('customers')->onDelete('cascade');
            }
            
            if (!Schema::hasColumn('reviews', 'providerID')) {
                $table->unsignedBigInteger('providerID')->after('customerID');
                $table->foreign('providerID')->references('providerID')->on('service_providers')->onDelete('cascade');
            }
            
            if (!Schema::hasColumn('reviews', 'serviceID')) {
                $table->unsignedBigInteger('serviceID')->nullable()->after('providerID');
                $table->foreign('serviceID')->references('serviceID')->on('services')->onDelete('set null');
            }
            
            if (!Schema::hasColumn('reviews', 'is_anonymous')) {
                $table->boolean('is_anonymous')->default(false)->after('comment');
            }
            
            // Add unique constraint to bookingID
            $table->unique('bookingID', 'reviews_booking_id_unique');
        });
    }

    public function down(): void
    {
        Schema::table('reviews', function (Blueprint $table) {
            $table->dropForeign(['customerID']);
            $table->dropForeign(['providerID']);
            $table->dropForeign(['serviceID']);
            $table->dropUnique('reviews_booking_id_unique');
            
            $table->dropColumn(['customerID', 'providerID', 'serviceID', 'is_anonymous']);
        });
    }
};