# China Mobile Cloud web API contract

This project uses internal endpoints observed from the authenticated `yun.139.com` web application. No credential values are stored in source, tests, documentation, or generated artifacts.

Observed read-only on 2026-11-10:

| Operation | Method | URL |
| --- | --- | --- |
| List directory | POST | `https://personal-kd-njs.yun.139.com/hcy/file/list` |
| Rename file or folder | POST | `https://personal-kd-njs.yun.139.com/hcy/file/update` |

List body shape:

```json
{"pageInfo":{"pageSize":100,"pageCursor":null},"orderBy":"updated_at","orderDirection":"DESC","parentFileId":"<redacted>","imageThumbnailStyleList":["Small","Large"]}
```

The response contains `data.items` and `data.nextPageCursor`. Item fields include `fileId`, `parentFileId`, `name`, `type`, `fileExtension`, `category`, `size`, `updatedAt`, and optional `mediaMetaInfo`.

The shipped web application maps its legacy update calls to this update body:

```json
{"fileId":"<redacted>","name":"full-new-name.ext","description":""}
```

The update endpoint has been confirmed from shipped frontend code, but no real rename request was performed during initial discovery. A live rename-and-restore probe requires explicit user authorization and a recoverable sample.
