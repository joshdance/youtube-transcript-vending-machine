# Oxylabs Web Scraper API Documentation

> Reference documentation for integrating Oxylabs YouTube Transcript API.
> 
> Sources:
> - https://developers.oxylabs.io/scraping-solutions/web-scraper-api/targets/youtube/youtube-transcript
> - https://developers.oxylabs.io/scraping-solutions/web-scraper-api/integration-methods
> - https://developers.oxylabs.io/scraping-solutions/web-scraper-api

---

## Overview

Oxylabs Web Scraper API provides structured data extraction from various websites including YouTube. For YouTube transcripts, use the `youtube_transcript` source.

**Key Points:**
- Transcripts are **separate from subtitles and closed captions (CC)**
- To extract subtitles/CC, use `youtube_subtitles` source instead
- Requires a YouTube **video ID** (not full URL)

---

## Integration Methods

Web Scraper API supports **three integration methods**:

### 1. Realtime (Synchronous) ⭐ Recommended for this app

- **How it works:** Send request → Keep connection open → Receive result or error
- **Best for:** Single requests, JSON payloads with scraping parameters
- **Endpoint:** `https://realtime.oxylabs.io/v1/queries`
- **Timeout (TTL):** 150 seconds

```javascript
const response = await fetch('https://realtime.oxylabs.io/v1/queries', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': 'Basic ' + Buffer.from('USERNAME:PASSWORD').toString('base64')
  },
  body: JSON.stringify({
    source: 'youtube_transcript',
    query: 'VIDEO_ID',
    context: [
      { key: 'language_code', value: 'en' },
      { key: 'transcript_origin', value: 'auto_generated' }
    ]
  })
});
```

### 2. Push-Pull (Asynchronous)

- **How it works:** Submit job → Get job ID → Poll for status → Download results
- **Best for:** Batch queries, large data volumes
- **Supports:** Uploading results to AWS S3 or Google Cloud Storage
- **Recommended for:** High-volume production use

### 3. Proxy Endpoint (Synchronous)

- **How it works:** Use Oxylabs endpoint like a proxy
- **Best for:** Users familiar with proxy-based scraping

---

## YouTube Transcript API

### Request Parameters

| Parameter | Description | Required | Default |
|-----------|-------------|----------|---------|
| `source` | Scraper type | ✅ | `youtube_transcript` |
| `query` | YouTube video ID (e.g., `WOD0mZnu-j0`) | ✅ | - |
| `context[].language_code` | Transcript language code | ✅ | - |
| `context[].transcript_origin` | `auto_generated` or `uploader_provided` | ❌ | `auto_generated` |
| `callback_url` | URL for async notifications (Push-Pull only) | ❌ | - |

### Language Codes

Common values:
- `en` - English
- `es` - Spanish
- `fr` - French
- `de` - German
- `ja` - Japanese
- `ko` - Korean
- `pt` - Portuguese
- `zh` - Chinese

> **Note:** If the provided `language_code` has no matching transcript, the API returns a `404` status.

### Transcript Origin

| Value | Description |
|-------|-------------|
| `auto_generated` | YouTube's automatic captions (default) |
| `uploader_provided` | Manual captions uploaded by video creator |

---

## Request Examples

### cURL

```bash
curl 'https://realtime.oxylabs.io/v1/queries' \
  --user 'USERNAME:PASSWORD' \
  -H 'Content-Type: application/json' \
  -d '{
    "source": "youtube_transcript",
    "query": "WOD0mZnu-j0",
    "context": [
      { "key": "language_code", "value": "en" },
      { "key": "transcript_origin", "value": "auto_generated" }
    ]
  }'
```

### Node.js

```javascript
const https = require("https");

const username = "USERNAME";
const password = "PASSWORD";

const body = {
  source: "youtube_transcript",
  query: "WOD0mZnu-j0",
  context: [
    { key: "language_code", value: "en" },
    { key: "transcript_origin", value: "uploader_provided" }
  ]
};

const options = {
  hostname: "realtime.oxylabs.io",
  path: "/v1/queries",
  method: "POST",
  headers: {
    "Content-Type": "application/json",
    "Authorization": "Basic " + Buffer.from(`${username}:${password}`).toString("base64")
  }
};

const request = https.request(options, (response) => {
  let data = "";
  response.on("data", (chunk) => { data += chunk; });
  response.on("end", () => {
    const responseData = JSON.parse(data);
    console.log(JSON.stringify(responseData, null, 2));
  });
});

request.write(JSON.stringify(body));
request.end();
```

### Python

```python
import requests
from pprint import pprint

payload = {
    'source': 'youtube_transcript',
    'query': 'WOD0mZnu-j0',
    'context': [
        { 'key': 'language_code', 'value': 'en' },
        { 'key': 'transcript_origin', 'value': 'uploader_provided' }
    ]
}

response = requests.post(
    'https://realtime.oxylabs.io/v1/queries',
    auth=('USERNAME', 'PASSWORD'),
    json=payload
)

pprint(response.json())
```

---

## Response Structure

### Success Response (200)

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

### Content Entry Types

| Type | Description | Action |
|------|-------------|--------|
| `transcriptSectionHeaderRenderer` | Chapter/section markers | **Skip** — not spoken content |
| `transcriptSegmentRenderer` | Actual transcript text | **Extract** — this is the transcript |

### Transcript Segment Fields

| Field | Type | Description |
|-------|------|-------------|
| `startMs` | string | Start time in milliseconds |
| `endMs` | string | End time in milliseconds |
| `snippet.runs` | array | Text segments to concatenate |
| `snippet.runs[].text` | string | Partial text (may contain `\n`) |

---

## Response Codes

| Code | Meaning | Handling |
|------|---------|----------|
| `200` | Success | Parse and display transcript |
| `400` | Bad request (invalid parameters) | Show "Invalid video URL" |
| `401` | Authentication failure | Log error, show "Service unavailable" |
| `403` | Forbidden | Log error, show "Service unavailable" |
| `404` | No transcript found | Show "No transcript in [language] available" |
| `422` | Invalid payload | Log error, show "Something went wrong" |
| `429` | Rate limited | Show "Service is busy, try again" |
| `500` | Server error | Show "Service temporarily unavailable" |
| `524` | Timeout | Show "Request timed out" |

---

## Authentication

Oxylabs uses **HTTP Basic Authentication**.

```
Authorization: Basic base64(USERNAME:PASSWORD)
```

### In Node.js:

```javascript
const auth = Buffer.from(`${username}:${password}`).toString('base64');
headers['Authorization'] = `Basic ${auth}`;
```

### In Browser (client-side):

```javascript
const auth = btoa(`${username}:${password}`);
headers['Authorization'] = `Basic ${auth}`;
```

> ⚠️ **Never expose credentials client-side.** Always call Oxylabs from your server.

---

## Best Practices

1. **Use Realtime for single requests** — simpler, fewer moving parts
2. **Set explicit timeouts** — TTL is 150 seconds, but set your own (e.g., 30s)
3. **Handle 404 gracefully** — not all videos have transcripts in all languages
4. **Log errors server-side** — don't expose API details to users
5. **Cache responses** — transcripts rarely change, consider caching

---

## Related Oxylabs YouTube APIs

| Source | Purpose |
|--------|---------|
| `youtube_transcript` | Get transcript text with timestamps |
| `youtube_subtitles` | Get subtitles/closed captions (different from transcript) |
| `youtube_metadata` | Get video metadata (title, description, etc.) |
| `youtube_search` | Search YouTube |
| `youtube_channel` | Get channel information |

---

## Links

- [YouTube Transcript Docs](https://developers.oxylabs.io/scraping-solutions/web-scraper-api/targets/youtube/youtube-transcript)
- [Integration Methods](https://developers.oxylabs.io/scraping-solutions/web-scraper-api/integration-methods)
- [Web Scraper API Overview](https://developers.oxylabs.io/scraping-solutions/web-scraper-api)
- [Response Codes Reference](https://developers.oxylabs.io/scraping-solutions/web-scraper-api/response-codes)
- [Web Scraper API Playground](https://developers.oxylabs.io/scraping-solutions/web-scraper-api/web-scraper-api-playground)

