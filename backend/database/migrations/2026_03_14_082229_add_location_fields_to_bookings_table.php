<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::table('bookings', function (Blueprint $table) {
            $table->string('address_text')->nullable()->after('service_longitude');
            $table->string('place_id')->nullable()->after('address_text');
            $table->string('location_source')->default('manual')->after('place_id');
            $table->unsignedBigInteger('saved_address_id')->nullable()->after('location_source');
            
            // Optional: foreign key if you want
            $table->foreign('saved_address_id')
                ->references('addressID')
                ->on('customer_addresses')
                ->onDelete('set null');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('bookings', function (Blueprint $table) {
            $table->dropForeign(['saved_address_id']);
            $table->dropColumn(['address_text', 'place_id', 'location_source', 'saved_address_id']);
        });
    }
};
