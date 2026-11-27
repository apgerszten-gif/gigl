# Selecting everything under a "concert" search of your photos

*Researched and written 2026-11-27. The sources are linked inline; they were read as search-result summaries (most primary pages could be read only that way from the cloud environment), and anything not confirmed is marked **UNVERIFIED**. Nothing here was tried on a real phone.*

## The problem

`/photos` reads the date and place out of each photo you pick, on the phone, and finds the shows you were at. The phone's own photo picker is the only way a web page can get at the photo library, and it has **no "Select all" for search results**. Someone who searches their library for "concert" still has to tap each photo, which is the part they find fiddly.

## What the web platform can and can't do

The page can't search the photo library, and it can't see anything the picker doesn't hand over. So "search 'concert' and take all of it" can only happen on the *other* side of the handoff: the app that owns the search (Google Photos, Apple Photos) sends the photos to Gigl, or Gigl is itself an app with library access. Each option below is that idea on a different platform.

| Option | iPhone | Android | Desktop | Verdict |
|---|---|---|---|---|
| Web Share Target (installed PWA) | **No** | **Yes** (implemented) | Chrome/Edge | Android only |
| iOS Shortcut | Possible but poor | n/a | n/a | Describe only; don't ship |
| `<input webkitdirectory>` (choose a folder) | iOS 18.4+, but Photos albums are not folders | Chrome (recent) | Yes | A follow-up for Android and desktop |
| File System Access API | No | Chrome (recent) | Chrome/Edge only | No gain over the existing input |
| Native app, PhotoKit / MediaStore | **Yes, the real answer** | Yes | n/a | Long term |

## 1. Web Share Target, installed PWA, Android: implemented

**What it is.** A web app that is installed can declare itself a target in the system share sheet through a `share_target` entry in its manifest. The browser then POSTs the shared files to a URL on the app. Chrome documents it as available from Chrome 76 on Android and 89 on desktop; the app must be installed first ([Chrome: Receiving shared data with the Web Share Target API](https://developer.chrome.com/docs/capabilities/web-apis/web-share-target); [MDN: share_target](https://developer.mozilla.org/en-US/docs/Web/Manifest/Reference/share_target)). Files arrive as a multipart POST, and the pattern for receiving them without a server is a service worker that answers the POST itself, stores the files, and redirects the page ([web.dev: How to receive shared files](https://web.dev/articles/files/receive-shared-files)).

**What it would give people.** In Google Photos: search "concert", select photos, Share, choose Gigl. The selection is whatever Google Photos selects, which brings the next two points.

- **"Select all" is not promised.** Searching around, Google Photos on Android is described as having no single Select all button for search results, only touch-and-hold then drag to select a range, and a per-date check circle that selects a day; drag-to-select has been reported broken in some versions ([Android Authority](https://androidauthority.com/google-photos-drag-to-select-missing-3696148), [Alphr](https://alphr.com/google-photos-how-to-select-all)). These are secondary and may be out of date for the app version on a given phone (**UNVERIFIED**). So the Gigl copy says "select the photos", not "Select all".
- **Location may not survive the share. UNVERIFIED.** Photos need their GPS to be useful here. Android's *Photo Picker* removes location from photos by default, and an August 2026 update reportedly added a per-app opt-in toggle ([Android Authority](https://androidauthority.com/android-photo-picker-location-sharing-release-3704689), [Android developer docs on ACCESS_MEDIA_LOCATION](https://developer.android.com/training/data-storage/files/media)). Whether Google Photos' own Share sheet keeps or strips location I could not establish: Google's help says its "remove geo location" setting applies to shared *links*, and I found no official statement about sharing to another app. **This is the first thing to test on a real phone**: share one photo you know has a location and check that the finder reports a place. If photos arrive without one, the finder says so ("None of the photos you shared had a location...") and points at Choose photos, then Browse or Files.

**What was built.**
- `public/manifest.json`: a `share_target` (`action: /photos/share`, POST, multipart, field `photos`, accepts `image/*`), and `id`/`scope`. The manifest already pointed at `/icon-192.png`, which did not exist, so Chrome could not have treated Gigl as installable; the three icons now exist (see below).
- `public/sw.js`: a service worker that does **one thing**. It answers `POST /photos/share` itself, keeps the first 2 MB of each shared photo (all the finder reads) in the Cache API, and redirects to `/photos?shared=<n>`. It has no other fetch handling: nothing is cached for offline use and nothing else on the site is intercepted. Removing it, or a browser without it, leaves the site as before.
- `components/ServiceWorkerRegister.tsx`, mounted in `app/layout.tsx`, registers it in production only.
- `lib/photos/sharedPhotos.ts`: takes the shared files out of the cache (and deletes them), and builds a `FileList` so they go through the **same** reading, grouping and matching code as photos chosen in the picker.
- `app/photos/share/route.ts`: the fallback for a POST that reaches the server because the worker isn't in control yet (the first launch of a freshly installed app). It never reads the body and redirects to `/photos?shared=0`, where the page asks the person to share again.
- `components/photos/PhotoFinder.tsx`: picks up `?shared=`, and one new line of quick-step copy for Android with Gigl installed.

**Privacy.** The finder's promise is that photos never leave the phone. In the normal path the service worker answers the share on the phone and no request is made to Gigl's server, which was checked (below). **The fallback path is weaker:** if the worker is not yet in control, the browser has already addressed the POST to the server, and although the route drops it unread, the bytes may have been sent. (A very large share is refused by the host with an error page.) That window is the first launch after installing, before the worker has taken over; registering the worker on every page, as done here, means it normally installs long before anyone installs the app.

**How it was tested.** In headless Chromium against a production build: the worker registered and took control; a multipart *navigation* POST of three JPEGs (with a date and GPS in their EXIF) to `/photos/share`, sent from a page the worker controls, was answered by the worker (the server log shows no request for it), the page landed on `/photos`, read the three photos, and sent exactly one match request, `{date: 2026-05-17, lat: 34.05, lng: -118.25, count: 3}`, and no photo bytes; the cache was empty afterwards. A POST with no worker in control got a 303 to `/photos?shared=0`. **Not tested:** a real Android share from Google Photos, a real install (WebAPK), how many photos Google Photos or Android will pass in one share, or iPhone (there is nothing to test).

**What the owner needs to do.**
1. Replace the placeholder icons in `public/` (`icon-192.png`, `icon-512.png`, `icon-maskable-512.png`: a tan square with "G/" in the brand colours, drawn from a system serif because the brand fonts weren't available) with real artwork. Keep the file names.
2. On an Android phone: open gigl.space in Chrome, menu, Install app, then in Google Photos search, select a few photos from a night out, Share, Gigl. Check that Gigl appears in the share sheet, the photos arrive, and they have locations. If photos have no location, the Android line of copy on `/photos` should be removed or reworded.
3. Share targets only register when the app is installed; nothing here prompts anyone to install. If you want people to find it, a prompt or a line in onboarding is a separate piece of work.

## 2. iPhone Safari: no equivalent

Safari on iOS does not support the Web Share Target. Caniuse lists Safari on iOS as unsupported from 3.2 through 26.6 and in 27.0 and 27.1 ([Can I use: share_target](https://caniuse.com/mdn-manifests_webapp_share_target)), and MDN marks the feature as non-Baseline ([MDN](https://developer.mozilla.org/en-US/docs/Web/Manifest/Reference/share_target)). A Gigl added to the iPhone home screen is not offered in the Photos share sheet. The manifest entry is ignored there and harmless.

What an iPhone user can do is choose photos in the system picker: the existing flow. The picker's Options button has a **Location** toggle (needed, and already in the quick steps) and a **Format** setting ([Apple developer forums](https://developer.apple.com/forums/thread/743037)); there is no select-all for a search in it.

## 3. An iOS Shortcut: possible, not a good fit; nothing published

Apple's Shortcuts app has Find Photos and filter actions ([Apple: Find and Filter actions](https://support.apple.com/guide/shortcuts/apd3c845e881/ios), [Add filter parameters](https://support.apple.com/guide/shortcuts/apdbdab3433f/ios)). A shortcut could in principle:
- find photos (Apple's example filters by album; whether it can filter by Photos' own content search for "concert" is **UNVERIFIED** and I think it cannot: the filters are album, date, favourite, media type and similar, not the visual search);
- read each photo's date and location, and **send only those** (a link such as `gigl.space/photos?nights=...`, or a POST of the text) rather than the pictures, which would keep the "photos never leave your phone" promise.

Why not: it needs someone to install a shortcut from an iCloud link (which would have to be created and published by the owner, and was not by me); it can't reproduce the "concert" search, so it would have to be by album or by dates, which the finder already handles by clustering nights; the anecdotal report of a date-filter shortcut hanging on about 150 photos on an older iPhone ([Apple Support Communities](https://discussions.apple.com/thread/255529511)) suggests it would be slow; and Gigl would need a new endpoint to take the nights. It is feasible as a power-user extra; it is not the fix for the picker.

## 4. Choosing a whole folder (`webkitdirectory`): partial

`<input type="file" webkitdirectory>` asks for a folder and returns every file in it. Caniuse lists iOS Safari support from 18.4 (a WebKit bug filed in 2024 was fixed), and recent Chrome on Android ([Can I use](https://caniuse.com/input-file-directory), [WebKit bug 271705](https://bugs.webkit.org/show_bug.cgi?id=271705); I couldn't open the bug itself, so this is from the search summary). Desktop browsers have supported it for years.

It doesn't solve the problem on a phone:
- On iPhone, the Photos library is not a folder in the Files app (**UNVERIFIED**; an Apple developer-forum post from 2025 reports users still having to multi-select images by hand: [forum thread 816515](https://developer.apple.com/forums/thread/816515)), so there is no "Concerts" folder to point at.
- On Android it would let someone choose a camera folder, which is every photo they ever took, not a search. The finder reads a photo in about 64 KB now, so thousands is affordable in time, but the 80-night cap would truncate it, and Android's own folder restrictions on `DCIM`/`Download` are **UNVERIFIED**.
- On a desktop it is a good fit (someone exporting a night's photos to a folder), but the normal multi-file dialog already supports Ctrl/Cmd-A within a folder, so the gain is small.

Not implemented. It would be a small addition for desktop and Android if it turns out people have folders.

## 5. File System Access API: no gain

`showOpenFilePicker` and `showDirectoryPicker` are Chromium-only (Chrome, Edge, and recent Chrome on Android; not Safari or Firefox) ([Chrome: File System Access API](https://developer.chrome.com/articles/file-system-access/), [web-features explorer](https://web-platform-dx.github.io/web-features-explorer/features/file-system-access)). They open the same operating-system dialogs as the plain input, with no "search photos" and no select-all for a search. They would mostly give a persistent handle to a folder, which the finder doesn't need. No.

## 6. A native iOS app (PhotoKit): the long-term answer

An app can request photo library access (`PHPhotoLibrary.requestAuthorization(for: .readWrite)`, with a usage description in the app's Info.plist) and read `PHAsset.creationDate` and `PHAsset.location` for photos directly, without a picker ([Apple developer forums on PHAsset time zones](https://developer.apple.com/forums/thread/729007), [PHPicker metadata](https://developer.apple.com/forums/thread/660696), [WWDC20 session 10641](https://developer.apple.com/la/videos/play/wwdc2020/10641/)). That allows what the web can't:
- scan the whole library in the background and find every night near a venue on the date of a show, with no selecting at all (no "concert" search needed, because the catalogue is the filter);
- do it on the phone, then send only the dates and rounded places, as the web finder does now;
- stay available as a prompt ("Were you at X last night?") rather than a screen the person must open.

Caveats: a person can grant only *limited* access to some photos, in which case the app sees only those ([Apple forums](https://developer.apple.com/forums/thread/662053)); `creationDate` carries no time zone and location can be missing; App Store review will want a clear reason for full library access, which the "find your shows" feature supplies; and it is a second code base and release process. Android has the equivalent in `MediaStore` with the `ACCESS_MEDIA_LOCATION` permission.

## Recommendation

1. Ship the Android share target (this PR), after the real-phone check in "What the owner needs to do".
2. Don't promise "Select all" anywhere. On both platforms the copy says what is true: search, select, add (iPhone: with Location on).
3. Treat the native app as the real fix for iPhone; the share target is a bridge for Android only.
4. Optional later: a "choose a folder" option for desktop and Android; an iOS Shortcut as a documented power-user extra.
