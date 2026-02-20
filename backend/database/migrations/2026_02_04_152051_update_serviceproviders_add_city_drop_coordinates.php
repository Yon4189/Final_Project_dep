<?php
use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

class UpdateServiceprovidersAddCityDropCoordinates extends Migration
{
    public function up()
    {
        Schema::table('service_providers', function (Blueprint $table) {
            // your code
        });
    }

    public function down()
    {
        //
    }
}
