<?php

namespace App\Jobs;

use App\Models\Document;
use App\Models\ScanResult;
use App\Notifications\DocumentScanComplete;
use App\Services\VirusScanService;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Queue\Queueable;

class ScanDocumentJob implements ShouldQueue
{
    use Queueable;

    public function __construct(public Document $document) {}

    public function handle(VirusScanService $scanner): void
    {
        $document = $this->document->fresh();

        if (! $document || ! $document->file_path) {
            return;
        }

        $scan = $scanner->scan($document->file_path);

        ScanResult::create([
            'document_id' => $document->id,
            'result' => $scan['result'],
            'engine' => 'clamav',
            'details' => $scan['details'] ?? null,
            'scanned_at' => now(),
        ]);

        $status = match ($scan['result']) {
            'clean', 'skipped' => 'active',
            'infected' => 'quarantined',
            default => 'quarantined',
        };

        $document->update(['status' => $status]);

        if ($document->uploader) {
            $document->uploader->notify(new DocumentScanComplete($document, $scan['result']));
        }

        $manager = $document->department?->head ?? $document->project?->manager;
        if ($manager && $manager->id !== $document->uploaded_by) {
            $manager->notify(new DocumentScanComplete($document, $scan['result']));
        }
    }
}
