---
title: Storage
description: Upload files and retrieve them from your app.
---

Files use Convex storage by default. Configure all four R2 environment values to use Cloudflare R2 for new uploads.

## Uploads

The web upload helper sends file bytes directly to storage and returns a durable file key. Save that key with your app's record.

See [uploading files](/docs/storage/uploads).

## Downloads

Ask the backend for a URL when a file needs to be opened. Keep file keys in your records rather than temporary R2 URLs.

See [access and download URLs](/docs/storage/downloads).

## Provider setup

Changing the provider only affects new uploads. Existing files stay with their original provider.

The [file upload reference](/docs/files) covers R2 configuration, optional image compression, and the lower-level upload operation.
