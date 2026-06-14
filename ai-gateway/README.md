# Bornstar AI Gateway

Shared Cloudflare Worker AI Gateway for TripCompass AI and future Bornstar services.

## Worker

- Name: `bornstar-ai-gateway`
- First deployment target: `workers.dev`
- Placement hint: `aws:us-east-1`
- Health check: `GET /health`
- Recommendation endpoint: `POST /api/recommend`

## Environment Variables And Secrets

Required secret:

```bash
wrangler secret put OPENAI_API_KEY
```

Optional variables/secrets:

```bash
wrangler secret put TRIPCOMPASS_BACKEND_SECRET
wrangler secret put OPENAI_MODEL
```

`OPENAI_MODEL` defaults to `gpt-5.4-mini` when unset.

When `TRIPCOMPASS_BACKEND_SECRET` is set, callers must send:

```text
X-TripCompass-Backend-Secret: <secret>
```

## Deploy

```bash
cd ai-gateway
wrangler deploy
```

After deployment, set the TripCompass Pages environment variable `AI_BACKEND_URL` to the Worker endpoint, for example:

```text
https://bornstar-ai-gateway.<account>.workers.dev/api/recommend
```

## Smoke Test

The smoke test uses mocked OpenAI fetch responses and does not require network access or real secrets.

```bash
node ai-gateway/scripts/smoke-test.mjs
```
