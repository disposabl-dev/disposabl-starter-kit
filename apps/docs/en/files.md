---
title: File uploads
description: Upload files to Cloudflare R2 with one operation.
---

## Configure R2

Create a private R2 bucket and an R2 API token with Object Read & Write permission
limited to that bucket. Set these variables on each Convex deployment:

```sh
bun run --cwd packages/backend convex env set R2_BUCKET <bucket-name>
bun run --cwd packages/backend convex env set R2_ENDPOINT https://<account-id>.r2.cloudflarestorage.com
bun run --cwd packages/backend convex env set R2_ACCESS_KEY_ID <access-key-id>
bun run --cwd packages/backend convex env set R2_SECRET_ACCESS_KEY <secret-access-key>
```

Keep credentials in Convex. Never put them in frontend environment variables.
Missing R2 configuration only prevents file operations; other app functions can
still deploy. The account API token value is not needed for these S3 operations.

Add a bucket CORS policy for your frontend origins. Replace these example origins
with your development and production URLs:

```json
[
  {
    "AllowedOrigins": ["http://localhost:3000", "https://example.com"],
    "AllowedMethods": ["GET", "PUT"],
    "AllowedHeaders": ["Content-Type"]
  }
]
```

Deploy the component and functions after configuration:

```sh
bun run --cwd packages/backend convex dev --once
```

## Frontend

Inside a component wrapped in the app's authenticated Convex provider:

```tsx
import { useUploadFile } from "@disposabl/disposabl-kit/client";

const uploadFile = useUploadFile();
const key = await uploadFile(file, {
  onProgress: ({ loaded, total }) => console.log(loaded, total),
});
```

The shared hook uses the official `@convex-dev/r2/react` hook. It requests an
authenticated upload URL, sends the file directly to R2 with `PUT`, then requests
metadata synchronization. The returned key identifies the file; store that key
in your app's records rather than storing a signed URL.

Get a download URL when needed:

```tsx
import { useAction } from "convex/react";
import { api } from "@disposabl/backend/_generated/api";

const getUrl = useAction(api.disposabl.getUrl);
// In an event handler:
const url = await getUrl({ key });
```

Import the generated Convex API through `@disposabl/backend/_generated/api`.
Download URLs expire after 15 minutes. Call `getUrl` again when a fresh URL is
needed; it is an action so Convex does not cache an expired URL.

## API, CLI, and MCP

Call `uploadFile` once with the file's base64 contents:

```json
{
  "base64": "SGVsbG8gd29ybGQ=",
  "filename": "hello.txt",
  "contentType": "text/plain"
}
```

It uploads to R2, waits for metadata synchronization, and returns `{ key, url }`.
The URL is ready to download and expires after 15 minutes. Keep the durable key
and use `getUrl` when a fresh URL is needed. Filename and content type are optional;
the default content type is `application/octet-stream`.

The public Convex action is `api.disposabl.uploadFile`. The platform entrypoint
`disposabl:uploadFileInternal` is marked for API/MCP exposure; the upload URL and metadata helpers are frontend
implementation details and are not exposed to these transports.

The API/MCP transport must authenticate the caller and inject trusted `orgId`,
`userId`, and `role`. The CLI and SDK packages are currently scaffolds, and the
API/MCP transport adapters still need registration. Once wired to this operation,
they require one upload invocation with no follow-up upload or sync calls.

Base64 payloads count toward Convex's function argument limit. Larger files should
use the frontend helper, which uploads directly to R2 without passing file bytes
through a Convex action. See [Convex limits](https://docs.convex.dev/production/state/limits).

Files are shared within the authenticated organization, including its members.
The server generates an organization prefix and a random UUID for each key and
rejects access through another organization's functions. Signed upload and
download URLs are bearer credentials: anyone holding one can use it until it
expires. Upload URLs can be reused until expiry; they are not single-use grants.
This initial flow has no application-specific size/type limits, multipart upload,
or cleanup of abandoned uploads. Existing Convex `_storage` files are not migrated.

See the [R2 component](https://github.com/get-convex/r2) and
[Cloudflare presigned URL documentation](https://developers.cloudflare.com/r2/api/s3/presigned-urls/).
