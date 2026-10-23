---
title: File uploads
description: Upload files with Convex storage or Cloudflare R2.
---

Files use Convex storage by default. No Cloudflare account or storage credentials
are required. When all four R2 variables below contain values, new uploads use
Cloudflare R2 instead. Partial R2 configuration falls back to Convex storage.

Keep the returned file key in your app's records. Convex file keys map to storage
IDs in the `files` table, which records organization ownership. Existing keys keep
using their original provider when configuration changes. R2 files still require
R2 credentials to download; files are not copied between providers.

## Configure R2, optional

Create a private R2 bucket and an R2 API token with Object Read & Write permission
limited to that bucket. Set these variables on each Convex deployment:

```sh
bun run --cwd packages/backend convex env set R2_BUCKET <bucket-name>
bun run --cwd packages/backend convex env set R2_ENDPOINT https://<account-id>.r2.cloudflarestorage.com
bun run --cwd packages/backend convex env set R2_ACCESS_KEY_ID <access-key-id>
bun run --cwd packages/backend convex env set R2_SECRET_ACCESS_KEY <secret-access-key>
```

Keep credentials in Convex. Never put them in frontend environment variables.
The account API token value is not needed for these S3 operations.

For either storage provider, set `TINIFY_API_KEY` on the Convex deployment to
enable image compression. PNG, JPEG, WebP, AVIF, and JPEG XL uploads keep their
original format. Unsupported
formats and other files pass through unchanged. If Tinify is not configured,
uploads keep their original bytes. With a configured key, compression failures
fail the upload operation so callers can retry. Larger compression results are
discarded in favor of the original file.

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

The shared hook requests an authenticated upload URL and sends the file directly
to the selected provider. Convex uploads use `POST`; R2 uploads use `PUT`. It then
records ownership for Convex files or synchronizes R2 metadata and waits for image
compression before returning the durable key. File bytes do not pass through
Convex function arguments. The hook supports upload progress with either provider.

Get a download URL when needed:

```tsx
import { useAction } from "convex/react";
import { api } from "@disposabl/backend/_generated/api";

const getUrl = useAction(api.disposabl.getUrl);
// In an event handler:
const url = await getUrl({ key });
```

Import the generated Convex API through `@disposabl/backend/_generated/api`.
R2 download URLs expire after 15 minutes. Call `getUrl` when you need a URL for
either provider; it is an action so Convex does not cache an expired R2 URL.

## API, CLI, and MCP

Call `uploadFile` once with the file's base64 contents:

```json
{
  "base64": "SGVsbG8gd29ybGQ=",
  "filename": "hello.txt",
  "contentType": "text/plain"
}
```

It compresses supported images, uploads to the selected provider, and returns
`{ key, url }` after the file is ready to download. Keep the durable key and use
`getUrl` when a URL is needed. R2 URLs expire after 15 minutes. Filename and
content type are optional; the default content type is `application/octet-stream`.

The public Convex action is `api.disposabl.uploadFile`. The platform entrypoint
`disposabl:uploadFileInternal` is marked for API/MCP exposure; the upload URL and metadata helpers are frontend
implementation details and are not exposed to these transports.

The API/MCP transport authenticates the caller and injects trusted `orgId`,
`userId`, and `role`. Enable the required transport through
`DISPOSABL_PLATFORMS`. These transports use one upload invocation with no
follow-up upload or sync calls. The CLI and SDK packages are still placeholders.
See [API, CLI, and MCP](/docs/interfaces) for transport setup.

Base64 payloads count toward Convex's function argument limit. Larger files should
use the frontend helper, which uploads directly to storage without passing file
bytes through a Convex action. See [Convex limits](https://docs.convex.dev/production/state/limits).

Files are shared within the authenticated organization, including its members.
The server generates an organization prefix and a random UUID for each key and
rejects access through another organization's functions. Upload and download URLs
are bearer credentials: anyone holding one can use it while it remains valid. Upload URLs can be reused until expiry; they are not
single-use grants.
This initial flow has no application-specific size/type limits, multipart upload,
or cleanup of abandoned uploads. Existing Convex `_storage` files are not migrated.

See [Convex file storage](https://docs.convex.dev/file-storage), the [R2 component](https://github.com/get-convex/r2) and
[Cloudflare presigned URL documentation](https://developers.cloudflare.com/r2/api/s3/presigned-urls/).
