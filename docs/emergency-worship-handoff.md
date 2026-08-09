# Emergency Worship Handoff

Date: 2026-08-09

> Status: temporary live-service safety note. This file records emergency
> constraints from the 2026-08-09 worship incident and must not be treated as a
> general Presenter architecture spec. Revalidate before carrying any rule
> forward.

During live worship, keep the presenter path conservative.

## Current Safe State

- Presenter controller render-pressure optimization is reverted.
- Deferred presenter board thumbnails are reverted.
- Pre-service video fallback/poster preview is disabled for live stability.
- `patchPresenterSidebarActiveState` must not be referenced unless the function is restored with tests.

## Do Not Re-enable During Worship

- `Reduce presenter controller render pressure`
- `Defer more presenter board thumbnails`
- `pre-service-video.mp4` fallback autoplay/preview
- video poster thumbnails in presenter previews

## Required Before Releasing Presenter Changes

- Run `node --check app.js`.
- Run `node --check mindex.presenter.js`.
- Confirm live `index.html` cache buster changed.
- Confirm live `app.js` has no missing function references.
