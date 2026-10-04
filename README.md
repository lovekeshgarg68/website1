# Aakanksha & Lovekesh — wedding website

Static site, no build step. Open `index.html` in a browser or host the folder anywhere (Netlify, Vercel, GitHub Pages, Cloudflare Pages).

```
index.html          the whole site
css/styles.css      design tokens and styles
js/config.js        the only file to edit before launch
js/main.js          navigation, timeline, forms, guestbook
apps-script/Code.gs Google Sheets backend for RSVP + notes
media/              Save the Date (reference only; not used on the site)
```

## Before launch

1. **Connect the Google Sheet** (RSVP and notes; ~5 minutes):
   1. Create a new Google Sheet, e.g. "A&L wedding RSVP".
   2. Extensions → Apps Script. Delete the sample code, paste in `apps-script/Code.gs`, save.
   3. Select the `setup` function in the toolbar and press Run. Approve the permissions. Two tabs appear: **RSVP** and **Notes**.
   4. Deploy → New deployment → type **Web app**. Execute as **Me**. Who has access **Anyone**. Deploy.
   5. Copy the Web app URL into `js/config.js` → `SCRIPT_URL`.
   6. If you later change `Code.gs`, use Deploy → Manage deployments → Edit → New version, so the URL stays the same.
2. **Notes for the couple:** a note left on the RSVP form is saved with the RSVP and copied to the Notes tab. It only appears on the site once you tick **Approved** there. Clear `SAMPLE_NOTES` in `js/config.js` before going live.
3. **Cocktail (26 Jan):** shown as "By invitation" with no RSVP option. Confirm those ~60 guests directly; they can still use the form for the 27th and 28th.
4. **Fill in when known:** Sehra Bandi venue, transfer arrangements. Search `to follow` in `index.html`.
5. Optional: add an RSVP deadline line in the RSVP intro.

## Local preview

```bash
python3 -m http.server 8080
```

Then open http://localhost:8080.
