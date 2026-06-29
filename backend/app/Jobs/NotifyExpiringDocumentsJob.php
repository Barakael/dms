<?php

namespace App\Jobs;

use App\Models\Document;
use App\Notifications\DocumentExpiringSoon;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Queue\Queueable;

class NotifyExpiringDocumentsJob implements ShouldQueue
{
    use Queueable;

    public function handle(): void
    {
        Document::where('status', 'active')
            ->whereNotNull('expires_at')
            ->whereBetween('expires_at', [now(), now()->addDays(7)])
            ->with(['department.head', 'project.manager', 'uploader'])
            ->each(function (Document $document) {
                $recipients = collect([
                    $document->uploader,
                    $document->department?->head,
                    $document->project?->manager,
                ])->filter()->unique('id');

                foreach ($recipients as $user) {
                    $user->notify(new DocumentExpiringSoon($document));
                }
            });
    }
}
