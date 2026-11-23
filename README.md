# Lando Engine Kiri

[![Lando API 3](https://img.shields.io/badge/lando-v3.x-blue.svg)](https://lando.dev)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
<!-- BENCHMARK_BADGES:START -->
[![Cold Boot](https://img.shields.io/badge/Cold%20Boot-66.8%25%20slower-orange?style=flat-square)](#performance-benchmarks)
[![Warm Restart](https://img.shields.io/badge/Warm%20Restart-45.4%25%20slower-orange?style=flat-square)](#performance-benchmarks)
[![CLI Overhead](https://img.shields.io/badge/CLI%20Exec-21.6%25%20faster-brightgreen?style=flat-square)](#performance-benchmarks)
<!-- BENCHMARK_BADGES:END -->

> **Make Lando run blazingly fast on the Kiri Engine.**

Seamless container engine integration for running [Lando](https://lando.dev) on top of [Kiri](https://runkiri.com) — the ultra-lightweight, Rust-based container runtime alternative to Docker Desktop.

---

## Installation

### Via Lando CLI (Recommended)

Install directly from npm via Lando's plugin manager:

```bash
lando plugin-add @xilonz/lando-engine-kiri
```

### Manual / Git Installation

Clone the repository directly into your Lando plugins directory:

```bash
mkdir -p ~/.lando/plugins
git clone https://github.com/Xilonz/lando-engine-kiri.git ~/.lando/plugins/lando-engine-kiri
```

Or if you have the repo cloned locally in a projects directory, create a symlink:

```bash
ln -s ~/projects/lando-engine-kiri ~/.lando/plugins/lando-engine-kiri
```

Clear the Lando cache to activate:

```bash
lando --clear
```

### Verification

Verify that Lando recognizes the engine plugin:

```bash
lando kiri-doctor
```

---

## Prerequisites

1. **Lando v3.x** installed.
2. **Kiri** installed and running:
   ```bash
   curl -fsSL https://runkiri.com/install.sh | bash
   ```
3. **Configure Kiri Reverse Proxy Ports**:  
   By default, Kiri may bind its internal proxy to ports `80` and `443`. Because Lando's Traefik proxy also binds `80` and `443`, set Kiri's proxy to alternative ports (e.g. `8080` HTTP / `8443` HTTPS) or disable it in Kiri's settings so Lando has full ownership of ports `80` and `443`.

---

## Why Kiri + Lando?

[Kiri](https://runkiri.com) is built in Rust to provide a lightning-fast, resource-efficient container engine with a native Docker-compatible API:

1. **Blazingly Fast**: Boots in milliseconds without the sluggish startup and overhead of Docker Desktop.
2. **Minimal Footprint**: Low CPU and RAM usage, giving your machine its resources back for IDEs and compiling.
3. **No Commercial Licensing Friction**: Avoids enterprise licensing restrictions and subscription overhead associated with Docker Desktop.
4. **Native WSL2 / Linux Experience**: Runs directly and cleanly inside Linux/WSL2 without heavy background helper daemons.

This plugin ensures Lando recognizes Kiri as a first-class container engine, skips Docker Desktop installer checks, guards against common networking pitfalls, and provides dedicated diagnostics.

---

## Key Features

- **Docker Desktop Bypass**: Automatically disables Lando's default installer prompts (`setup: buildEngine: false`) and connects directly to the Kiri Docker socket (`/var/run/docker.sock`).
- **Engine Registration & Lifecycle**: Registers Kiri as the active backend and routes error states to `kiri daemon` / `kiri status` rather than prompting you to launch Docker Desktop.
- **Port Conflict Detector**: Verifies during pre-start that Kiri's internal reverse proxy isn't conflicting with Lando Traefik on port 80/443.
- **Firewall & Port-Scan Guard**: Sets safe request timeouts (5s) for Lando's internal URL scanner, preventing 4+ minute freezes when endpoint firewalls (Windows Filtering Platform / Bitdefender) silently drop SYN packets on closed ports.
- **Built-in Diagnostic Doctor**: Provides `lando kiri-doctor` to immediately audit your Kiri socket, proxy ports, CLI, and WSL2 configuration.

---

## Health Check & Diagnostics

Run the built-in doctor command to verify your Kiri + Lando environment:

```bash
lando kiri-doctor
```

Example output:
```text
=== Lando Kiri Engine Doctor ===

[OK] Kiri CLI found: /usr/local/bin/kiri
[OK] Docker socket exists at /var/run/docker.sock
[OK] Container Engine responding: linux 27.5.1
[OK] Port 80 is available for Lando proxy
[OK] WSL2 firewall=false configured in .wslconfig

=== Doctor check complete ===
```

---

<!-- BENCHMARK_TABLE:START -->
## Performance Benchmarks

> Automated benchmark executed on GitHub Actions runner (`ubuntu-latest`, 2 vCPU, 7GB RAM).  
> Stack: Lightweight Alpine L337 container (`php:8.2-cli-alpine`, ~28 MB, built-in server).

| Metric | Docker Engine | Kiri Engine | Difference |
| :--- | :--- | :--- | :--- |
| **Cold Boot (Pull & First Start)** | 8.1s | 13.6s | **66.8% slower** |
| **Warm Restart (3x avg `lando restart`)** | 2.3s | 3.4s | **45.4% slower** |
| **CLI Exec Overhead (100x `lando php`)** | 43.8s (438ms/call) | 34.3s (343ms/call) | **21.6% faster** ⚡ |
| **Bind Mount I/O (Read 1000 files)** | 13ms | 9ms | **30.8% faster** ⚡ |
| **HTTP Latency (250 GET requests)** | 0.20s (0.8ms/req) | 0.16s (0.6ms/req) | **18.6% faster** ⚡ |
| **Teardown (`lando destroy`)** | 1.3s | 0.9s | **35.6% faster** ⚡ |

*Last benchmark run: 2026-11-23 (Kiri v0.2.2)*
<!-- BENCHMARK_TABLE:END -->

## License

[MIT](LICENSE) © Arjan Steenbergen
