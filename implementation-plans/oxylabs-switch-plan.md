# Oxylabs YouTube Transcript Switch Plan

## Goal
Replace Sieve API usage with Oxylabs Web Scraper API (YouTube transcript target) while preserving the app's transcript display flow.

## Plan
1) Confirm Oxylabs request + auth details:
   - Auth uses `OXYLABS_USERNAME` / `OXYLABS_PASSWORD` (basic auth).
   - Realtime endpoint: `https://realtime.oxylabs.io/v1/queries`.
   - Request payload for transcripts:
     - `source: "youtube_transcript"`
     - `query: "<video_id>"`
     - Optional: `language_code`, `transcript_origin`, `parse`, etc. as needed.

2) Refactor server API routes to call Oxylabs:
   - Update `app/api/transcripts/route.js` to POST to the Realtime endpoint using basic auth.
   - Normalize the response using `normalizeOxylabsTranscript()` (see #8):
     - Read `results[0].content`.
     - Keep only `transcriptSegmentRenderer` entries (skip section headers).
     - Build transcript items with `startTime`/`endTime` as display timestamps (MM:SS or HH:MM:SS).
     - Include `startMs`/`endMs` for export functionality.
   - Delete `app/api/job-status/route.js` — Realtime is synchronous, no polling needed.

3) Update client-side transcript flow:
   - Simplify `app/utils/fetchTranscript.js` to handle a direct transcript response.
   - Skip VTT flow (`app/api/fetch-vtt/route.js`) when transcript is returned inline.
   - Keep fallback handling for unexpected responses.

4) Replace Sieve-specific UI and copy:
   - Update any labels, placeholders, or links that mention Sieve (e.g., `app/sievetranscripturl/page.js`, header nav).
   - Remove any Sieve-only flows if they no longer apply.

5) Update configuration and docs:
   - Replace `SIEVE_API_KEY` references with `OXYLABS_USERNAME` / `OXYLABS_PASSWORD` in `.env.local` and README.
   - Update onboarding steps and documentation links to Oxylabs.

6) Validate end-to-end:
   - Run the app with a known YouTube URL.
   - Confirm transcript extraction, transcript display modes, and optional storage work as expected.

## Integration Method Note
Because this starts as a small tool for users requesting a single YouTube transcript at a time, begin with **Realtime** (synchronous) for simpler implementation and fewer moving parts. If usage grows or you need batch throughput, migrate to **Push-Pull** (async) with job callbacks and result polling/storage.

## Open Questions / Decisions
1) ✅ **RESOLVED** - Auth header construction:
   - Basic Auth header: `Authorization: Basic ${btoa(username + ':' + password)}`
   - If `OXYLABS_USERNAME` or `OXYLABS_PASSWORD` missing: log error server-side, return 503 "Transcript service unavailable"
   - If Oxylabs returns 401 (invalid creds): same approach - log real error, show generic message
   - End users can't fix config issues, so keep messages generic and actionable for developers via logs
2) ✅ **RESOLVED** - Video ID extraction:
   - Oxylabs `query` param takes **only the video ID** (e.g., `"WOD0mZnu-j0"`), not the full URL
   - Existing extraction logic in `app/getyoutubeinfo/page.js` → `extractVideoId()` handles:
     - `youtu.be/<id>`
     - `youtube.com/watch?v=<id>`
     - `youtube.com/shorts/<id>`
     - `youtube.com/embed/<id>`
   - Also: `app/utils/youtube.js` → `isValidYouTubeUrl()` validates + extracts videoId
   - **Action**: Consolidate into a shared util (or reuse `isValidYouTubeUrl`) and call from the API route before sending to Oxylabs
3) ✅ **RESOLVED** - Language/transcript defaults:
   - `language_code`: `"en"` (English)
   - `transcript_origin`: `"auto_generated"` (this is also Oxylabs' default if omitted)
   - No fallback logic for now — if no English auto-generated transcript exists, Oxylabs returns 404 and we show "No transcript in English available"
4) ✅ **RESOLVED** - Error mapping (Oxylabs → UI messages):
   | Code | Meaning | UI Message |
   |------|---------|------------|
   | `200` | Success | (show transcript) |
   | `400` | Bad request | "Invalid video URL. Please check and try again." |
   | `401` | Auth failure | "Transcript service unavailable" (log real error) |
   | `403` | Forbidden | "Transcript service unavailable" (log real error) |
   | `404` | Not found | "No transcript in English available" |
   | `422` | Invalid payload | "Something went wrong. Please try again." (log real error) |
   | `429` | Rate limited | "Service is busy. Please try again in a moment." |
   | `500` | Server error | "Transcript service temporarily unavailable. Please try again." |
   | `524` | Timeout | "Request timed out. Please try again." |
   | `612/613` | Job failed | "Failed to retrieve transcript. Please try again." |
   - Config/auth issues (401, 403) → generic message, user can't fix
   - 404 → specific "No transcript in English available"
   - Rate limit/server errors → "try again" messaging
5) ✅ **RESOLVED** - Transcript normalization:
   - Response contains two entry types: `transcriptSectionHeaderRenderer` (chapter markers) and `transcriptSegmentRenderer` (actual text)
   - **Section headers**: Skip — they're chapter markers, not spoken words
   - **Newlines in text** (`\n`): Replace with single space — they're arbitrary caption line breaks
   - **Empty/whitespace text**: Skip — no value
   - **Multiple spaces**: Collapse to single space
   - Mapping: `startMs` → display timestamp, `endMs` → display timestamp, `snippet.runs[].text` → joined and cleaned
   - Use new `normalizeOxylabsTranscript()` processor (see #8) — Oxylabs data is already clean, no VTT-style deduplication needed
6) ✅ **RESOLVED** - Backward compatibility:
   - Oxylabs returns structured JSON inline, not a VTT URL
   - **Remove these flows:**
     - `app/api/fetch-vtt/route.js` — no VTT URL to fetch
     - `app/api/job-status/route.js` — Realtime is synchronous, no polling needed
     - `transcriptUrl` in API responses — data is inline now
   - **Adapt these:**
     - Download functionality — generate VTT/SRT/TXT from structured transcript data on demand
     - `storeTranscript()` — store content directly, not a URL
7) ✅ **RESOLVED** - Testing / UI behavior:
   - UI alerts for all error cases are defined in #4 (error mapping)
   - "No transcript in English available" will display for 404 responses
   - Verify during implementation that errors render cleanly in the existing `ErrorMessage` component

---

## Additional Implementation Details

### 8) Transcript Processing Approach
Oxylabs returns clean, deduplicated segments — no need for the VTT-style `<c>` tag parsing in `processTranscriptAlgo1`.

**Decision:** Create a new, simpler processor for Oxylabs format.

**New file:** `app/utils/transcriptProcessor.js` (or update existing `transcriptProcessor.js` if it exists)

```javascript
/**
 * Normalizes Oxylabs transcript response to app format
 * @param {Object} oxylabsResponse - Raw response from Oxylabs API
 * @returns {Array} Normalized transcript array
 */
export function normalizeOxylabsTranscript(oxylabsResponse) {
  const content = oxylabsResponse?.results?.[0]?.content;
  if (!content || !Array.isArray(content)) return [];

  return content
    .filter(entry => entry.transcriptSegmentRenderer) // Skip section headers
    .map(entry => {
      const segment = entry.transcriptSegmentRenderer;
      const text = segment.snippet?.runs
        ?.map(run => run.text)
        .join('')
        .replace(/\n/g, ' ')      // Replace newlines with spaces
        .replace(/\s+/g, ' ')     // Collapse multiple spaces
        .trim();

      if (!text) return null;

      return {
        startTime: msToTimestamp(parseInt(segment.startMs, 10)),
        endTime: msToTimestamp(parseInt(segment.endMs, 10)),
        startMs: parseInt(segment.startMs, 10),
        endMs: parseInt(segment.endMs, 10),
        text
      };
    })
    .filter(Boolean); // Remove nulls
}

/**
 * Converts milliseconds to display timestamp (MM:SS or HH:MM:SS)
 */
export function msToTimestamp(ms) {
  const totalSeconds = Math.floor(ms / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  if (hours > 0) {
    return `${hours}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
  }
  return `${minutes}:${String(seconds).padStart(2, '0')}`;
}
```

**UI components update:**
- `TranscriptDisplay.js` — Detect Oxylabs format (no `<c>` tags) and skip `processTranscriptAlgo1`
- Or: Always use new processor since we're removing Sieve entirely

### 9) Database Schema Migration
Current `transcripts` table stores `transcript_url`. With inline content:

**Option chosen:** Add `transcript_content` column (JSONB), keep `transcript_url` nullable for backward compatibility.

**Migration SQL:**
```sql
ALTER TABLE transcripts
ADD COLUMN transcript_content JSONB;

COMMENT ON COLUMN transcripts.transcript_content IS 'Structured transcript data from Oxylabs';
```

**Update `store-transcript/route.js`:**
- Accept `transcriptContent` (JSON) instead of `transcriptUrl`
- Insert into `transcript_content` column

### 10) Download Formats Implementation
Generate VTT/SRT/TXT from structured transcript data client-side.

**New file:** `app/utils/transcriptExport.js`

```javascript
export function toVTT(transcript) {
  let vtt = 'WEBVTT\n\n';
  transcript.forEach((cue, i) => {
    vtt += `${i + 1}\n`;
    vtt += `${formatVTTTime(cue.startMs)} --> ${formatVTTTime(cue.endMs)}\n`;
    vtt += `${cue.text}\n\n`;
  });
  return vtt;
}

export function toSRT(transcript) {
  let srt = '';
  transcript.forEach((cue, i) => {
    srt += `${i + 1}\n`;
    srt += `${formatSRTTime(cue.startMs)} --> ${formatSRTTime(cue.endMs)}\n`;
    srt += `${cue.text}\n\n`;
  });
  return srt;
}

export function toTXT(transcript) {
  return transcript.map(cue => cue.text).join('\n');
}

function formatVTTTime(ms) {
  const date = new Date(ms);
  return date.toISOString().substr(11, 12); // HH:MM:SS.mmm
}

function formatSRTTime(ms) {
  return formatVTTTime(ms).replace('.', ','); // SRT uses comma
}
```

**UI:** Update `DownloadButton` to offer format dropdown (VTT, SRT, TXT).

### 11) Files to Delete
| File | Action |
|------|--------|
| `app/api/fetch-vtt/route.js` | Delete |
| `app/api/job-status/route.js` | Delete |
| `app/sievetranscripturl/page.js` | Delete |
| `app/utils/jobs.js` | Delete |
| `app/components/JobStatus.js` | Delete |

### 12) Files to Modify
| File | Changes |
|------|---------|
| `app/api/transcripts/route.js` | Rewrite POST to call Oxylabs; remove GET (no job polling) |
| `app/utils/fetchTranscript.js` | Remove polling logic; handle direct response |
| `app/utils/transcript.js` | Update `storeTranscript()` to send content, not URL |
| `app/api/store-transcript/route.js` | Accept content JSON instead of URL |
| `app/components/Header.js` | Remove "Sieve Transcript URL" nav link |
| `app/components/TranscriptDisplay.js` | Use new processor, skip `processTranscriptAlgo1` |
| `app/components/DownloadButton.js` | Add format options, generate from structured data |
| `app/page.js` | Remove `JobStatus` component and polling state |
| `README.md` | Update setup instructions for Oxylabs credentials |

### 13) Request Timeout Configuration
Set explicit 30-second timeout for Oxylabs requests:

```javascript
const controller = new AbortController();
const timeoutId = setTimeout(() => controller.abort(), 30000);

try {
  const response = await fetch(OXYLABS_ENDPOINT, {
    ...options,
    signal: controller.signal
  });
  // ...
} finally {
  clearTimeout(timeoutId);
}
```

If aborted, return 524 timeout error to client.

### 14) Sample Oxylabs Response Structure
```json
{
  "results": [
    {
      "content": [
        {
          "transcriptSectionHeaderRenderer": {
            "title": "Introduction",
            "startMs": "0"
          }
        },
        {
          "transcriptSegmentRenderer": {
            "startMs": "1234",
            "endMs": "5678",
            "snippet": {
              "runs": [
                { "text": "Hello and welcome " },
                { "text": "to my video" }
              ]
            }
          }
        }
      ],
      "status_code": 200
    }
  ]
}
```

### 15) Environment Variable Validation
Check at request time (consistent with current approach):

```javascript
const username = process.env.OXYLABS_USERNAME;
const password = process.env.OXYLABS_PASSWORD;

if (!username || !password) {
  console.error('Missing OXYLABS_USERNAME or OXYLABS_PASSWORD');
  return Response.json(
    { error: 'Transcript service unavailable' },
    { status: 503 }
  );
}
```

### 16) Testing Checklist
| Test Case | Video ID | Expected Result |
|-----------|----------|-----------------|
| Normal video with transcript | `dQw4w9WgXcQ` | Transcript displays |
| Video with no English transcript | TBD | "No transcript in English available" |
| Private/deleted video | TBD | "Invalid video URL" or similar |
| Very long video (2+ hours) | TBD | Transcript displays (may take longer) |
| Invalid video ID | `invalid123` | "Invalid video URL" |
| Rate limit simulation | — | "Service is busy" message |

**Regression tests:**
- [ ] Copy button works (timestamps, text-only, raw)
- [ ] View mode toggle works
- [ ] AI Summary generates from transcript
- [ ] Word count / WPM display correctly
- [ ] Download generates valid files

### 17) Future Expansion Notes
- **Language selector:** Add `language_code` parameter to API, UI dropdown
- **Transcript origin toggle:** Auto-generated vs. manual captions
- **Retry logic:** For 429, implement exponential backoff (optional enhancement)
