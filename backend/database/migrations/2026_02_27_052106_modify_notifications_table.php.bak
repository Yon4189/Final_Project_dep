<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('notifications', function (Blueprint $table) {

            // Rename columns
            $table->renameColumn('id', 'notificationID');
            $table->renameColumn('providerID', 'userID');
            $table->renameColumn('isRead', 'is_seen');
        });

        Schema::table('notifications', function (Blueprint $table) {

            // Add user_type
            $table->enum('user_type', ['customer', 'provider'])
                  ->after('userID');

            // Add related_bookingID
            $table->unsignedBigInteger('related_bookingID')
                  ->nullable()
                  ->after('message');

            $table->foreign('related_bookingID')
                  ->references('bookingID')
                  ->on('bookings')
                  ->onDelete('cascade');
        });
    }

    public function down(): void
    {
        Schema::table('notifications', function (Blueprint $table) {

            $table->dropForeign(['related_bookingID']);

            $table->dropColumn([
                'user_type',
                'related_bookingID'
            ]);

            $table->renameColumn('notificationID', 'id');
            $table->renameColumn('userID', 'providerID');
            $table->renameColumn('is_seen', 'isRead');
        });
    }
};