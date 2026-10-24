# Firebase Staff Accounts

Staff passwords are handled by Firebase Authentication. Staff names and email addresses are stored in the private `staffProfiles/{uid}` Firestore document. The app does not write staff passwords or profile data to localStorage. Product inventory remains in the browser's IndexedDB; newly created records use the Firebase UID instead of a staff email in `createdBy`.

## Current Project Status

- The Web app config is installed in `firebase-config.js`.
- Email/Password Authentication is enabled.
- The default Firestore database has been created in `nam5`.
- The Firestore rules require verified email and an active staff allowlist entry before a profile can be accessed.
- The Firebase user you added is active in the `staffAccess` allowlist.
- Staff self-registration is restricted to email addresses already present in the Firebase `staffAccess` allowlist.

## Configure Firebase

1. Open the [JN Autos Firebase project](https://console.firebase.google.com/project/jn-autos-complete-website/overview).
2. The project already has Email/Password Authentication and the default Firestore database in `nam5`. Publish the current rules from `firestore.rules` so verified-email checks are enforced by Firestore.
3. Serve the site from HTTPS or localhost. The Firebase SDK is loaded from Google's CDN.

Do not publish Firestore in test mode. The supplied rules restrict each staff profile to its owner.

## Create Staff Accounts

For each new staff email, create a Firestore document at `staffAccess/{lowercase-email}` with `{ "active": true }`. Staff can then open `staff-auth.html` from the site's **Staff Portal** link to create an account, sign in, or request a password reset. Registration checks the allowlist and sends an email-verification link; the user must verify ownership before signing in. An unapproved account is rejected and removed. Successful sign-in opens `admin-portal.html`. Alternatively, create the user under **Authentication > Users > Add user**, verify the email, and have them sign in. Add allowlist documents in the Firebase Console; client-side writes to this collection are blocked by the rules. Only verified users with an active allowlist document can open the portal.

## Move Existing Staff Accounts

For an existing Firebase account, add its email to `staffAccess` and sign in through the portal. The portal stores staff profiles in Firestore and passwords only in Firebase Authentication. If the email already exists in Firebase Auth but the staff member no longer knows its password, use Firebase Console to reset it.

**Account Security > Erase Local Staff Data** replaces the signed-in staff member's email on locally stored product creator labels. This does not delete products or Firebase accounts.

Password changes in **Account Security** update Firebase Authentication.
