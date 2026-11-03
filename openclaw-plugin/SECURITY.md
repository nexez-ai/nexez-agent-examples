# Security and approval model

This directory is the review copy of `@nexez/openclaw-nexez` `0.2.2`, the current ClawHub and npm release. The OpenClaw review request now covers this release. `0.1.4` is an older ClawHub release and is not what `latest` installs.

The public source for review is this `openclaw-plugin/` directory in [nexez-ai/nexez-agent-examples](https://github.com/nexez-ai/nexez-agent-examples). An earlier holding copy was `openclaw-plugin-review/` in the private repository `nexez-ai/nexez` after a push to this public repository was denied for `cursor[bot]` (HTTP 403).

## Publisher

Nexez is the publisher. The GitHub organization is `nexez-ai`. The ClawHub publisher handle is `nexez` (kind: organization, `official: false` on the package and publisher records read on 2026-11-03).

Official ClawHub status attaches to that publisher, not to one plugin release. Today the `nexez` publisher owns:

- Code plugin `@nexez/openclaw-nexez`. ClawHub and npm `latest` are both `0.2.2`.
- Skill [nexez-agent-discovery](https://clawhub.ai/nexez/skills/nexez-agent-discovery), latest `0.1.2`.

A future package published by the same ClawHub publisher would inherit the same official status.

The npm scope `@nexez` also publishes `@nexez/agent-sdk` (`0.3.1`). That package is a library, not this plugin. This document does not claim OpenClaw official status, ACP approval, or UCP approval.

The review issue was opened from a personal GitHub account. The registry owner is the `nexez` publisher above.

## What matches the published artifact

ClawHub records source commit `a769d354158916605295df15e52644cecd4d9c7f`, path `plugins/openclaw-nexez`, repository `nexez-ai/nexez`. That recorded repository is still private. Reviewers should use this public directory; the eight packed files here are byte-identical to that commit and to the published tarball:

- `LICENSE`
- `README.md`
- `package.json`
- `openclaw.plugin.json`
- `dist/index.js`
- `dist/index.d.ts`
- `dist/nexez-client.js`
- `dist/nexez-client.d.ts`

`src/`, `tsconfig.json`, and the gauntlet scripts other than the production fixture change below are the same commit. They are not inside the tarball. `npm run build` rewrites `dist/` to the same four published files.

`scripts/gauntlet-production.mjs` is the one file that differs from that commit. The shipped script loads an internal catalog page whose `agent.json` now returns 404. This copy uses `tai-oladipupo-realtor`, the live published listing, for checkout discovery and the fixed-price negotiation check. That listing sets `accepts_negotiation` to false on every offer, so the negotiable dry run still calls `nexez-agent-negotiation-lab` directly. That page returned HTTP 200 on 2026-11-03. The production script is not in the published `files` list, so `npm pack` still reproduces the 0.2.2 tarball.

`scripts/verify-published-artifact.mjs` downloads the npm tarball and the ClawHub artifact, checks that they are the same bytes, compares the eight files, reruns `tsc` when dependencies are installed, and runs `npm pack --ignore-scripts`.

## Digests

Checked on 2026-11-03 against the npm version document, the npm tarball, and the ClawHub artifact. The two tarballs were byte-identical.

| Field | Value |
| --- | --- |
| tarball | `nexez-openclaw-nexez-0.2.2.tgz` |
| bytes | 9896 |
| file count | 8 |
| SHA-256 | `3adc56722581efaf1f050018b31700eb3e049749714d61def11e997ee0e5e1a5` |
| npm shasum (SHA-1) | `3c36e06df7ad162980ee9d066dcb347d8107317f` |
| npm integrity | `sha512-Pac4l1U0YYueEJZAeylPYonlDxlj1TjcqjMD4zGFiEphmdQ6c5MyFWOAYbBi6Zq1te//C50aBO0MG0Pi4+8FIQ==` |

Sources:

- npm version document: `https://registry.npmjs.org/@nexez%2fopenclaw-nexez/0.2.2`
- npm tarball: `https://registry.npmjs.org/@nexez/openclaw-nexez/-/openclaw-nexez-0.2.2.tgz`
- ClawHub version: `https://clawhub.ai/api/v1/packages/@nexez/openclaw-nexez/versions/0.2.2`
- ClawHub download: `https://clawhub.ai/api/v1/packages/@nexez/openclaw-nexez/versions/0.2.2/artifact/download`

Per-file SHA-256 from the ClawHub file list, matched to the unpacked npm tarball and to commit `a769d354158916605295df15e52644cecd4d9c7f`:

| File | SHA-256 |
| --- | --- |
| `LICENSE` | `9f42d6c44413fbe084cd59e6f000c2b8e86c5cb68b8e42b4802538bff65f5b43` |
| `README.md` | `1b8de16b1b286c28594f8dbe92bff82dc5ce566b8fb03f3b23cb7f6cff5719d0` |
| `package.json` | `e66f2d32f61284b0e5993deabd9de05b7810aaff68751e9a00274fc2f3044bb4` |
| `openclaw.plugin.json` | `8f681486e940b884d22635d8bb863a470af5e63d50b2d2ae2e2b3e546dbd3e2c` |
| `dist/index.js` | `4f971e8cc1a3aef628a8f7b57effd31b033be35d7d433bf806765e080756aaef` |
| `dist/index.d.ts` | `84b33238011ee44b8593e96cad4e247fca96dd08e6e27d10a1dc54e52e83bdc1` |
| `dist/nexez-client.js` | `7a854b6d213472b8482cdf64e5bc0b466a646df7a8303dd7de00c4569ba992d2` |
| `dist/nexez-client.d.ts` | `a3cacd7151e6e3039dd7ac2766baf9e781f01fbd66710abe0ed52bb6afde3f65` |

ClawHub `createdAt` `1787278149829` is `2026-08-21T02:09:09.829Z`. The source commit is `2026-08-21T00:32:49Z`. The successful publish workflow for that commit is [32438781232](https://github.com/nexez-ai/nexez/actions/runs/32438781232), which finished immediately before the registry timestamp.

## Approval gate

`userApproved` is a local tool argument. It is removed before the request body is built, and it is not sent to Nexez.

Schema and wiring in `src/index.ts`:

- `checkoutSchema` (lines 49-57) has no `userApproved` field. `nexez_validate_checkout` uses it at lines 178-185.
- `approvedCheckoutSchema` declares `userApproved` at line 69. `nexez_start_checkout` uses that schema at lines 198-205.
- `negotiationSchema` starts at line 74 and has no `userApproved` field. `nexez_validate_negotiation` uses it at lines 188-195.
- `approvedNegotiationSchema` declares `userApproved` at line 100. `nexez_submit_negotiation` uses that schema at lines 208-215.

Enforcement in `src/nexez-client.ts`:

- `startCheckout` (lines 161-175) calls `assertApproved`, then drops `userApproved` and `idempotencyKey` from the body, and posts `{ ...input, dryRun: false, buyerAgent }`.
- `submitNegotiation` (lines 203-217) does the same for `/api/negotiations`.
- `assertApproved` (lines 394-398) throws `NexezApprovalError` unless `userApproved === true`.
- `NexezApprovalError` (lines 45-54) sets `name` to `ToolAuthorizationError` and `status` to `403`. The message requires `userApproved: true`.

Validation tools force a dry run. `validateCheckout` (lines 153-159) calls `dryRunResult`. `validateNegotiation` (lines 177-201) does too, and when the dry-run body contains rules reason `offer_not_negotiable` it returns `ok: false` and tells the agent to use checkout. `dryRunResult` (lines 311-334) posts `{ ...body, dryRun: true }` at line 318, so a caller-supplied `dryRun: false` does not win. Expected HTTP failures become `{ ok: false, status, reason }`. Transport failures still throw.

An approval token is optional input on the action schemas (`approvalToken` at lines 67 and 98). The client does not invent one. `userApproved` is still required, and it is still stripped before the POST.

## Tests that lock the gate

`scripts/validate-metadata.mjs` lines 46-49 require both approved schemas to mention `userApproved`, and require the two action tools to use those schemas.

`scripts/gauntlet-contract.mjs` runs 16 checks against a local fixture server:

- Lines 215-226: checkout validation with `dryRun: false` still sends `dryRun: true`.
- Lines 251-261: negotiation validation with `dryRun: false` still sends `dryRun: true`.
- Lines 262-275: both actions reject non-boolean approval values before any request. `assertApprovalGate` is lines 358-373. It requires `ToolAuthorizationError`, status `403`, and a message matching `/userApproved: true/`.
- Lines 277-307: an approved checkout or negotiation posts `dryRun: false` and the body has no `userApproved` property, even if the caller also passed `dryRun: true`.

`scripts/gauntlet-gateway.mjs` installs the packed plugin into a loopback OpenClaw gateway. Lines 116-125 call `nexez_start_checkout` with `userApproved: false` and require a refusal whose message matches `/userApproved: true/`, with no new request to the mock server. The run prints three passes and `0 mutations`.

`scripts/gauntlet-production.mjs` refuses to start without `--production` and targets `https://nexez.app` unless `NEXEZ_BASE_URL` is set. It never passes `userApproved: true`. Checkout and the fixed-price negotiation check use `tai-oladipupo-realtor`. The negotiable dry run uses `nexez-agent-negotiation-lab` by direct URL. Approval bypasses are rejected locally with slugs that must not reach the network.

## Scan

Read on 2026-11-03:

- Listing: https://clawhub.ai/nexez/plugins/openclaw-nexez
- Security audit for this release: https://clawhub.ai/nexez/plugins/openclaw-nexez/security-audit?version=0.2.2
- Install decision: `GET https://clawhub.ai/api/v1/packages/@nexez/openclaw-nexez/versions/0.2.2/security`
- `verdict`: `benign`
- `trust.scanStatus`: `clean`
- `trust.blockedFromDownload`: `false`
- `trust.moderationState`: `null`
- `trust.pending`: `false`
- `trust.stale`: `false`
- Static scan engine `v2.4.26`: status `clean`, findings `[]`, summary `No suspicious patterns detected.`
- VirusTotal engine stats on that release: malicious `0`, suspicious `0`, undetected `59`, status `clean`

## CI

These runs are in the private repository `nexez-ai/nexez`. A reviewer without access cannot open them. The gauntlets in this directory are the rerunnable copy. This public repository runs the same read-only checks in [openclaw-plugin.yml](../.github/workflows/openclaw-plugin.yml): no publishing and no secrets.

Source commit `a769d354158916605295df15e52644cecd4d9c7f`, CI run [32433073749](https://github.com/nexez-ai/nexez/actions/runs/32433073749):

- `openclaw-plugin (2026.6.8)` succeeded, including the contract gauntlet, gateway gauntlet, and plugin validator: https://github.com/nexez-ai/nexez/actions/runs/32433073749/job/96628650794
- `openclaw-plugin (2026.7.1)` succeeded with the same three steps: https://github.com/nexez-ai/nexez/actions/runs/32433073749/job/96628650465

Both jobs report success on every step. The minimum supported version for this release is `2026.6.8`. The build pin is `2026.7.1`.

## Reproduce

```bash
node scripts/verify-published-artifact.mjs
npm ci
npm test
npm run gauntlet
npm run gauntlet:gateway
npm run gauntlet:production
```

The production gauntlet calls public read and dry-run endpoints only. It does not pass `userApproved: true`.
