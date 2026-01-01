# Oxylabs YouTube Transcript - Implementation Plan

> **Status: ✅ IMPLEMENTED** (Simplified version)

## Overview

Switched from Sieve (async, polling-based) to Oxylabs (sync, real-time) for YouTube transcript fetching using a clean provider-based architecture.

## Architecture

### Provider Pattern

```
app/lib/transcript-providers/
  ├── index.js        # Provider registry + factory
  ├── oxylabs.js      # Oxylabs implementation (default)
  └── utils.js        # Shared utilities (timestamp formatting)
```

### Provider Interface

All providers implement:

```javascript
{
  name: string,                           // Provider identifier
  isConfigured(): boolean,                // Check if env vars are set
  fetchTranscript(videoId, options): Promise<Result>  // Fetch transcript
}

// Result shape:
{ segments: Array, language: string, transcriptType: string }
// or
{ error: { code: string, message: string } }
```

### Adding a New Provider

1. Create `app/lib/transcript-providers/your-provider.js`:

```javascript
export class YourProvider {
  name = 'your-provider';
  
  isConfigured() {
    return !!process.env.YOUR_PROVIDER_API_KEY;
  }

  async fetchTranscript(videoId, options = {}) {
    // Call your API
    // Return { segments, language, transcriptType } or { error }
  }
}
```

2. Register in `index.js`:

```javascript
import { YourProvider } from './your-provider';
const providers = { oxylabs: OxylabsProvider, 'your-provider': YourProvider };
```

3. Set environment variable:

```bash
TRANSCRIPT_PROVIDER=your-provider
YOUR_PROVIDER_API_KEY=xxx
```

**That's it.** No changes needed to API routes, client code, or UI.

---

## Environment Variables

```bash
# Provider selection (default: youtube-transcript)
TRANSCRIPT_PROVIDER=youtube-transcript  # or 'oxylabs' when Oxylabs is fixed

# Oxylabs credentials (optional - only if using oxylabs provider)
OXYLABS_USERNAME=your_username
OXYLABS_PASSWORD=your_password

# Note: youtube-transcript provider requires no API keys or credentials
```

---

## Files Changed

### Created
| File | Purpose |
|------|---------|
| `app/lib/transcript-providers/index.js` | Provider registry |
| `app/lib/transcript-providers/oxylabs.js` | Oxylabs implementation |
| `app/lib/transcript-providers/youtube-transcript-provider.js` | Free npm package provider (default) |
| `app/lib/transcript-providers/utils.js` | Timestamp utilities |

### Modified
| File | Changes |
|------|---------|
| `app/api/transcripts/route.js` | Uses provider pattern, synchronous response |
| `app/api/store-transcript/route.js` | Accepts JSON transcript data |
| `app/utils/fetchTranscript.js` | Simplified - no polling |
| `app/utils/transcript.js` | Added download format functions |
| `app/utils/youtube.js` | Added shorts/embed/live URL support |
| `app/components/TranscriptDisplay.js` | Removed transcriptUrl dependency |
| `app/components/Header.js` | Removed Sieve nav link |
| `app/page.js` | Removed polling state management |

### Deleted
| File | Reason |
|------|--------|
| `app/api/fetch-vtt/route.js` | Sieve-specific |
| `app/api/job-status/route.js` | Polling no longer needed |
| `app/sievetranscripturl/page.js` | Debug page |
| `app/utils/jobs.js` | Job polling utilities |
| `app/components/JobStatus.js` | Polling UI component |

---

## Transcript Segment Format

```javascript
{
  startTime: "1:23",      // Display format (M:SS or H:MM:SS)
  endTime: "1:28",        // Display format
  startMs: 83000,         // Milliseconds (for export)
  endMs: 88000,           // Milliseconds (for export)
  text: "Hello world"     // Cleaned text
}
```

---

## Error Handling

| HTTP Status | Error Code | User Message |
|-------------|------------|--------------|
| 400 | BAD_REQUEST | Invalid video URL. Please check and try again. |
| 404 | NOT_FOUND | No transcript available for this video |
| 429 | RATE_LIMITED | Service is busy. Please try again in a moment. |
| 503 | NOT_CONFIGURED | Transcript service unavailable |
| 504 | TIMEOUT | Request timed out. Please try again. |

---

## Supported YouTube URL Formats

- `youtube.com/watch?v=VIDEO_ID`
- `youtube.com/shorts/VIDEO_ID`
- `youtube.com/embed/VIDEO_ID`
- `youtube.com/live/VIDEO_ID`
- `youtu.be/VIDEO_ID`
- `youtube.com/playlist?list=PLAYLIST_ID`

---

## Future Enhancements (Add When Needed)

| Feature | When to Add |
|---------|-------------|
| Caching | When API costs become a concern |
| Rate limiting | When you see abuse |
| Provider fallback | When you have 2+ providers |
| Download formats | Already implemented (VTT/SRT/TXT) |
| Language selector | When multi-language is needed |

---

## Database Migration (If Using Supabase Storage)

```sql
-- Add column for inline transcript content
ALTER TABLE transcripts
ADD COLUMN transcript_content JSONB;

-- Add video_id for caching/lookups (optional)
ALTER TABLE transcripts
ADD COLUMN video_id VARCHAR(20);

CREATE INDEX idx_transcripts_video_id ON transcripts(video_id);
```

---

## API Reference

See [oxylabs-api-documentation.md](./oxylabs-api-documentation.md) for full Oxylabs API docs.
