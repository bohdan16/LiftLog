# LiftLog — iPhone Workout Tracker

This is an offline-first Progressive Web App (PWA). It is designed specifically so you can develop it from a Windows PC and use it independently on an iPhone.

## What is included

- Push A / Push B / Pull A / Pull B / Legs starter routines
- Weight + reps + set logging
- Previous-best values prefilled
- Workout history
- Personal-record tracking
- Weekly volume chart
- Treadmill, StairMaster, bike and other cardio
- Treadmill speed + incline
- Weekly active-calorie total
- Local-only storage
- Installable to the iPhone Home Screen
- No account or backend required

## Fastest way to use it on iPhone

Because iOS does not allow Windows to directly compile a native iOS app, this version is a PWA. Once hosted over HTTPS:

1. Upload this folder to a static host such as GitHub Pages, Cloudflare Pages, Netlify, or Vercel.
2. Open the HTTPS address in Safari on the iPhone.
3. Tap Share → Add to Home Screen.
4. Launch LiftLog from the Home Screen.

After the first load, the service worker caches the app so the tracker can continue working without an internet connection. Data is stored locally on the iPhone.

## Important

The data is local to each device/browser. If Safari data is deleted, the local workout history can be lost. A future version can add encrypted export/import or iCloud/cloud sync.

## Native App Store version

If you eventually want a true native `.ipa`/App Store app, the same product can be migrated to React Native/Expo or SwiftUI. Building/signing an iOS binary still requires Apple's signing infrastructure; a Mac is not required if using a cloud build service, but an Apple Developer account is normally required for long-term device/App Store distribution.
