# Security policy

## Supported versions

Only the latest `main` platform release and game versions marked published in the active Convex catalog receive fixes. Immutable historical game bundles remain available only while active rooms or an explicit rollback policy require them.

## Reporting

Report vulnerabilities privately to the repository owner through GitHub's private vulnerability reporting feature. Do not open a public issue containing credentials, personal data, room passwords, access tokens, exploit details, or a live room code.

Include the affected commit or game version, reproduction steps, expected impact, browser/device, and whether the issue is already being exploited. Do not access another user's account, room, files, or game image while testing.

## Secret handling

Never commit or paste `.env`, Convex admin keys, JWT private keys, JWKS private material, join-ticket secrets, game-publish tokens, GitHub tokens, Dokploy keys, Hostinger tokens, or session cookies. Rotate a value immediately when exposure is suspected.
