<?php

namespace App\Notifications;

use App\Models\DocumentDeletionRequest;
use Illuminate\Bus\Queueable;
use Illuminate\Notifications\Notification;

class DocumentDeletionRequested extends Notification
{
    use Queueable;

    public function __construct(public DocumentDeletionRequest $deletionRequest) {}

    public function via(object $notifiable): array
    {
        return ['database'];
    }

    public function toArray(object $notifiable): array
    {
        $document = $this->deletionRequest->document;

        return [
            'type' => 'document_deletion_requested',
            'deletion_request_id' => $this->deletionRequest->id,
            'document_id' => $document?->id,
            'document_title' => $document?->title,
            'message' => "Deletion requested for \"{$document?->title}\".",
        ];
    }
}
