# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/),
and this project adheres to [Semantic Versioning](https://semver.org/).

## [Unreleased]

### CI

- **(app)** Auto-generate release notes with git-cliff

### Miscellaneous

- **(app)** Update auto-generated Tauri schemas and Cargo.lock
- **(app)** Add cargo fmt to pre-commit hook and apply formatting

### Refactor

- **(monitor)** Extract community providers to separate directory

### Styling

- **(app)** Fix clippy warnings in skin_import and steps
- **(monitor)** Fix clippy warnings in monitor adapters

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
