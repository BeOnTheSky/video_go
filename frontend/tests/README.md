# Frontend Regression Checks

Run against the existing Docker + Nginx deployment. This runner requires an installed
Playwright package and its Chromium browser. It does not modify backend source code.

```powershell
$env:UI_BASE_URL = 'https://localhost:8443'
$env:UI_OUTPUT_DIR = '..\.local\frontend-audit'
$env:UI_DESKTOP_ONLY = '1'
# Set this only when Playwright is installed outside this frontend directory.
$env:PLAYWRIGHT_MODULE = 'C:\path\to\node_modules\playwright'
node .\tests\ui-regression.cjs
```

- Desktop mode covers 1280, 1440 and 1920 pixel widths, with dark and light themes.
- Public-page smoke tests use real services and load an existing video's metadata.
- Account, admin, upload, favorite, comment and other write-interaction tests use
  intercepted browser requests. They do not submit fixture changes to the database.
- Fixtures intentionally omit `role` from `/auth/me`, matching the existing backend.
  Administrative access is confirmed by the existing protected statistics endpoint.
- The report records runtime errors, missing assets, invalid links, layout overflow,
  screenshots and interaction assertions. Failures exit with a nonzero status.
- `UI_SKIP_MATRIX=1` runs the interaction checks without repeating layout screenshots.
- Omit `UI_DESKTOP_ONLY` to include the optional narrow-screen matrix.

Focused checks:

```powershell
node .\tests\ranking-race.cjs
node .\tests\profile-videos.cjs
node .\tests\session-expiry.cjs
node .\tests\draft-transcode.cjs
node .\tests\list-parity.cjs
node .\tests\favorite-detail-race.cjs
node .\tests\comment-count.cjs
node .\tests\favorite-picker.cjs
node .\tests\profile-layout.cjs
```

The first two execute the actual page scripts with controlled asynchronous
responses. The session-expiry check uses browser-intercepted responses and verifies
both direct 401 and CSRF-retry 401 recovery without writing real account data.

Real-account integration checks and their cleanup evidence are stored separately
under `.local/frontend-audit/` in the project root, not in frontend source.

Desktop interactions also assert the sticky category bar, administrator sidebar
entry and normal-account exclusion, active-latest refresh and window-focus refresh,
short/long-press folder picker, notification-to-video navigation, and published manuscript
edit/delete controls. Real workflows remove only their own uniquely named fixture.

`favorite-picker.cjs` checks short press, long press and keyboard activation without
automatic favorite writes or an extra dropdown, plus reply/delete comment counts.
`comment-count.cjs` checks all-page root/reply totals separately from root pagination.
`profile-layout.cjs` checks the compact profile header, duplicate shortcut removal,
500-character bio wrapping, desktop themes/widths, and profile editing with mocked writes.
