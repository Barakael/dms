<?php

namespace App\Policies;

use App\Models\Document;
use App\Models\User;
use App\Traits\ManagesUnitDocuments;

class DocumentPolicy
{
    use ManagesUnitDocuments;

    public function viewAny(User $user): bool
    {
        return true;
    }

    public function view(User $user, Document $document): bool
    {
        return $this->canAccess($user, $document, ['view', 'download', 'edit', 'share']);
    }

    public function download(User $user, Document $document): bool
    {
        if (! $document->isDownloadable()) {
            return false;
        }

        return $this->canAccess($user, $document, ['download', 'edit', 'share']);
    }

    public function create(User $user): bool
    {
        return $user->isUnitManager() || $user->hasRole('staff');
    }

    public function update(User $user, Document $document): bool
    {
        return $this->canAccess($user, $document, ['edit', 'share']);
    }

    public function delete(User $user, Document $document): bool
    {
        return $user->isSystemAdmin();
    }

    public function requestDeletion(User $user, Document $document): bool
    {
        if ($user->isSystemAdmin()) {
            return false;
        }

        return $this->isUnitManager($user, $document)
            || $document->uploaded_by === $user->id;
    }

    public function share(User $user, Document $document): bool
    {
        return $this->canAccess($user, $document, ['share']);
    }

    protected function canAccess(User $user, Document $document, array $permissions): bool
    {
        if ($user->isSystemAdmin()) {
            return true;
        }

        if ($this->isUnitManager($user, $document)) {
            return true;
        }

        if ($document->uploaded_by === $user->id) {
            return true;
        }

        return $this->userHasDocumentPermission($user, $document, $permissions);
    }
}
