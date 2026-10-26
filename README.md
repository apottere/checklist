# Checklist

Personal checklist PWA. Hosted on GitHub Pages; data in Firestore, which caches offline and syncs when back online. Only allowlisted emails can sign in.

## Setup

Use a separate Google account to own the Firebase project. The allowlisted accounts don't need any Firebase access.

1. As the admin account, create a Firebase project and enable the Google sign-in provider (Authentication → Sign-in method).
2. With `gcloud` logged in as the admin account (`gcloud auth login --no-launch-browser`), run:
    ```sh
    bash scripts/bootstrap.sh <project-id>
    ```
    It creates the Firestore database, authorizes `<owner>.github.io` for sign-in, creates the web app, and lets GitHub Actions deploy without a stored key. The project id is saved to the gitignored `.firebaserc`, so later runs and Firebase CLI commands don't need it.
3. In the GitHub repo settings:
    - Pages → Source: GitHub Actions
    - Actions variables: the three printed by the script
    - Actions secret `ALLOWLIST`: allowed emails, separated by commas or newlines
4. Run the Firebase and Deploy workflows.

After that, pushing to `main` deploys whatever changed.

## Allowlist

Edit the `ALLOWLIST` secret, then run the Firebase workflow. It adds and removes entries to match.

## Development

- `pnpm start:emulator` runs the app against local Auth and Firestore emulators. Add your test email to `allowlist` in the emulator UI at http://127.0.0.1:4000.
- `pnpm test:rules` tests `firestore.rules` against the emulator. Requires Java 21+.
- `pnpm start` runs against the real project. It needs `.env.local`:
    ```sh
    pnpm exec firebase login
    echo "VITE_FIREBASE_CONFIG=$(pnpm exec firebase apps:sdkconfig WEB --json | jq -c .result.sdkConfig)" > .env.local
    ```
