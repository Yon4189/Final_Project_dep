<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        // Step 1: Add recipient_type column as nullable first
        Schema::table('dispute_messages', function (Blueprint $table) {
            $table->string('recipient_type', 20)->nullable()->after('sender_type');
        });
        
        // Step 2: Migrate existing data
        // Logic:
        // - If is_admin_only = 1 → recipient_type = 'admin' (private admin note)
        // - If sender_type = 'customer' → recipient_type = 'admin' (customer talking to admin)
        // - If sender_type = 'provider' → recipient_type = 'admin' (provider talking to admin)
        // - If sender_type = 'admin' AND is_admin_only = 0 → recipient_type = 'customer' (admin talking to customer)
        DB::statement("
            UPDATE dispute_messages dm
            INNER JOIN disputes d ON dm.disputeID = d.disputeID
            SET dm.recipient_type = CASE
                WHEN dm.is_admin_only = 1 THEN 'admin'
                WHEN dm.sender_type = 'customer' THEN 'admin'
                WHEN dm.sender_type = 'provider' THEN 'admin'
                WHEN dm.sender_type = 'admin' AND dm.is_admin_only = 0 THEN 'customer'
                ELSE 'admin'
            END
        ");
        
        // Step 3: Duplicate admin public messages for provider thread
        // This ensures backward compatibility - admin messages that were visible to both parties
        // are now duplicated so each party has their own copy in their thread
        DB::statement("
            INSERT INTO dispute_messages (
                disputeID, sender_id, sender_type, recipient_type,
                message, attachments, is_admin_only, created_at, updated_at
            )
            SELECT 
                disputeID, sender_id, sender_type, 'provider' as recipient_type,
                message, attachments, is_admin_only, created_at, updated_at
            FROM dispute_messages
            WHERE sender_type = 'admin' 
              AND is_admin_only = 0
              AND recipient_type = 'customer'
        ");
        
        // Step 4: Make recipient_type column NOT NULL
        Schema::table('dispute_messages', function (Blueprint $table) {
            $table->string('recipient_type', 20)->nullable(false)->change();
        });
        
        // Step 5: Add indexes for query performance
        Schema::table('dispute_messages', function (Blueprint $table) {
            $table->index('recipient_type', 'idx_recipient_type');
            $table->index(['disputeID', 'recipient_type'], 'idx_dispute_recipient');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('dispute_messages', function (Blueprint $table) {
            // Drop indexes
            $table->dropIndex('idx_dispute_recipient');
            $table->dropIndex('idx_recipient_type');
            
            // Drop column
            $table->dropColumn('recipient_type');
        });
    }
};
