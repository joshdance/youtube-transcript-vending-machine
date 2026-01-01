/**
 * Direct Oxylabs API Test Script
 * 
 * Usage: 
 *   node test-oxylabs.js
 * 
 * Or with custom video:
 *   node test-oxylabs.js VIDEO_ID
 * 
 * Make sure OXYLABS_USERNAME and OXYLABS_PASSWORD are set in .env.local
 */

const https = require("https");
const fs = require("fs");
const path = require("path");

// Load .env.local
function loadEnv() {
  try {
    const envPath = path.join(__dirname, '.env.local');
    const envContent = fs.readFileSync(envPath, 'utf8');
    envContent.split('\n').forEach(line => {
      const [key, ...valueParts] = line.split('=');
      if (key && valueParts.length > 0) {
        process.env[key.trim()] = valueParts.join('=').trim();
      }
    });
  } catch (e) {
    console.log('Could not load .env.local:', e.message);
  }
}

loadEnv();

const username = process.env.OXYLABS_USERNAME;
const password = process.env.OXYLABS_PASSWORD;
const videoId = process.argv[2] || "6H_AgyPO2qA"; // Default to Rick Astley

console.log("=".repeat(60));
console.log("OXYLABS API DIRECT TEST");
console.log("=".repeat(60));
console.log("Username:", username ? `${username.substring(0, 3)}...` : "NOT SET");
console.log("Password:", password ? "***SET***" : "NOT SET");
console.log("Video ID:", videoId);
console.log("=".repeat(60));

if (!username || !password) {
  console.error("\n❌ ERROR: OXYLABS_USERNAME and OXYLABS_PASSWORD must be set in .env.local");
  process.exit(1);
}

async function testOxylabs(transcriptOrigin = null) {
  return new Promise((resolve, reject) => {
    const context = [{ key: "language_code", value: "en" }];
    if (transcriptOrigin) {
      context.push({ key: "transcript_origin", value: transcriptOrigin });
    }

    const body = {
      source: "youtube_transcript",
      query: videoId,
      context
    };

    console.log("\n" + "-".repeat(60));
    console.log(`TEST: transcript_origin = ${transcriptOrigin || "(not specified)"}`);
    console.log("-".repeat(60));
    console.log("Request body:", JSON.stringify(body, null, 2));

    const options = {
      hostname: "realtime.oxylabs.io",
      path: "/v1/queries",
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": "Basic " + Buffer.from(`${username}:${password}`).toString("base64"),
      },
    };

    const startTime = Date.now();

    const request = https.request(options, (response) => {
      let data = "";

      console.log("\nResponse status:", response.statusCode);
      console.log("Response headers:", JSON.stringify(response.headers, null, 2));

      response.on("data", (chunk) => {
        data += chunk;
      });

      response.on("end", () => {
        const elapsed = Date.now() - startTime;
        console.log(`\nResponse time: ${elapsed}ms`);
        console.log("Response size:", data.length, "bytes");

        try {
          const responseData = JSON.parse(data);
          
          // Log structure
          console.log("\nResponse keys:", Object.keys(responseData));
          
          if (responseData.results && responseData.results[0]) {
            const result = responseData.results[0];
            console.log("\nResult keys:", Object.keys(result));
            console.log("Result status_code:", result.status_code);
            console.log("Result url:", result.url);
            console.log("Content type:", typeof result.content);
            
            if (typeof result.content === 'string') {
              console.log("Content length:", result.content.length);
              if (result.content.length > 0) {
                console.log("Content preview (first 500 chars):");
                console.log(result.content.substring(0, 500));
              } else {
                console.log("Content is EMPTY STRING");
              }
            } else if (Array.isArray(result.content)) {
              console.log("Content is array with", result.content.length, "items");
              if (result.content.length > 0) {
                console.log("First item keys:", Object.keys(result.content[0]));
                console.log("First item:", JSON.stringify(result.content[0], null, 2));
              }
            }
          }
          
          if (responseData.job) {
            console.log("\nJob info:", JSON.stringify(responseData.job, null, 2));
          }

          // Full response for reference
          console.log("\n--- FULL RESPONSE ---");
          console.log(JSON.stringify(responseData, null, 2));
          
          resolve(responseData);
        } catch (e) {
          console.error("Failed to parse JSON:", e.message);
          console.log("Raw response:", data);
          resolve({ error: e.message, raw: data });
        }
      });
    });

    request.on("error", (error) => {
      console.error("Request error:", error);
      reject(error);
    });

    request.write(JSON.stringify(body));
    request.end();
  });
}

async function runTests() {
  try {
    // Test 1: auto_generated
    await testOxylabs("auto_generated");
    
    // Test 2: uploader_provided  
    await testOxylabs("uploader_provided");
    
    // Test 3: no origin specified (default)
    await testOxylabs(null);
    
    console.log("\n" + "=".repeat(60));
    console.log("ALL TESTS COMPLETE");
    console.log("=".repeat(60));
  } catch (error) {
    console.error("Test failed:", error);
  }
}

runTests();

