# provenance skill

Reference, for any role building or releasing.

| Field | Value |
|---|---|
| Files | `skills/provenance/SKILL.md` |
| Use when | Onboarding, building or releasing |

## Provenance

| Item | Value |
|---|---|
| Produced by | The provenance tool in the project's build, never by hand |
| Format | SLSA provenance: in-toto attestation, predicate type `https://slsa.dev/provenance/v1` |
| Records | Source repository and commit, build entry point and parameters, builder, output digests |
| Example generators | `slsa-framework/slsa-github-generator`, `actions/attest-build-provenance`, `cosign attest --type slsaprovenance` |
| Example verifiers | `slsa-verifier`, `gh attestation verify` |
| Missing or failing tool | Hand to the devops-engineer role (`supply-chain-security`) |
