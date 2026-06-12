---
name: MovieBox Soy Luna stream integration
description: How to get working MP4 streams for Soy Luna from themoviebox.org API
---

## Rule
The MovieBox API at `https://themoviebox.org/wefeed-h5api-bff/subject/play` has `Access-Control-Allow-Origin: *` and returns signed time-limited MP4 URLs. These URLs are IP-bound — they only work from the IP that made the API request. Must call from the browser (client-side fetch), not from the server.

## Key Details
- Soy Luna subjectId: `7144491624448803360`
- API endpoint: `GET https://themoviebox.org/wefeed-h5api-bff/subject/play?subjectId=7144491624448803360&se={season}&ep={episode}`
- Returns 360p and 720p MP4 stream URLs from `bcdnxw.hakunaymatata.com`
- All 220 episodes (3 seasons) are available and tested
- URLs expire (have `sign` + `t` timestamp parameters), regenerate per request
- CDN returns 403 if request comes from wrong IP (even with correct Referer)

**Why:** IP-bound signatures mean server-side proxying always fails. Client-side fetch generates signatures for the user's IP, which the CDN accepts.

**How to apply:** In frontend JS, call the MovieBox API directly, get the MP4 URL, set as `<video>` src. Never proxy through backend.
