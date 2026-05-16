<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
public function up()
{
    Schema::table('customers', function (Blueprint $table) {
        // Home location (saved once)
        $table->decimal('home_latitude', 10, 7)->nullable()->after('location');
        $table->decimal('home_longitude', 10, 7)->nullable()->after('home_latitude');

        // Service location for current booking (optional override)
        $table->string('service_address')->nullable()->after('service_longitude');

        // Timezone
        $table->string('timezone', 50)->nullable()->after('service_address');
    });
}

    /**
     * Reverse the migrations.
     */
    public function down()
    {
    Schema::table('customers', function (Blueprint $table) {
        $table->dropColumn([
            'home_latitude', 'home_longitude',
            'service_latitude', 'service_longitude', 'service_address',
            'timezone'
        ]);
    });
    }
};
