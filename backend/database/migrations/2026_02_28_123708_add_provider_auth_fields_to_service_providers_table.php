<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

class AddProviderAuthFieldsToServiceProvidersTable extends Migration
{
    public function up()
    {
        Schema::table('service_providers', function (Blueprint $table) {
            // Add authentication fields
            
            // Add location fields for GPS/nearness
            
            // Add stats fields
            $table->integer('accepted_jobs')->default(0)->after('completed_jobs');
            
            // Add approval tracking
            $table->timestamp('approved_at')->nullable()->after('status');
            $table->timestamp('rejected_at')->nullable()->after('approved_at');
            $table->string('rejection_reason')->nullable()->after('rejected_at');
        });
    }

    public function down()
    {
        Schema::table('service_providers', function (Blueprint $table) {
            $table->dropColumn([
                'remember_token',
                'email_verified_at',
                'current_latitude',
                'current_longitude',
                'rating',
                'completed_jobs',
                'accepted_jobs',
                'approved_at',
                'rejected_at',
                'rejection_reason'
            ]);
        });
    }
}