# ODCS Validator

Free online validator for the [Open Data Contract Standard (ODCS)](https://bitol-io.github.io/open-data-contract-standard/v3.1.0/). Paste a YAML or JSON data contract and get instant schema validation with clear error paths.

**Live site:** [https://odcs-validator.com/](https://odcs-validator.com/)

## Features

- Validates ODCS contracts in **YAML** or **JSON**
- Supports **v3.1.0**, v3.0.x, and v2.2.x (via `apiVersion`)
- Runs entirely in the browser — your contract is never sent to a server
- Built-in example contracts to try

## Local development

Requires Node.js ≥ 22.12.

```sh
npm install
npm run dev
```

| Command | Description |
| --- | --- |
| `npm run dev` | Start dev server |
| `npm run build` | Production build to `dist/` |
| `npm run preview` | Preview production build |

## Stack

Astro 7 · React · Tailwind CSS · AJV · official ODCS JSON Schemas from [bitol-io/open-data-contract-standard](https://github.com/bitol-io/open-data-contract-standard)

## License

[Apache License 2.0](LICENSE)
