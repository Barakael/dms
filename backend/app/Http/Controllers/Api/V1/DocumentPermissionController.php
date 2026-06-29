<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Http\Resources\DocumentPermissionResource;
use App\Models\Document;
use App\Models\User;
use App\Notifications\DocumentAccessGranted;
use App\Services\AuditService;
use App\Services\DocumentAccessService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;

class DocumentPermissionController extends Controller
{
    public function __construct(
        protected DocumentAccessService $access,
        protected AuditService $audit
    ) {}

    public function index(Request $request, Document $document): AnonymousResourceCollection
    {
        $this->authorize('share', $document);

        return DocumentPermissionResource::collection(
            $document->permissions()->with(['user', 'granter'])->get()
        );
    }

    public function store(Request $request, Document $document): JsonResponse
    {
        $this->authorize('share', $document);

        $data = $request->validate([
            'user_id' => 'required_without:preset|exists:users,id',
            'permissions' => 'required_without:preset|array|min:1',
            'permissions.*' => 'in:view,download,edit,share',
            'preset' => 'nullable|in:all_staff,managers_only',
        ]);

        if (! empty($data['preset'])) {
            $count = $this->access->applyPreset($document, $data['preset'], $request->user());
            $this->audit->log('document.preset_shared', $request->user(), $document, $request, ['preset' => $data['preset'], 'count' => $count]);

            return response()->json(['message' => "Access preset applied to {$count} staff", 'count' => $count]);
        }

        $user = User::findOrFail($data['user_id']);
        $this->access->grantToUser($document, $user, $data['permissions'], $request->user());
        $user->notify(new DocumentAccessGranted($document));

        $this->audit->log('document.access_granted', $request->user(), $document, $request, [
            'user_id' => $user->id,
            'permissions' => $data['permissions'],
        ]);

        return response()->json(['message' => 'Access granted'], 201);
    }

    public function destroy(Request $request, Document $document): JsonResponse
    {
        $this->authorize('share', $document);

        $data = $request->validate([
            'user_id' => 'required|exists:users,id',
            'permissions' => 'nullable|array',
            'permissions.*' => 'in:view,download,edit,share',
        ]);

        $user = User::findOrFail($data['user_id']);
        $this->access->revokeFromUser($document, $user, $data['permissions'] ?? null);

        $this->audit->log('document.access_revoked', $request->user(), $document, $request, [
            'user_id' => $user->id,
            'permissions' => $data['permissions'] ?? 'all',
        ]);

        return response()->json(['message' => 'Access revoked']);
    }
}
