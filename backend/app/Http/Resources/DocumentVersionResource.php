<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class DocumentVersionResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'version_number' => $this->version_number,
            'original_filename' => $this->original_filename,
            'mime_type' => $this->mime_type,
            'file_size' => $this->file_size,
            'change_note' => $this->change_note,
            'uploaded_by' => $this->whenLoaded('uploader', fn () => new UserResource($this->uploader)),
            'created_at' => $this->created_at?->toIso8601String(),
        ];
    }
}
