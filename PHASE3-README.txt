SJ Restaurant - Phase 3 (includes Scan Menu + Phase 1 + Phase 2)

1) Supabase > SQL Editor > New query > paste ALL of phase3.sql > Run.
   (phase1.sql and phase2.sql must already be run.)
2) Upload every file of this folder to your hosting (replace old ones).
3) Close and reopen the app.

NEW
- Dark / Light mode button (sun/moon) in the top bar; also on the login screen.
- Inventory (menu): Stock (purchase, waste/used, count, history, low-stock alert),
  Recipes (what each dish uses + cost and margin), Suppliers (purchases, reorder via WhatsApp).
  Stock goes down automatically when the kitchen starts an order.
  Purchases can be added to Expenses (Raw material) automatically.
  Half/Full sizes: write  Half:80:0.5, Full:150  (0.5 = half the recipe).
- Delivery (menu): Deliveries (new delivery -> kitchen chime -> dispatch -> delivered + bill)
  and Riders (pay per run, cash with rider + Settle, daily records).
  Delivery charge is taxed with the same GST rate as food.

IMPORTANT: run the SQL files in order (phase1 -> phase2 -> phase3), each only once.
Do NOT run an older phase file again after a newer one (it would overwrite newer functions).
Fixes in this version: messages are no longer hidden behind pop-ups, menu scan reads names with numbers (e.g. "Chicken 65").

v3.1: Scan Menu Card now splits 2-column menus, leaves unsure lines unticked, shows "Saved" inside the window
(look for "v3.1" next to "Check items"). If you do not see v3.1, the old files are still loaded: upload all files again and
close/reopen the app (the app now always loads the newest files).

v3.2 (no new SQL needed): Menu and Recipes pages have "Select & delete items" (delete many at once);
single delete (✕) now uses an in-app confirm. History page has "Clear history…" (backup CSV + type DELETE).
Files changed since v3.1: index.html, sw.js, scan.js, phase4.js (new).

v3.3 (no new SQL): new design (restaurant colours, dark + light), logo in the top bar and as app icon,
bottom-sheet pop-ups on phones, offline banner, "Install app" button, category chips on the customer QR menu,
"Share today's summary" (WhatsApp) on Home.
Files changed since v3.2: style.css, theme.js, app.js, index.html, manifest.json, sw.js, scan.js
New files: ui.js, icon-192.png, icon-512.png, icon-maskable.png
