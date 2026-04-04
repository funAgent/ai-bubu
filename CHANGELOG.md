# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/),
and this project adheres to [Semantic Versioning](https://semver.org/).

## [Unreleased]

### Bug Fixes

- Fix release workflow

### Features

- Site add download options without Github release page

## [0.3.0] - 2026-04-04

### Bug Fixes

- **(app)** Fix tooltip color mismatch and improve bubble styling

### Features

- **(app)** Add auto-updater with silent background check
- **(app)** Add ZIP skin import with security hardening
- **(app)** Add data insights with hourly heatmap and provider charts
- Add about panel
- **(app)** Redesign peer tooltips with avatars and smart positioning
- **(app)** Dynamic pet window sizing with window-level drag

### Miscellaneous

- **(app)** Release v0.3.0
- **(ci)** Pin GitHub Actions to SHA and update release docs
- **(app)** Remove community providers and clean up config
- **(app)** Expand mock peers for overflow testing

### Refactor

- **(app)** Rename skin directories from numbered to named

## [0.2.1] - 2026-04-04

### Bug Fixes

- **(site)** Fallback to releases page when download API fails
- **(site)** Correct favicon path from svg to png
- Add demo mp4 poster

### CI

- **(app)** Auto-generate release notes with git-cliff

### Documentation

- Update README and contributing guide for provider system

### Features

- **(site)** Auto-detect browser language for i18n
- **(site)** Auto-detect OS for download button and fetch latest version

### Miscellaneous

- **(app)** Release v0.2.1
- **(app)** Update auto-generated Tauri schemas and Cargo.lock
- **(ci)** Add prettier-plugin-astro and include astro in lint-staged
- Update info
- Add vercel.json
- Delete vercel
- Modify vercel
- Modify vercel
- Vercel
- Update domain from aibubu.funagent.app to aibubu.app
- Modify workflow
- Modify
- Add marketing directory to gitignore
- **(app)** Add cargo fmt to pre-commit hook and apply formatting

### Refactor

- **(monitor)** Extract community providers to separate directory

### Styling

- **(app)** Fix clippy warnings in skin_import and steps
- **(monitor)** Fix clippy warnings in monitor adapters
- **(site)** Improve navigation layout with max-width constraint

## [0.2.0] - 2026-04-04

### Bug Fixes

- **(skin)** 统一皮肤 ID 格式并修正 Boy 尺寸
- **(ci)** Specify pnpm version and format Rust code

### Features

- **(app)** 支持在全屏应用上显示宠物
- **(site)** 在官网和 README 添加 GitHub Star 按钮

### Miscellaneous

- **(app)** Release v0.2.0
- Modify
- **(app)** Refresh monitor, skins, and project tooling
- Restructure project as monorepo and add open-source infrastructure
