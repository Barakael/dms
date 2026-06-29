<?php

namespace App\Notifications;

use App\Models\Document;
use Illuminate\Bus\Queueable;
use Illuminate\Notifications\Notification;

class DocumentScanComplete extends Notification
{
    use Queueable;

    public function __construct(
        public Document $document,
        public string $scanResult
    ) {}

    public function via(object $notifiable): array
    {
        return ['database'];
    }

    public function toArray(object $notifiable): array
    {
        $isClean = in_array($this->scanResult, ['clean', 'skipped'], true);

        return [
            'type' => 'document_scan_complete',
            'document_id' => $this->document->id,
            'document_title' => $this->document->title,
            'scan_result' => $this->scanResult,
            'status' => $this->document->status,
            'message' => $isClean
                ? "Document \"{$this->document->title}\" is ready to access."
                : "Document \"{$this->document->title}\" was quarantined after virus scan.",
        ];
    }
}
