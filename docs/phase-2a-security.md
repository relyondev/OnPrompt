# Phase 2A security notes

Phase 2A keeps all Firestore documents private and owner-scoped. Local browser data is retained but is only imported to cloud storage through an explicit action; conflicts are reported and never overwrite cloud documents.

## Future Drive authorization plan

Google sign-in currently requests the `drive.file` scope so existing attachment flows remain compatible. A later phase should separate authentication from Drive authorization: use Firebase sign-in with basic identity scopes first, request `drive.file` only from the Drive connection control, store the token only in memory where practical, and refresh/revoke it through a dedicated authorization lifecycle. The token owner UID check introduced in Phase 2A remains required in that design.

## Release and rollback

Deploy rules and hosting only after a staging emulator review and an approved pull request. Before production deployment, export the current rules with `firebase firestore:rules:get` or record the active ruleset ID. Roll back by redeploying that reviewed prior rules file and the prior Hosting release; do not attempt a data migration as part of a rollback.
