# Privacy: data flow and notice source text

*Stub: completed in M8.* This is the source for the `/privacy` page (en + sq). **It is not legal advice.** The final text must be reviewed by someone qualified before a public launch (README §12).

## Data flow (current design)

| Data | Where it goes | Stored? |
|---|---|---|
| Photo / camera frames | Processed in the browser only (MediaPipe WASM in a Web Worker) | No. Discarded after analysis |
| Skin colour numbers (L*, a*, b*, scores) | Stay in the browser | Only in `localStorage` if the user clicks "remember my result" |
| Quiz answers | Stay in the browser | Same as above |
| Numbers + quiz answers (Phase 2, opt-in) | Sent to `/api/explain` → Claude API, for the AI explanation | Not logged by the app |

Never collected: images, race or ethnicity, names, account data (until Phase 3).

## To cover in the notice

- Plain-language explanation of on-device processing.
- Albania Law No. 124/2024 "On Personal Data Protection" and the GDPR.
- Biometric data as a special category, and why the app avoids processing it server-side.
- Phase 3 (if accounts are added): consent, data export, deletion.
