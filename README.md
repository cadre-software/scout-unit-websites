# Scout unit websites

Free static website starters for Cub Scout Packs and Scouts BSA Troops, from
Cadre Software. They use the public Pack 39 website design from Azimuth and
include a browser editor, an image library and a hosted contact form.

[Try the editor](https://scoutwebsites.cadresoftware.com/customize.html) ·
[Pack example](https://scoutwebsites.cadresoftware.com/pack.html) ·
[Troop example](https://scoutwebsites.cadresoftware.com/troop.html) ·
[Setup guide](https://scoutwebsites.cadresoftware.com/setup.html) ·
[Download the toolkit](https://github.com/cadre-software/scout-unit-websites/releases/latest)

## For a unit volunteer

You do not need Git, Node.js or this repository to use the hosted editor.

1. Open the editor and choose Pack or Troop.
2. Replace the unit name, meeting details, costs and public links.
3. Click a section or photo in the preview to open its controls, or use
   **Choose a section**. Edit headings, descriptions, buttons
   and images. Choose library assets or upload permitted JPG, PNG or still WebP
   images. Add descriptions for uploaded images. Images can also be hidden.
   **Sections to show** removes optional sections and their navigation links
   while retaining their content. Use the Phone and Desktop preview buttons.
4. Create a unit-owned hosted form (the guide uses Formspree), verify the
   receiving inbox and paste the public HTTPS endpoint into **Form service
   address**. Set recipients in the form provider’s dashboard. For several
   leaders, use supported recipient routing or a unit-owned group inbox.
5. **Save settings** to keep a JSON file with your copy and images. Keep it for
   future updates and volunteer handoff. Version 1 and 2 settings still load.
   Device draft saving can resume your most recent draft on this browser; keep
   a settings backup for another device or another unit. Open **Saved draft and
   settings backups** to turn device saving off or erase its stored draft.
6. Review **Before you download**, choose your host and **Download website**.
   Cloudflare Pages gets a ZIP to upload directly. Netlify gets a ZIP to unzip
   into a folder before dragging that folder into Drop. GitHub Pages and another
   host get `index.html`. Each ZIP contains only index.html at its top level;
   the page contains its displayed images, fonts and mobile navigation.
   Settings backups are never included in an upload ZIP.
7. Follow the selected host’s upload instructions. Test the form from the published
   address and check every intended inbox and the reply address.

The public backup email is separate from the form recipients. No mail password
or private API key belongs in the editor or the website. Providers have their
own spam controls, limits and plans; see their current terms.

## Announcements and meeting directions

Add an approved public street address and entrance instructions in **Unit
details** to display a **Get directions** link. A selected or uploaded unit
logo also becomes the browser-tab icon.

In **Announcement**, turn on the message, enter a heading and text, and optionally
add a HTTPS button and **Show through** date. It appears below the welcome.
The date includes that entire day using each visitor’s local clock. Expiring
announcements require JavaScript to display and hide automatically after the
date, including when someone keeps the page open. Without a date, the message
remains until you replace the website.

To change an announcement: resume the device draft or load saved settings,
edit it, save a settings backup, download for your host and replace the website
in the **same hosting project**. Changing a local draft alone does not update
what visitors see.

## Who can change the website?

The editor creates a **local draft** in your browser. It has no server-side
saving, login, or publishing endpoint. Someone else opening `customize.html`
can create their own draft, but cannot change your hosted files.

Only your hosting account can publish an update. Protect that account with a
unique password, two-step sign-in and access limited to current volunteers.
The downloaded `index.html` includes no editor. Publish only that file; keep
settings and editor tools on your own computer if you prefer. Never put account
credentials in a public GitHub repository. A JavaScript password prompt would
not protect static files; if you need a private editor site, use your host’s
actual access-control feature.

The class examples and editor preview cannot send messages. The downloaded
website uses a standard HTML POST to your configured form service. Automated
tests simulate that service; you must verify actual inbox delivery yourself.

## Free and inexpensive hosting

The [hosting guide](HOSTING.md) compares **Netlify Drop**, **Cloudflare Pages**,
**GitHub Pages**, and an existing host, with simple upload steps and the limits
that matter. Netlify Drop is an easy first upload; GitHub Pages suits a helper
who already uses GitHub. Free hosting still has plan limits, and a custom domain
and unit email are separate services.

Publish the **downloaded index.html** for the finished unit website. The release
ZIP contains the whole toolkit and examples. Keep the saved settings file for
future edits. Test the host’s supplied address and form delivery before a helper
connects your domain. The [setup guide](https://scoutwebsites.cadresoftware.com/setup.html)
covers form recipients and publishing checks.

To host the whole toolkit, choose **Use this template** on GitHub and serve the
repository root; no build is required. Replace its initial example-chooser
index.html with your exported page when the unit website is ready. WordPress
and Squarespace use their own editors; this download is not a native theme.

If a host sets a Content Security Policy, allow your form service’s HTTPS
address in `form-action`. The local toolkit server deliberately blocks forms;
its restrictive header is for editing and classroom demonstrations.

## Running the toolkit on your computer

Download the repository ZIP or clone it, then run Python 3 from its folder:

```sh
python3 scripts/serve.py . --port 8080
```

Open <http://127.0.0.1:8080/customize.html>. Browser modules need HTTP; double
clicking `customize.html` from disk will not run the editor. The downloaded
website can be opened from disk for review; publish it before testing the form.
When enabled and available, device storage saves and restores your most recent
draft, including images. Watch the saved status before leaving. Browser cleanup,
private browsing or storage limits can remove or prevent that copy. Save settings
for a portable backup; if storage fails, editing and downloads still work.
If another editor tab updates or erases the draft, a stale tab pauses saving
instead of overwriting that work. Save settings from the paused tab, then reload
to resume the device’s latest version. Asset-library links apply once; newer
photo choices and uploads survive reloads.

## Development and checks

Node.js 22+, Python 3 and Chromium are used for development only:

```sh
npm ci --ignore-scripts
npx playwright install chromium
npm test
```

On a new Linux system, Playwright may also need its documented system packages.
`npm run build` refreshes the generated HTML from `template.mjs`, the section
schema and the build script. Tests cover desktop/mobile layout, image bounds
and races, settings migration, copy/image editing, safe export, contact form
submission/recovery, draft storage failures, announcement expiration, all section
visibility combinations, host ZIP integrity and size limits, and the absence of server writes from the editor. Tests
use synthetic intercepted endpoints, never real outgoing mail. `npm test` supports
local changes. Maintainers use `npm run test:release` on a fresh export to also
verify that rebuilding preserves every published file’s recorded checksum.

Cadre’s release checks run in disposable local VMs through a private maintainer
repository. Public fork code is not given access to Cadre runners. A release
includes `release.json`, identifying the exact reviewed and VM-tested source
revision. Contributions can be proposed as public PRs; maintainers bring them
through review and the isolated release gate before publication.

## License and assets

The software is **GPL-2.0-or-later**; see [LICENSE](LICENSE). This includes the
original Pack 39 public stylesheet with its preserved copyright/license notice
and Cadre’s editor and template implementation. Preserve the notices when
redistributing modifications.

Fonts and Font Awesome retain their included licenses. **The software license
does not grant rights to Scouting trademarks, badges, uniform illustrations or
photographs.** Follow the rights and usage notes in
[assets/ASSET-SOURCES.txt](assets/ASSET-SOURCES.txt) and
[assets/corpus-manifest.json](assets/corpus-manifest.json). Use only photos you
are permitted to publish, honor consent restrictions and replace sample photos
when appropriate. Full-resolution JPEG downloads have EXIF/XMP/IPTC/comment
metadata removed without re-encoding their pictures; source hashes are retained
in the manifest. Scouting marks identify the program; this is an independent
Cadre Software project, not an official Scouting America product.

No member records, private tenant uploads or Azimuth application services are
included. This is a public information website, not a member-management system.
