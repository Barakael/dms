<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class DocumentDeletionRequestResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'document_id' => $this->document_id,
            'reason' => $this->reason,
            'status' => $this->status,
            'review_note' => $this->review_note,
            'reviewed_at' => $this->reviewed_at?->toIso8601String(),
            'created_at' => $this->created_at?->toIso8601String(),
            'document' => $this->whenLoaded('document', fn () => new DocumentResource($this->document)),
            'requester' => $this->whenLoaded('requester', fn () => new UserResource($this->requester)),
            'reviewer' => $this->whenLoaded('reviewer', fn () => new UserResource($this->reviewer)),
        ];
    }
}
