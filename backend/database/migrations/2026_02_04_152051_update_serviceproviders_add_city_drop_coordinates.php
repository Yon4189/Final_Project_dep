<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

class UpdateServiceprovidersAddCityDropCoordinates extends Migration
{
    public function up()
    {
        Schema::table('serviceproviders', function (Blueprint $table) {
            // Add service_city column first
            $table->string('service_city')->nullable()->after('phone');

            // Drop latitude/longitude only if they exist
            if (Schema::hasColumn('serviceproviders', 'latitude')) {
                $table->dropColumn('latitude');
            }

            if (Schema::hasColumn('serviceproviders', 'longitude')) {
                $table->dropColumn('longitude');
            }
        });
    }

    public function down()
    {
        Schema::table('serviceproviders', function (Blueprint $table) {
            // Rollback: re-add coordinates columns if missing
            if (!Schema::hasColumn('serviceproviders', 'latitude')) {
                $table->decimal('latitude', 10, 7)->nullable();
            }

            if (!Schema::hasColumn('serviceproviders', 'longitude')) {
                $table->decimal('longitude', 10, 7)->nullable();
            }

            // Remove service_city if it exists
            if (Schema::hasColumn('serviceproviders', 'service_city')) {
                $table->dropColumn('service_city');
            }
        });
    }
}
