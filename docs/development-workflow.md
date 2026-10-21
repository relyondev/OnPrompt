# Safe development workflow

## Guardrails

- Work on a feature branch, never `main` or a production-connected local checkout.
- The Firebase CLI default is the non-production `onprompt-staging` alias. Use `firebase use production` only in an explicitly approved release terminal.
- Do not run `firebase deploy`, `gcloud firestore import`, or destructive commands while developing.
- Keep `.env.local`, service-account JSON, and export archives out of Git.

## Staging project setup

Create a separate Firebase project in the Firebase console or with an approved administrator account, then replace the placeholder `onprompt-staging` in `.firebaserc` with its real project ID. Configure the same Authentication providers needed for testing, but do not copy production users or data. Create a separate staging Hosting target if hosting previews are required.

Copy `.env.example` to `.env.local` and fill it with the staging web-app configuration. Set `VITE_USE_FIREBASE_EMULATORS=true` for local work. The web config is not a server secret, but it is environment-specific and must not be hardcoded in source.

## Local emulators

Install dependencies at the root and in `functions/`, then run `npm run emulators`.

- Auth: `127.0.0.1:9099`
- Firestore: `127.0.0.1:8080`
- Functions: `127.0.0.1:5001`
- Emulator UI: `127.0.0.1:4000`

Use `npm run test:rules` for Firestore rules tests. It needs JDK 21+ because the current Firebase Emulator requires it.

## Backups and restore rehearsal

Do not run these production commands without explicit approval. Use a restricted, versioned Cloud Storage bucket outside the production app flow:

```powershell
gcloud firestore export gs://ONPROMPT_BACKUP_BUCKET/$(Get-Date -Format yyyy-MM-dd-HHmmss) --project relyon-app
gcloud firestore import gs://ONPROMPT_BACKUP_BUCKET/EXPORT_FOLDER --project STAGING_PROJECT_ID
```

First restore into staging and verify counts, ownership fields, and the app. Firestore import is project-wide; production restore requires a reviewed incident plan, an approved maintenance window, and a fresh backup immediately before the operation.

## Migration dry runs

Prepare an export-derived JSON document list, then run:

```powershell
npm run migration:dry-run -- --input .\migration-input.json
```

The validator only reads the specified local JSON file. It checks document IDs and `userId` presence, makes no Firebase connections, and performs no writes. A real migration must first pass this validator and execute against staging/emulators with a separately reviewed, idempotent write plan.

## Release checklist

1. Confirm the active branch and Firebase alias (`firebase use`).
2. Confirm `.env.local` names a staging project during development.
3. Run `npm run verify` and `npm run test:rules`.
4. Run migration dry-run and staging rehearsal where applicable.
5. Review Firestore rules, Functions, and environment differences.
6. Record the currently deployed Hosting release and Firestore ruleset ID.
7. Obtain explicit production approval before changing aliases or deploying.
8. Roll back by redeploying the recorded prior Hosting release and ruleset; do not perform data restores without an incident plan.
