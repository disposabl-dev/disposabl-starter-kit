---
title: Uploading files
description: Send a file from the web app and save its key.
---

Use `useUploadFile` inside a component connected to the authenticated Convex provider.

```tsx
import { useUploadFile } from "@disposabl/disposabl-kit/client";

const uploadFile = useUploadFile();

// In an event handler:
const key = await uploadFile(file);
```

## What happens

The helper requests an upload URL, sends the file to the selected provider, and completes ownership and image-processing work before returning the key.

It supports upload progress through the optional `onProgress` callback.

## Save the result

Store the returned key on the record that owns the attachment. Request a [download URL](/docs/storage/downloads) when displaying it later.

## Large files and mobile

The direct web upload avoids sending file bytes as Convex function arguments. The base64 upload operation is better suited to small payloads.

The web helper accepts a browser `File`. A native upload flow still needs implementation.

Set app-specific file size and type restrictions before accepting uploads from users.
