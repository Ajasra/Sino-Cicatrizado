# TODO & Deferred Roadmap Items

## Deferred Infra & Operations
- [ ] **Automated AWS S3 Twin Archive Sync**:
  - *Context:* Currently the Scarred Twin dataset snapshot is served locally from `data/scarred_twin.json`.
  - *Future Work:* Implement automated post-conference upload script to push final static snapshot to an external AWS S3 bucket if remote cloud backup is required.
