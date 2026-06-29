<?php

namespace App\Notifications;

use App\Models\DocumentDeletionRequest;
use Illuminate\Bus\Queueable;
use Illuminate\Notifications\Notification;

class DocumentDeletionReviewed extends Notification
{
    use Queueable;

    public function __construct(
        public DocumentDeletionRequest $deletionRequest,
        public bool $approved
    ) {}

    public function via(object $notifiable): array
    {
        return ['database'];
    }

    public function toArray(object $notifiable): array
    {
        $document = $this->deletionRequest->document;
        $title = $document?->title ?? 'a document';
        $action = $this->approved ? 'approved' : 'rejected';

        return [
            'type' => 'document_deletion_reviewed',
            'deletion_request_id' => $this->deletionRequest->id,
            'document_id' => $document?->id,
            'document_title' => $document?->title,
            'approved' => $this->approved,
            'message' => "Your deletion request for \"{$title}\" was {$action}.",
        ];
    }
}
