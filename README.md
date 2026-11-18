# SJ Restaurant (Demo)

Mobile-first restaurant management UI with Login, Dashboard and a working demo Orders module.

## Folder structure

- `index.html` — app entry point
- `assets/css/style.css` — all styles
- `assets/js/app.js` — app logic
- `assets/images/icon.svg` — app icon
- `manifest.json` — basic PWA metadata

## Run on Android

1. Extract this ZIP in Acode or another code editor.
2. Open the extracted `sj-restaurant-project` folder.
3. Open `index.html` and use Preview / Run.
4. Enter a restaurant name and any PIN with at least 4 characters. This is demo-only login.
5. Open Orders and create a test order.

## Current functionality

- Responsive dark Login and Dashboard UI
- Dashboard quick actions and navigation
- Create Dine-in, Takeaway and Delivery orders
- Select a menu item and quantity
- Order status: New → Preparing → Ready → Completed; Cancel
- Orders and menu data stored in this browser's Local Storage

## Important limitations

- Login is not secure authentication. The entered PIN is only checked for length.
- Data is stored only in the current browser on this device. It does not sync across devices.
- Tables, Menu Management, Kitchen, Staff and Reports are currently UI placeholders, not complete modules.
- No Supabase or other backend is connected.
- Profit is not calculated because item cost data is not configured.

Do not use this demo with real customer or business data until authentication, database, backups and authorization are implemented and tested.
