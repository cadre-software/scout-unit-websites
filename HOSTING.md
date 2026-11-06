# Put your Scout website online

Choose your host in the editor before downloading. **Cloudflare Pages** gets a
ZIP to upload; **Netlify Drop** gets a ZIP to unzip into a folder; **GitHub Pages**
and **another host** get a self-contained **index.html**. Each static-host editor ZIP contains
only index.html at the top level, without your settings backup or editor.
A static host serves the page to visitors; your unit’s form service handles contact messages. You can
start with the host’s free web address and connect a unit-owned domain later.
Domain registration and email are separate services and costs.

## Choose a route your next volunteer can repeat

| Option | Cost starting point | How updates work | Main consideration |
| --- | --- | --- | --- |
| **Netlify Drop** | Free tier with a monthly usage allowance | Unzip the editor download, then drag the folder into the site’s deployment area | Easiest first upload; free sites pause if the allowance is exhausted. |
| **Cloudflare Pages Direct Upload** | Free Pages tier | Upload the editor’s Cloudflare ZIP through the dashboard | A helper handles domain/DNS setup; each file must fit its size limit. |
| **GitHub Pages** | Free for a public repository | Upload or replace index.html in the unit’s repository | Good when a helper already uses GitHub; published source is public. |
| **Your existing web host** | May already be included in your unit’s plan | A helper uses the host’s file manager or SFTP | Ask about a separate static site or folder; preserve the existing website. |

These are starting points, not a promise of unlimited service. Plans and limits
were checked **November 4, 2026**; check the linked provider pages before choosing.
Use a unit-controlled account, a unique password and two-step sign-in. Keep a
backup adult and the saved editor settings file ready for volunteer handoff.

## Easiest first upload: Netlify Drop

1. Use the online editor, configure your form service, and select **Netlify Drop**.
2. Download the ZIP and unzip it into a folder, such as `pack123-website`.
   That folder must contain index.html directly. Netlify Drop expects the folder,
   not the ZIP itself.
3. Sign in to the unit’s Netlify account and open [Netlify Drop](https://app.netlify.com/drop).
4. Drag the folder into the deployment area. Open the supplied web address and
   check the page, links and form delivery.
5. For an update, drop the updated folder into **that same site’s Deploys page**.
   This keeps the address; creating a new project each time creates another site.

Netlify’s Free plan has a hard monthly credit allowance covering publishing
and traffic. Exhausting it pauses the team’s sites until the allowance resets
or the plan is upgraded. Watch usage before a recruiting campaign.
[Upload instructions](https://docs.netlify.com/deploy/create-deploys/#drag-and-drop),
[current plans](https://docs.netlify.com/manage/accounts-and-billing/billing/billing-for-credit-based-plans/credit-based-pricing-plans/),
[usage and pausing](https://docs.netlify.com/manage/accounts-and-billing/billing/billing-for-credit-based-plans/billing-faq-for-credit-based-plans/).

## Another free upload route: Cloudflare Pages

Select **Cloudflare Pages** in the editor, then download its ZIP. Create a
**Pages Direct Upload** project and upload that ZIP through the dashboard.
index.html is already at its top level; you do not need to unpack it. Use its supplied `pages.dev`
address to test, and upload a new deployment to the same project for updates.
The dashboard supports up to 1,000 files and 25 MiB per file; if your exported
page is too large, use fewer/smaller uploaded photos and export again.

Connecting a root domain such as `pack123.org` requires Cloudflare nameservers;
a subdomain such as `www.pack123.org` can use an external DNS provider. Follow
the project’s domain setup before adding its DNS record. Preserve the email
records when moving DNS. Direct Upload projects cannot later switch to Git
integration without creating another project.
[Direct Upload](https://developers.cloudflare.com/pages/get-started/direct-upload/),
[Free-tier limits](https://developers.cloudflare.com/pages/platform/limits/),
[custom domains](https://developers.cloudflare.com/pages/configuration/custom-domains/).

## When a helper knows GitHub: GitHub Pages

Create a unit-owned public repository, upload the downloaded index.html to its
root, then choose **Settings → Pages → Deploy from a branch**, `main`, `/(root)`.
The unit website will receive a `github.io` address. Replace index.html in that
same repository for updates; the source and its version history are public.
Keep passwords, settings backups and private unit records out of the repository.
The editor checks the 25 MiB limit for GitHub’s browser file upload; use smaller
photos if needed. [File upload limits](https://docs.github.com/en/repositories/working-with-files/managing-files/adding-a-file-to-a-repository).

GitHub Pages also supports a custom domain. Have the helper follow GitHub’s
instructions to verify the domain, add the DNS records and enable HTTPS.
[Pages overview](https://docs.github.com/en/pages/getting-started-with-github-pages/what-is-github-pages),
[custom domains](https://docs.github.com/en/pages/configuring-a-custom-domain-for-your-github-pages-site/about-custom-domains-and-github-pages).

## Before changing your domain

Test the host’s supplied address first. Then have the domain administrator copy
the host’s exact DNS instructions. Keep the MX and email-verification records
so website changes do not break unit email. Confirm HTTPS, both expected domain
names, calendar/application links and a test message in every intended inbox.

Publish the editor’s **index.html**, either directly or inside its host-specific
ZIP, for a finished unit site. The GitHub toolkit release ZIP
contains the entire editing toolkit and examples; uploading it unchanged shows
the toolkit’s example chooser. WordPress and Squarespace use their own editors:
choose the new WordPress pattern or Squarespace recipe package instead.
These are not complete themes. See the builder instructions below.

## Updating the same website

Resume your device draft or load your saved settings in the editor. Change the
words, announcement, links or photos, save a new settings backup and download
for the same host. Upload the replacement to the existing hosting project.
An announcement’s expiration hides it automatically using the visitor’s local
clock; changing its message requires another download and upload.

## WordPress: import editable blocks

Choose **WordPress / pattern and images**, unzip the package, and open
`START-HERE.html`. In a block-theme site, go to **Appearance → Editor →
Patterns → My Patterns → Add Pattern → Import from JSON** and select
`pattern.json`. Other themes may expose pattern management through the block
editor’s options. Insert the imported pattern into a new page; set that page
as the homepage if desired.

The pattern uses native Group, Heading, Paragraph, Button and Image blocks.
Your words, links and enabled sections carry over. Image blocks are empty
placeholders: upload the included image files to Media Library and select the
matching files using the illustrated section guide. Add your unit logo through
your theme’s site-branding controls if it should appear in the header.
Configure a supported native Form block or form plugin and test all recipient
inboxes. The static page’s hosted-form endpoint is not wired into WordPress.

Your theme controls appearance; this is an editable content pattern, not an
exact copy of the static design or an installable theme. Remove the contact-form
setup reminder before publishing. Native navigation and section anchors need
a final review. [Official pattern import instructions](https://wordpress.com/support/export-import-patterns/).

## Squarespace: follow the page recipe

Choose **Squarespace / guided recipe**, unzip the package, and open
`START-HERE.html`. Recreate the ordered sections in Squarespace 7.1 with Text,
Image and Button blocks. The guide includes your actual copy, button links,
image files and descriptions, and section anchors. `content.txt` is a plain-text
copy list; `reference.html` is a non-submitting layout reference.

Add a native Form block for adult name, reply email and message. Set its Email
Notification / storage recipient to the intended adult unit inbox; verify delivery
and Reply To from the published page. [Official Form block instructions](https://support.squarespace.com/hc/en-us/articles/206566737-Form-blocks).

Squarespace does not import this ZIP as a template. Your site’s fonts and layout
apply, and a volunteer needs to assemble the sections. This route uses native
editing without requiring custom code or an HTML embed.

## Builder updates and announcements

Make future edits in WordPress or Squarespace. Re-downloading does not synchronize
with those platforms and can duplicate or replace manual changes if re-imported.
Keep the editor’s settings backup separately if you want to use it again.

Builder announcements do not carry over the static site’s automatic expiration.
Schedule removal in the platform if supported, or set a reminder to remove them
manually. An announcement already past its end date is omitted from a new
builder package. Keep the native form recipient access current at handoff.
