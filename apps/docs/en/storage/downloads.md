---
title: Access and download URLs
description: Open files that belong to the current account.
---

Use the saved file key to request a download URL:

```tsx
import { useAction } from "convex/react";
import { api } from "@disposabl/backend/_generated/api";

const getUrl = useAction(api.disposabl.getUrl);

// In an event handler:
const url = await getUrl({ key });
```

## Account access

The backend checks the signed-in account before resolving a file key. Files are shared within that organization.

## URL lifetime

R2 download URLs expire after 15 minutes. Request a fresh URL when needed. Convex files use Convex-generated download URLs.

Anyone who has a download URL can use it while it remains valid. Keep URLs out of public records when the file is private.

## Changing storage providers

Existing keys keep using their original provider. R2 files still need R2 configuration to remain downloadable.
