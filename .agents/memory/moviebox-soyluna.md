---
name: MovieBox Soy Luna stream integration
description: How to get working MP4 streams for Soy Luna from themoviebox.org API
---

## Rule
The MovieBox API at `https://themoviebox.org/wefeed-h5api-bff/subject/play` has `Access-Control-Allow-Origin: *` and returns signed time-limited MP4 URLs. These URLs are IP-bound — they only work from the IP that made the API request. Must call from the browser (client-side fetch), not from the server.

## Key Details
- Soy Luna main subjectId: `7144491624448803360` (original audio, source: fzmovies.cms)
- esla dub (Spanish Latino) subjectId: `5649565924752610840`
- Detail path: `soy-luna-O7Z36yxQLv8`
- API: `GET https://themoviebox.org/wefeed-h5api-bff/subject/play?subjectId=...&se={season}&ep={episode}`
- Returns 360p and 720p MP4 stream URLs. All 220 episodes (3 seasons) available.
- URLs expire (have `sign` + `t` timestamp parameters), regenerate per request
- CDN returns empty/403 if request comes from data center IP

## IP Restriction
- The `/play` endpoint returns `{"hasResource":false,"streams":[]}` from ANY data center IP (Replit server, etc.)
- Works correctly ONLY from residential/mobile IPs (real user browsers)
- `X-Forwarded-For` proxy trick does NOT work — MovieBox ignores it
- Backend proxy of this endpoint will ALWAYS fail

## Correct Implementation
- Use `referrerPolicy: 'no-referrer'` in client-side fetch to avoid Referer leaking
- Stream URL property can be `url`, `videoUrl`, `streamUrl`, or `stream` — try all
- Quality matching: `x.resolution` is a number (720), not a string ("720") — use parseInt()
- Use `<video>` element with `type: 'native'` server config

**Why:** IP-bound signatures mean server-side proxying always fails. Client-side fetch generates signatures for the user's IP, which the CDN accepts.

**How to apply:** In frontend JS, call the MovieBox API directly with `referrerPolicy: 'no-referrer'`. Never proxy through backend.
