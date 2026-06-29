<?php

namespace App\Services;

use App\Models\AuditLog;
use App\Models\Document;
use App\Models\User;
use Illuminate\Http\Request;

class AuditService
{
    public function log(
        string $action,
        ?User $user = null,
        ?Document $document = null,
        ?Request $request = null,
        array $metadata = []
    ): AuditLog {
        return AuditLog::create([
            'user_id' => $user?->id,
            'document_id' => $document?->id,
            'action' => $action,
            'ip_address' => $request?->ip(),
            'user_agent' => $request?->userAgent(),
            'metadata' => $metadata ?: null,
        ]);
    }
}
