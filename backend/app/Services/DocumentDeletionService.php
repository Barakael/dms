<?php

namespace App\Services;

use App\Models\Document;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;

class DocumentDeletionService
{
    public function __construct(protected AuditService $audit) {}

    public function delete(Document $document, User $actor, ?Request $request = null): void
    {
        if ($document->file_path) {
            Storage::disk('local')->delete($document->file_path);
        }

        $this->audit->log('document.deleted', $actor, $document, $request);
        $document->delete();
    }
}
