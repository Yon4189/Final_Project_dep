<?php 

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up()
    {
        Schema::table('customers', function (Blueprint $table) {
            $table->dropColumn('location');

            $table->string('service_city')->nullable();
            $table->decimal('service_latitude', 10, 7)->nullable();
            $table->decimal('service_longitude', 10, 7)->nullable();
        });
    }

    public function down()
    {
        Schema::table('customers', function (Blueprint $table) {
            $table->string('location')->nullable();

            $table->dropColumn([
                'service_city',
                'service_latitude',
                'service_longitude'
            ]);
        });
    }
};
