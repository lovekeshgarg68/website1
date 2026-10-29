// ------------------------------------------------------------------
// Site configuration. This is the only file you need to edit to go live.
// ------------------------------------------------------------------
window.WEDDING_CONFIG = {
  // Paste the Web App URL from Google Apps Script here (see README.md).
  // While this is empty, the forms work in demo mode: they show the thank-you
  // state but nothing is saved anywhere.
  SCRIPT_URL: "",

  // Flip to true once SCRIPT_URL is filled in. Until both are set, the RSVP
  // section says "opens soon" and the form stays hidden, so no reply is lost.
  RSVP_OPEN: false,

  // Shown in the guestbook wall while SCRIPT_URL is empty, so the section
  // doesn't look bare during review. Remove or empty this array before launch.
  SAMPLE_NOTES: [],

};
