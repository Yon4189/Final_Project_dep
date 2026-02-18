<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

class UpdateServiceprovidersAddCityDropCoordinates extends Migration
{
    public function up()
    {
        Schema::table('service_providers', function (Blueprint $table) {

            // Add service_city column
            $table->string('service_city')->nullable()->after('phone');
        });
    }

    public function down()
    {
        Schema::table('service_providers', function (Blueprint $table) {
            // Rollback: re-add coordinates columns
            $table->decimal('latitude', 10, 7)->nullable();
            $table->decimal('longitude', 10, 7)->nullable();

            // Remove service_city
            $table->dropColumn('service_city');
        });
    }
}