# Checklist

Personal checklist PWA. Hosted on GitHub Pages; data in Firestore, which caches offline and syncs when back online. Only allowlisted emails can sign in.

## Setup

Requires `gcloud`, `jq`, and `git`.

1. Fork this repo. Free GitHub Pages needs it to be public. Enable workflows in the fork's Actions tab.
2. Create a Firebase project, ideally owned by a separate Google account. The allowlisted accounts don't need any Firebase access. Enable the Google sign-in provider (Authentication → Sign-in method).
3. Clone your fork and, logged in to `gcloud` as the project owner (`gcloud auth login`), run:
    ```sh
    bash scripts/bootstrap.sh <project-id>
    ```
    It creates the Firestore database, authorizes `<owner>.github.io` for sign-in, creates the web app, and lets this repo's GitHub Actions deploy without a stored key. The repo comes from the `origin` remote. The project id is saved to the gitignored `.firebaserc`, so later runs and Firebase CLI commands don't need it.
4. In the repo settings:
    - Pages → Source: GitHub Actions
    - Actions variables: the three printed by the script
    - Actions secret `ALLOWLIST`: allowed emails, separated by commas or newlines
5. Run the Firebase and Deploy workflows.

After that, pushing to `main` deploys whatever changed.

## Allowlist

Edit the `ALLOWLIST` secret, then run the Firebase workflow. It adds and removes entries to match.

## Development

Requires Node (see `.nvmrc`) and pnpm. Run `pnpm install` first.

- `pnpm start:emulator` runs the app against local Auth and Firestore emulators. Add your test email to `allowlist` in the emulator UI at http://127.0.0.1:4000.
- `pnpm test:rules` tests `firestore.rules` against the emulator. Requires Java 21+.
- `pnpm start` runs against the real project. It needs `.env.local`:
    ```sh
    pnpm exec firebase login
    echo "VITE_FIREBASE_CONFIG=$(pnpm exec firebase apps:sdkconfig WEB --json | jq -c .result.sdkConfig)" > .env.local
    ```
