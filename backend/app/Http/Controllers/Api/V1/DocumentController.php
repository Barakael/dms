<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Http\Resources\DocumentResource;
use App\Jobs\ScanDocumentJob;
use App\Models\Document;
use App\Models\DocumentVersion;
use App\Models\Tag;
use App\Services\AuditService;
use App\Services\DocumentAccessService;
use App\Services\DocumentDeletionService;
use App\Traits\ManagesUnitDocuments;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;

class DocumentController extends Controller
{
    use ManagesUnitDocuments;

    public function __construct(
        protected AuditService $audit,
        protected DocumentAccessService $access,
        protected DocumentDeletionService $deletionService
    ) {}

    public function index(Request $request): AnonymousResourceCollection
    {
        $query = Document::accessibleBy($request->user())
            ->with(['department', 'project', 'folder', 'uploader', 'tags'])
            ->latest();

        if ($search = $request->get('search')) {
            $query->where(function ($q) use ($search) {
                $q->where('title', 'like', "%{$search}%")
                    ->orWhere('description', 'like', "%{$search}%")
                    ->orWhereHas('tags', fn ($t) => $t->where('name', 'like', "%{$search}%"));
            });
        }

        if ($departmentId = $request->get('department_id')) {
            $query->where('department_id', $departmentId);
        }

        if ($projectId = $request->get('project_id')) {
            $query->where('project_id', $projectId);
        }

        if ($folderId = $request->get('folder_id')) {
            $query->where('folder_id', $folderId);
        }

        if ($status = $request->get('status')) {
            $query->where('status', $status);
        }

        return DocumentResource::collection($query->paginate(50));
    }

    public function store(Request $request): JsonResponse
    {
        $maxKb = (int) (config('dms.max_upload_size') / 1024);

        $data = $request->validate([
            'title' => 'required|string|max:255',
            'description' => 'nullable|string',
            'department_id' => 'nullable|exists:departments,id',
            'project_id' => 'nullable|exists:projects,id',
            'folder_id' => 'nullable|exists:folders,id',
            'expires_at' => 'nullable|date',
            'tags' => 'nullable|array',
            'tags.*' => 'string|max:50',
            'file' => "required|file|max:{$maxKb}",
        ]);

        abort_if(empty($data['department_id']) && empty($data['project_id']), 422, 'department_id or project_id required');

        $file = $request->file('file');
        $extension = strtolower($file->getClientOriginalExtension());

        abort_unless(in_array($extension, config('dms.allowed_extensions'), true), 422, 'File type not allowed');
        abort_unless(in_array($file->getMimeType(), config('dms.allowed_mimes'), true), 422, 'MIME type not allowed');

        $path = $file->store('documents/' . date('Y/m'), 'local');

        $document = Document::create([
            'title' => $data['title'],
            'description' => $data['description'] ?? null,
            'department_id' => $data['department_id'] ?? null,
            'project_id' => $data['project_id'] ?? null,
            'folder_id' => $data['folder_id'] ?? null,
            'uploaded_by' => $request->user()->id,
            'file_path' => $path,
            'original_filename' => $file->getClientOriginalName(),
            'mime_type' => $file->getMimeType(),
            'file_size' => $file->getSize(),
            'status' => 'pending_scan',
            'expires_at' => $data['expires_at'] ?? null,
        ]);

        $document->load(['department.head', 'project.manager']);
        $this->access->grantDefaultAccess($document, $request->user());

        DocumentVersion::create([
            'document_id' => $document->id,
            'version_number' => 1,
            'file_path' => $path,
            'original_filename' => $file->getClientOriginalName(),
            'mime_type' => $file->getMimeType(),
            'file_size' => $file->getSize(),
            'uploaded_by' => $request->user()->id,
            'change_note' => 'Initial upload',
        ]);

        if (! empty($data['tags'])) {
            $tagIds = collect($data['tags'])->map(fn ($name) => Tag::firstOrCreate(['name' => Str::lower(trim($name))])->id);
            $document->tags()->sync($tagIds);
        }

        ScanDocumentJob::dispatch($document);
        $document->refresh();

        $this->audit->log('document.uploaded', $request->user(), $document, $request);

        return response()->json(new DocumentResource($document->load(['department', 'project', 'folder', 'uploader', 'tags'])), 201);
    }

    public function show(Request $request, Document $document): DocumentResource
    {
        $this->authorize('view', $document);
        $this->audit->log('document.viewed', $request->user(), $document, $request);

        return new DocumentResource(
            $document->load(['department', 'project', 'folder', 'uploader', 'permissions.user', 'versions.uploader', 'scanResults', 'tags'])
        );
    }

    public function update(Request $request, Document $document): DocumentResource
    {
        $this->authorize('update', $document);

        $data = $request->validate([
            'title' => 'sometimes|string|max:255',
            'description' => 'nullable|string',
            'folder_id' => 'nullable|exists:folders,id',
            'expires_at' => 'nullable|date',
            'status' => 'sometimes|in:archived,active',
            'tags' => 'nullable|array',
            'tags.*' => 'string|max:50',
        ]);

        $document->update(collect($data)->except('tags')->all());

        if (array_key_exists('tags', $data)) {
            $tagIds = collect($data['tags'] ?? [])->map(fn ($name) => Tag::firstOrCreate(['name' => Str::lower(trim($name))])->id);
            $document->tags()->sync($tagIds);
        }

        $this->audit->log('document.updated', $request->user(), $document, $request);

        return new DocumentResource($document->load(['department', 'project', 'folder', 'uploader', 'tags']));
    }

    public function destroy(Request $request, Document $document): JsonResponse
    {
        $this->authorize('delete', $document);

        $this->deletionService->delete($document, $request->user(), $request);

        return response()->json(['message' => 'Document deleted']);
    }

    public function download(Request $request, Document $document): JsonResponse
    {
        $this->authorize('download', $document);

        $this->audit->log('document.downloaded', $request->user(), $document, $request);

        $url = \Illuminate\Support\Facades\URL::temporarySignedRoute(
            'documents.signed-download',
            now()->addMinutes(config('dms.signed_url_ttl_minutes')),
            ['document' => $document->id]
        );

        return response()->json(['url' => $url, 'expires_in_minutes' => config('dms.signed_url_ttl_minutes')]);
    }

    public function signedDownload(Document $document): \Symfony\Component\HttpFoundation\StreamedResponse
    {
        abort_unless($document->isDownloadable(), 403);

        return Storage::disk('local')->download($document->file_path, $document->original_filename);
    }

    public function preview(Request $request, Document $document): JsonResponse
    {
        $this->authorize('view', $document);
        abort_unless($document->isDownloadable(), 403, 'Document not available for preview');

        $url = \Illuminate\Support\Facades\URL::temporarySignedRoute(
            'documents.signed-preview',
            now()->addMinutes(config('dms.signed_url_ttl_minutes')),
            ['document' => $document->id]
        );

        $this->audit->log('document.previewed', $request->user(), $document, $request);

        return response()->json(['url' => $url, 'mime_type' => $document->mime_type]);
    }

    public function signedPreview(Document $document): \Symfony\Component\HttpFoundation\BinaryFileResponse
    {
        abort_unless($document->isDownloadable(), 403);

        return response()->file(Storage::disk('local')->path($document->file_path));
    }

    public function storeVersion(Request $request, Document $document): JsonResponse
    {
        $this->authorize('update', $document);

        $maxKb = (int) (config('dms.max_upload_size') / 1024);

        $data = $request->validate([
            'file' => "required|file|max:{$maxKb}",
            'change_note' => 'nullable|string|max:500',
        ]);

        $file = $request->file('file');
        $path = $file->store('documents/' . date('Y/m'), 'local');
        $nextVersion = ($document->versions()->max('version_number') ?? 0) + 1;

        DocumentVersion::create([
            'document_id' => $document->id,
            'version_number' => $nextVersion,
            'file_path' => $path,
            'original_filename' => $file->getClientOriginalName(),
            'mime_type' => $file->getMimeType(),
            'file_size' => $file->getSize(),
            'uploaded_by' => $request->user()->id,
            'change_note' => $data['change_note'] ?? null,
        ]);

        $document->update([
            'file_path' => $path,
            'original_filename' => $file->getClientOriginalName(),
            'mime_type' => $file->getMimeType(),
            'file_size' => $file->getSize(),
            'status' => 'pending_scan',
        ]);

        ScanDocumentJob::dispatch($document->fresh());
        $this->audit->log('document.version_uploaded', $request->user(), $document, $request, ['version' => $nextVersion]);

        return response()->json(new DocumentResource($document->load(['versions.uploader'])), 201);
    }

    public function versions(Request $request, Document $document): AnonymousResourceCollection
    {
        $this->authorize('view', $document);

        return \App\Http\Resources\DocumentVersionResource::collection(
            $document->versions()->with('uploader')->get()
        );
    }
}
