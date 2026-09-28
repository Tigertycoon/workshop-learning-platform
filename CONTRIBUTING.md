# Development

Use Node 22. Run `npm run setup`, `npm run demo` and `npm run dev` from the repository root. The demo initializes only an empty database. Keep separate data paths for experiments and existing workshop data.

Before opening a pull request:

```sh
npm run check
npm run audit
npm run publication:check
```

The last check inspects tracked files, including staged additions. CI also runs Gitleaks over the complete history. Add meaningful regression coverage for changed behavior; the API tests create temporary databases and never use your local demo database.

Keep runtime databases, environment files, uploaded media, generated builds and third-party workshop assets out of Git. Use synthetic text for examples and fictional accounts for screenshots. Do not add a real person's submission or a screenshot containing credentials.

Document limits of untested integrations rather than describing them as complete. Source contributions require that you have the right to submit them. This repository does not grant an open-source license.
