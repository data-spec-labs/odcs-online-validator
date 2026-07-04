# ODCS Validator

[![Uptime](https://img.shields.io/uptimerobot/status/m803437361-6f635b0b65422c823e511e2d?style=flat-square)](https://odcs-validator.com/)
[![Build Status](https://img.shields.io/github/actions/workflow/status/data-spec-labs/odcs-online-validator/build.yml?branch=main&style=flat-square)](https://github.com/data-spec-labs/odcs-online-validator/actions)
[![License](https://img.shields.io/badge/License-Apache_2.0-blue.svg?style=flat-square)](https://opensource.org/licenses/Apache-2.0)
[![GitHub issues](https://img.shields.io/github/issues/data-spec-labs/odcs-online-validator?style=flat-square)](https://github.com/data-spec-labs/odcs-online-validator/issues)
[![GitHub stars](https://img.shields.io/github/stars/data-spec-labs/odcs-online-validator?style=flat-square)](https://github.com/data-spec-labs/odcs-online-validator/stargazers)
[![Built with Astro](https://img.shields.io/badge/Built__with-Astro-ff5d01?style=flat-square&logo=astro)](https://astro.build)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind__CSS-38B2AC?style=flat-square&logo=tailwind-css&logoColor=white)](https://tailwindcss.com)

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
