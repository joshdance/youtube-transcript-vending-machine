# Oxylabs YouTube Transcript API - Support Issue Report

**Date:** January 1, 2025  
**Client ID:** 147757  
**Service:** Web Scraper API - `youtube_transcript` source  
**Status:** All requests return `status: "faulted"` with `status_code: 613` and empty content

---

## Problem Summary

The `youtube_transcript` source consistently returns failed jobs with empty content regardless of:
- Video ID tested
- `transcript_origin` value (`auto_generated`, `uploader_provided`, or omitted)
- Language code used

All requests return HTTP 200, but the job status is `"faulted"` with `status_code: 613` and `content: ""` (empty string).

---

## Error Details

### Response Structure (Always the Same)

```json
{
  "results": [{
    "content": "",
    "status_code": 613,
    "url": "https://www.youtube.com/youtubei/v1/get_transcript?prettyPrint=false",
    "type": "raw",
    "created_at": "2026-01-01 03:21:27",
    "updated_at": "2026-01-01 03:21:41"
  }],
  "job": {
    "status": "faulted",
    "status_code": 613,
    ...
  }
}
```

**Key Observations:**
- HTTP response: `200 OK`
- Job status: `"faulted"`
- Result status_code: `613`
- Content: Empty string (`""`)
- Response time: ~12-38 seconds

---

## Test Cases Performed

### Test 1: Video ID `6H_AgyPO2qA`
- Request: `auto_generated` transcript, language `en`
- Response time: 14,938ms
- Result: `status: "faulted"`, `status_code: 613`, empty content

### Test 2: Video ID `6H_AgyPO2qA`
- Request: `uploader_provided` transcript, language `en`
- Response time: 33,799ms
- Result: `status: "faulted"`, `status_code: 613`, empty content

### Test 3: Video ID `6H_AgyPO2qA`
- Request: No `transcript_origin` specified (default), language `en`
- Response time: 12,442ms
- Result: `status: "faulted"`, `status_code: 613`, empty content

### Test 4: Video ID `WOD0mZnu-j0` (From Oxylabs Documentation)
- Request: `auto_generated` transcript, language `en`
- Response time: 37,739ms
- Result: `status: "faulted"`, `status_code: 613`, empty content

### Test 5: Video ID `dQw4w9WgXcQ` (Rick Astley - Popular Video)
- Expected: Should have transcripts available
- Result: Same faulted status

**Conclusion:** The issue is **not video-specific** and affects all tested videos, including the example from your documentation.

---

## Requests Sent

All requests use the Realtime endpoint with Basic Authentication:

### Request Format
```http
POST https://realtime.oxylabs.io/v1/queries
Authorization: Basic [base64 encoded username:password]
Content-Type: application/json
```

### Request Bodies Tested

**1. With `auto_generated`:**
```json
{
  "source": "youtube_transcript",
  "query": "6H_AgyPO2qA",
  "context": [
    { "key": "language_code", "value": "en" },
    { "key": "transcript_origin", "value": "auto_generated" }
  ]
}
```

**2. With `uploader_provided`:**
```json
{
  "source": "youtube_transcript",
  "query": "6H_AgyPO2qA",
  "context": [
    { "key": "language_code", "value": "en" },
    { "key": "transcript_origin", "value": "uploader_provided" }
  ]
}
```

**3. Without `transcript_origin` (default):**
```json
{
  "source": "youtube_transcript",
  "query": "6H_AgyPO2qA",
  "context": [
    { "key": "language_code", "value": "en" }
  ]
}
```

**Note:** All three formats produce identical results (faulted status).

---

## Response Headers

```
date: Thu, 01 Jan 2026 03:21:41 GMT
content-type: application/json
x-ratelimit-total-requests-019b7688-2ce2-712a-97da-dd9454b04399-limit: 10
x-ratelimit-total-requests-019b7688-2ce2-712a-97da-dd9454b04399-remaining: 9
x-oxylabs-traffic-generated: 0
x-oxylabs-job-id: 7412332101632043009
x-oxylabs-client-id: 147757
x-oxylabs-trace-id: 6955e837-f81a7af85fe10a1aaaecdc2b
```

**Observations:**
- Authentication appears successful (no 401/403 errors)
- Rate limits not exceeded
- Job IDs are generated correctly
- Trace IDs are provided

---

## Job Information

From one of the failed jobs:

```json
{
  "id": "7412332101632043009",
  "status": "faulted",
  "source": "youtube_transcript",
  "query": "6H_AgyPO2qA",
  "created_at": "2026-01-01 03:21:27",
  "updated_at": "2026-01-01 03:21:41",
  "domain": "com",
  "subdomain": "www",
  "user_agent_type": "desktop",
  "content_encoding": "utf-8",
  "context": [
    { "key": "force_headers", "value": false },
    { "key": "force_cookies", "value": false },
    { "key": "hc_policy", "value": true },
    { "key": "language_code", "value": "en" },
    { "key": "transcript_origin", "value": "auto_generated" }
  ]
}
```

**URL Attempted:**
- `url: "https://www.youtube.com/youtubei/v1/get_transcript?prettyPrint=false"`

---

## Troubleshooting Steps Taken

1. ✅ **Verified credentials** - Authentication works (no 401/403 errors)
2. ✅ **Tested multiple video IDs** - Issue persists across different videos
3. ✅ **Tested all `transcript_origin` values** - `auto_generated`, `uploader_provided`, and default
4. ✅ **Tested documentation example** - Even `WOD0mZnu-j0` from your docs fails
5. ✅ **Verified request format** - Matches documentation exactly
6. ✅ **Checked rate limits** - Not exceeded (9/10 remaining)
7. ✅ **Examined response structure** - Job is created but immediately faults
8. ✅ **Tested with different language codes** - Same result

---

## Code Example

### Test Script Used

```javascript
const https = require("https");

const username = "YOUR_USERNAME";
const password = "YOUR_PASSWORD";

const body = {
  source: "youtube_transcript",
  query: "6H_AgyPO2qA",
  context: [
    { key: "language_code", value: "en" },
    { key: "transcript_origin", value: "auto_generated" }
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
    const result = JSON.parse(data);
    console.log("Status:", result.job.status);  // Always "faulted"
    console.log("Status Code:", result.results[0].status_code);  // Always 613
    console.log("Content:", result.results[0].content);  // Always ""
  });
});

request.write(JSON.stringify(body));
request.end();
```

---

## Questions for Oxylabs Support

1. **Is `youtube_transcript` enabled for Client ID 147757?**
   - Does our subscription tier include this source?

2. **What does status_code 613 mean?**
   - Is this a known issue with the YouTube transcript scraper?

3. **Has YouTube changed their internal API?**
   - Is the scraper outdated or broken?

4. **Are there any account-level restrictions?**
   - Do we need to enable anything in the dashboard?

5. **Can you check the internal logs for these job IDs?**
   - Job IDs: `7412332101632043009`, `7412332161623145473`, `7412332303373857793`
   - Trace IDs: `6955e837-f81a7af85fe10a1aaaecdc2b`, `6955e845-42893c2cc49d5bea93e5af5a`, `6955e867-ae046a144b998d573c59598e`

6. **Is there an alternative method or endpoint we should use?**

---

## Expected vs Actual Behavior

### Expected (According to Documentation)
```json
{
  "results": [{
    "content": [
      {
        "transcriptSegmentRenderer": {
          "startMs": "1234",
          "endMs": "5678",
          "snippet": {
            "runs": [{ "text": "Hello and welcome " }]
          }
        }
      }
    ],
    "status_code": 200
  }]
}
```

### Actual
```json
{
  "results": [{
    "content": "",
    "status_code": 613
  }],
  "job": {
    "status": "faulted"
  }
}
```

---

## Environment Details

- **API Endpoint:** `https://realtime.oxylabs.io/v1/queries`
- **Integration Method:** Realtime (Synchronous)
- **Authentication:** HTTP Basic Auth
- **Request Format:** JSON
- **Response Format:** JSON

---

## Impact

- **Blocking:** Yes - Cannot retrieve any YouTube transcripts
- **Workaround:** None found - All videos tested fail identically
- **Business Impact:** Cannot use Oxylabs for YouTube transcript extraction

---

## Next Steps Requested

1. Please investigate why all `youtube_transcript` requests are faulting
2. Confirm if this is a service-wide issue or account-specific
3. Provide timeline for resolution
4. If possible, check internal scraper logs for the provided job/trace IDs

---

## Contact Information

- **Client ID:** 147757
- **Issue reported:** January 1, 2025
- **Urgency:** High - Feature completely non-functional

---

**Thank you for your assistance!**

