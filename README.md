# Aakanksha & Lovekesh — wedding website

Static site, no build step. Open `index.html` in a browser or host the folder anywhere (Netlify, Vercel, GitHub Pages, Cloudflare Pages).

```
index.html          the whole site
css/styles.css      design tokens and styles
js/config.js        the only file to edit before launch
js/main.js          invitation opening, navigation, timeline, forms, guestbook
apps-script/Code.gs Google Sheets backend for RSVP + notes
media/              monogram mask, favicons, images/us.jpeg (About us) and images/ananta-*.jpg (Venue; the 3 MB original is gitignored), reference images
```

## The logo on the site

`media/logo_monogram.jpg` is the original. The site uses only the monogram from it (the wreath is not used on the page):

- `monogram-mask.png` — the "AL" monogram as a single-colour mask; CSS tints it for the wax seal, the nav mark and the crest on the invitation card.
- `favicon.png`, `apple-touch-icon.png` — the monogram on an ivory disc.

Type: Cormorant Garamond (headings), EB Garamond (text), Marcellus (letterspaced small caps), Pinyon Script (ampersand and two short lines).

The envelope fills the viewport inside a small margin, on a dark teal ground: handmade parchment (fibres, flecks, mottling) with a torn deckle edge (four edge-strip mask layers subtracted from a solid base, `--deckle-*`) and rounded corners (`clip-path`), four panels (left and right wings, base, flap) with gold-foil Mughal ornament, a Tiffany-blue liner inside, a wax seal, and a deckled handmade card. Sections are divided by a fine gold rule with a hanging lozenge (`.seam`); the band below the story holds only the countdown. Opening: the seal gives, the flap lifts, the envelope slips down off the card, the card lifts, then the valley appears behind it. Tapping the seal also plays the first 25 seconds of "Sunsetz" (`media/music/sunsetz-intro.mp3`, cut with ffmpeg from the full track, which is not kept in the repo): it swells as the flap lifts, settles low as the valley appears and fades out by itself; Skip or leaving the tab stops it. Browsers only allow sound after a tap, so the automatic opening stays silent. The envelope opening plays on every fresh visit to the home page. It is skipped automatically for deep links (`#rsvp`) and for visitors with reduced-motion turned on, and anyone can tap the seal, press Enter, or hit Skip.

## Before launch

1. **Connect the Google Sheet** (RSVP and notes; ~5 minutes):
   1. Create a new Google Sheet, e.g. "A&L wedding RSVP".
   2. Extensions → Apps Script. Delete the sample code, paste in `apps-script/Code.gs`, save.
   3. Select the `setup` function in the toolbar and press Run. Approve the permissions. Two tabs appear: **RSVP** and **Notes**.
   4. Deploy → New deployment → type **Web app**. Execute as **Me**. Who has access **Anyone**. Deploy.
   5. Copy the Web app URL into `js/config.js` → `SCRIPT_URL`.
   6. If you later change `Code.gs`, use Deploy → Manage deployments → Edit → New version, so the URL stays the same.
2. **Notes for the couple:** a note left on the RSVP form is saved with the RSVP and copied to the Notes tab. It only appears on the site once you tick **Approved** there. Clear `SAMPLE_NOTES` in `js/config.js` before going live.
4. **Fill in when known:** Sehra Bandi venue, transfer arrangements. Search `to follow` in `index.html`.
5. Optional: add an RSVP deadline line in the RSVP intro.
6. **Cache busting:** after editing `js/config.js` (or `main.js` / `styles.css`), bump the `?v=` number on its `<script>`/`<link>` tag in `index.html`. Otherwise returning visitors keep the cached demo-mode config and their RSVPs are never saved.

## Local preview

```bash
python3 -m http.server 8080
```

Then open http://localhost:8080.
