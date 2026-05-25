<?php
use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

class UpdateServiceprovidersAddCityDropCoordinates extends Migration
{
    public function up()
    {
        Schema::table('service_providers', function (Blueprint $table) {
            if (!Schema::hasColumn('service_providers', 'service_city')) {
                $table->string('service_city')->nullable()->after('password');
            }
        });
    }

    public function down()
    {
        //
    }
}
