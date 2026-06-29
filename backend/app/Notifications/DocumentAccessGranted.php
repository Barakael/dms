<?php

namespace App\Notifications;

use App\Models\Document;
use Illuminate\Bus\Queueable;
use Illuminate\Notifications\Notification;

class DocumentAccessGranted extends Notification
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
            'type' => 'document_access_granted',
            'document_id' => $this->document->id,
            'document_title' => $this->document->title,
            'message' => "You were granted access to \"{$this->document->title}\".",
        ];
    }
}
