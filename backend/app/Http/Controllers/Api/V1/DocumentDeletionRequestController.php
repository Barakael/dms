<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Http\Resources\DocumentDeletionRequestResource;
use App\Models\Document;
use App\Models\DocumentDeletionRequest;
use App\Models\User;
use App\Notifications\DocumentDeletionRequested;
use App\Notifications\DocumentDeletionReviewed;
use App\Services\AuditService;
use App\Services\DocumentDeletionService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;

class DocumentDeletionRequestController extends Controller
{
    public function __construct(
        protected AuditService $audit,
        protected DocumentDeletionService $deletionService
    ) {}

    public function index(Request $request): AnonymousResourceCollection
    {
        $request->user()->isSystemAdmin() || abort(403);

        $status = $request->get('status', 'pending');

        $query = DocumentDeletionRequest::with(['document.department', 'document.project', 'requester'])
            ->latest();

        if ($status) {
            $query->where('status', $status);
        }

        return DocumentDeletionRequestResource::collection($query->paginate(50));
    }

    public function store(Request $request, Document $document): JsonResponse
    {
        $this->authorize('requestDeletion', $document);

        $hasPending = DocumentDeletionRequest::where('document_id', $document->id)
            ->where('status', 'pending')
            ->exists();

        abort_if($hasPending, 422, 'A pending deletion request already exists for this document.');

        $data = $request->validate([
            'reason' => 'nullable|string|max:1000',
        ]);

        $deletionRequest = DocumentDeletionRequest::create([
            'document_id' => $document->id,
            'requested_by' => $request->user()->id,
            'reason' => $data['reason'] ?? null,
            'status' => 'pending',
        ]);

        $this->audit->log('document.deletion_requested', $request->user(), $document, $request, [
            'deletion_request_id' => $deletionRequest->id,
        ]);

        User::role('system_admin')->get()->each(
            fn (User $admin) => $admin->notify(new DocumentDeletionRequested($deletionRequest->load('document')))
        );

        return (new DocumentDeletionRequestResource($deletionRequest->load(['document', 'requester'])))
            ->response()
            ->setStatusCode(201);
    }

    public function approve(Request $request, DocumentDeletionRequest $deletionRequest): DocumentDeletionRequestResource
    {
        $request->user()->isSystemAdmin() || abort(403);
        abort_unless($deletionRequest->isPending(), 422, 'This request has already been reviewed.');

        $document = $deletionRequest->document;
        abort_if(! $document, 404, 'Document not found.');

        $this->deletionService->delete($document, $request->user(), $request);

        $deletionRequest->update([
            'status' => 'approved',
            'reviewed_by' => $request->user()->id,
            'reviewed_at' => now(),
            'review_note' => $request->input('review_note'),
        ]);

        $this->audit->log('document.deletion_approved', $request->user(), $document, $request, [
            'deletion_request_id' => $deletionRequest->id,
        ]);

        $deletionRequest->requester?->notify(new DocumentDeletionReviewed($deletionRequest, true));

        return new DocumentDeletionRequestResource($deletionRequest->load(['document', 'requester', 'reviewer']));
    }

    public function reject(Request $request, DocumentDeletionRequest $deletionRequest): DocumentDeletionRequestResource
    {
        $request->user()->isSystemAdmin() || abort(403);
        abort_unless($deletionRequest->isPending(), 422, 'This request has already been reviewed.');

        $data = $request->validate([
            'review_note' => 'nullable|string|max:1000',
        ]);

        $document = $deletionRequest->document;

        $deletionRequest->update([
            'status' => 'rejected',
            'reviewed_by' => $request->user()->id,
            'reviewed_at' => now(),
            'review_note' => $data['review_note'] ?? null,
        ]);

        $this->audit->log('document.deletion_rejected', $request->user(), $document, $request, [
            'deletion_request_id' => $deletionRequest->id,
        ]);

        $deletionRequest->requester?->notify(new DocumentDeletionReviewed($deletionRequest, false));

        return new DocumentDeletionRequestResource($deletionRequest->load(['document', 'requester', 'reviewer']));
    }
}
