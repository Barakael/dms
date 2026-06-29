<?php

namespace App\Notifications;

use App\Models\Document;
use Illuminate\Bus\Queueable;
use Illuminate\Notifications\Notification;

class DocumentExpiringSoon extends Notification
{
    use Queueable;

    public function __construct(public Document $document) {}

    public function via(object $notifiable): array
    {
        return ['database'];
    }

    public function toArray(object $notifiable): array
    {
        return [
            'type' => 'document_expiring_soon',
            'document_id' => $this->document->id,
            'document_title' => $this->document->title,
            'expires_at' => $this->document->expires_at?->toIso8601String(),
            'message' => "Document \"{$this->document->title}\" expires on {$this->document->expires_at?->format('M j, Y')}.",
        ];
    }
}
