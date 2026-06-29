<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class ScanResultResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'result' => $this->result,
            'engine' => $this->engine,
            'details' => $this->details,
            'scanned_at' => $this->scanned_at?->toIso8601String(),
        ];
    }
}
