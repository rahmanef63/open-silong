# Files API — `convex/features/files/`

Convex storage upload flow. Three-step: generate URL → POST blob →
confirm ownership. Image block depends on this; future bookmark /
video / PDF / audio blocks will too.

Source: `convex/features/files/{mutations,queries}.ts`. Schema:
`convex/schema.ts:files` with index `by_storage`.

---

## Schema shape

```ts
interface FileRow {
  _id: Id<"files">;
  userId: Id<"users">;
  storageId: string;       // Convex `_storage` id
  createdAt: number;
}
```

The actual blob lives in Convex's `_storage` system table. The
`files` table is purely an **ownership ledger** — without an entry,
no client can delete the blob through `remove` (only super-admin
can purge orphans).

---

## Mutations

### `generateUploadUrl() → string`

Auth: any authenticated user. Returns a signed Convex upload URL
that expires after a short TTL (Convex internal). Client POSTs the
binary directly to this URL, receives `{storageId}`.

```ts
const uploadUrl = await generateUploadUrl();
const res = await fetch(uploadUrl, {
  method: "POST",
  headers: { "Content-Type": file.type },
  body: file,
});
const { storageId } = await res.json();
```

Convex enforces:
- Per-deploy file-size cap (configurable; current self-hosted default
  applies)
- Content-Type echo (the `Content-Type` header is stored alongside
  the blob and used by `getUrl`)

### `confirmUpload({storageId}) → Id<"files">`

Records ownership. **Must** be called immediately after the upload
POST returns. Without it the blob exists in `_storage` but no
`files` row anchors it — orphan that only super-admin can remove.

Idempotent: if a row already exists for that `storageId`, returns
the existing `_id`. Throws "Not authorized" if the existing row is
owned by a different user (defensive — should never happen since
only the uploader knows the new id).

### `remove({storageId})`

Auth: ownership via `files.by_storage`. If no row OR not owned —
throws `"Not authorized"` (silent existence-leak prevention).

Atomically deletes:
1. The blob from `_storage`
2. The ownership row from `files`

The order matters — if storage delete fails, the row stays so a
retry is possible.

> **Convention**: if you reference a `storageId` in a block (e.g.
> image url stored as the Convex-served URL), removing the file
> through this mutation invalidates the URL. The block keeps the
> stale URL — frontend should show a broken-image fallback.
> Auto-cleanup of references is not implemented.

---

## Queries

### `getUrl({storageId}) → string | null`

No auth gate at this layer — returns whatever Convex's
`ctx.storage.getUrl` resolves. This is fine because:

- The URL is a signed, short-lived link (Convex internal)
- Possessing the storageId already implies access (it's communicated
  out-of-band from `confirmUpload`)

Used by `ImageBlock` to resolve the public-readable URL after
upload (`api["features/files/queries"].getUrl`).

> If you need stricter access (e.g. URL only resolvable for the
> owner), wrap the query with `requireAuth` and an ownership check
> through the `files` table.

---

## Frontend integration

### Upload flow in `ImageBlock`

```ts
const generateUploadUrl = useMutation(api["features/files/mutations"].generateUploadUrl);
const confirmUpload     = useMutation(api["features/files/mutations"].confirmUpload);
const convex            = useConvex();

async function uploadImage(file: File) {
  const uploadUrl = await generateUploadUrl();
  const res = await fetch(uploadUrl, {
    method: "POST",
    headers: { "Content-Type": file.type },
    body: file,
  });
  const { storageId } = await res.json();
  await confirmUpload({ storageId });
  const url = await convex.query(
    api["features/files/queries"].getUrl, { storageId },
  );
  // store url in block.url
}
```

Frontend caps:
- 10 MB per image (`ImageBlock`)
- 25 MB per binary in ZIP import
- 50 MB per ZIP archive
- 8 MB per JSON workspace import

Server-side: relies on Convex's deploy-level file-size cap.

---

## Conventions

1. **Always confirmUpload** after a successful POST — orphan blobs
   accumulate otherwise. If the user navigates away mid-upload, the
   orphan stays; super-admin can purge.
2. **Validate MIME on the frontend** — server `generateUploadUrl`
   doesn't restrict types. Image-only blocks must check
   `file.type.startsWith("image/")` before upload.
3. **Capture storageId** even if you don't use it immediately — the
   `_storage` system table doesn't list user-owned blobs; without
   the id you can't reference / delete it.
4. **Reference shape** in import/export: `storage:<storageId>:<filename>`
   — a custom URI scheme. `convex/import/markdown.ts` handles this
   when reconstituting block URLs.
5. **No virus scan** today. If you accept binary uploads from
   public-facing surfaces (form view, public comment with file
   attachment), add scanning at this boundary.
