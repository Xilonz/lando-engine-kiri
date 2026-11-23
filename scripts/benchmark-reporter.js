'use strict';

const fs = require('fs');
const path = require('path');

const resultsDir = path.resolve(process.cwd(), 'results');
const dockerPath = path.join(resultsDir, 'docker.json');
const kiriPath = path.join(resultsDir, 'kiri.json');
const readmePath = path.resolve(process.cwd(), 'README.md');

if (!fs.existsSync(dockerPath) || !fs.existsSync(kiriPath)) {
  console.error('Error: docker.json or kiri.json missing in', resultsDir);
  process.exit(1);
}

const docker = JSON.parse(fs.readFileSync(dockerPath, 'utf8'));
const kiri = JSON.parse(fs.readFileSync(kiriPath, 'utf8'));

function calcComparison(dockerVal, kiriVal, lowerIsBetter = true) {
  if (dockerVal === undefined || kiriVal === undefined) return null;
  const isFaster = lowerIsBetter ? dockerVal >= kiriVal : kiriVal >= dockerVal;
  const pct = Math.abs(((dockerVal - kiriVal) / dockerVal) * 100).toFixed(1);
  const color = isFaster ? 'brightgreen' : 'orange';
  const text = isFaster ? `**${pct}% faster** ⚡` : `**${pct}% slower**`;
  return { isFaster, pct, color, text };
}

const dateStr = new Date().toISOString().split('T')[0];
const kiriVer = kiri.kiri_version ? `v${kiri.kiri_version}` : 'latest';

const tableRows = [];
const badges = [];

// 1. Cold boot
if (docker.cold_boot_ms && kiri.cold_boot_ms) {
  const comp = calcComparison(docker.cold_boot_ms, kiri.cold_boot_ms);
  tableRows.push(`| **Cold Boot (Pull & First Start)** | ${(docker.cold_boot_ms / 1000).toFixed(1)}s | ${(kiri.cold_boot_ms / 1000).toFixed(1)}s | ${comp.text} |`);
  badges.push(`[![Cold Boot](https://img.shields.io/badge/Cold%20Boot-${comp.pct}%25%20${comp.isFaster ? 'faster' : 'slower'}-${comp.color}?style=flat-square)](#performance-benchmarks)`);
}

// 2. Warm restart
if (docker.warm_restart_ms && kiri.warm_restart_ms) {
  const comp = calcComparison(docker.warm_restart_ms, kiri.warm_restart_ms);
  tableRows.push(`| **Warm Restart (\`lando restart\`)** | ${(docker.warm_restart_ms / 1000).toFixed(1)}s | ${(kiri.warm_restart_ms / 1000).toFixed(1)}s | ${comp.text} |`);
  badges.push(`[![Warm Restart](https://img.shields.io/badge/Warm%20Restart-${comp.pct}%25%20${comp.isFaster ? 'faster' : 'slower'}-${comp.color}?style=flat-square)](#performance-benchmarks)`);
}

// 3. CLI exec
if (docker.cli_exec_ms && kiri.cli_exec_ms) {
  const comp = calcComparison(docker.cli_exec_ms, kiri.cli_exec_ms);
  const runs = kiri.cli_runs || 20;
  const dockerAvg = Math.round(docker.cli_exec_ms / runs);
  const kiriAvg = Math.round(kiri.cli_exec_ms / runs);
  tableRows.push(`| **CLI Exec Overhead (${runs}x \`lando php\`)** | ${(docker.cli_exec_ms / 1000).toFixed(1)}s (${dockerAvg}ms/call) | ${(kiri.cli_exec_ms / 1000).toFixed(1)}s (${kiriAvg}ms/call) | ${comp.text} |`);
  badges.push(`[![CLI Overhead](https://img.shields.io/badge/CLI%20Exec-${comp.pct}%25%20${comp.isFaster ? 'faster' : 'slower'}-${comp.color}?style=flat-square)](#performance-benchmarks)`);
}

// 4. Bind mount I/O
if (docker.io_read_ms && kiri.io_read_ms) {
  const comp = calcComparison(docker.io_read_ms, kiri.io_read_ms);
  const files = kiri.io_files || 500;
  tableRows.push(`| **Bind Mount I/O (Read ${files} files)** | ${docker.io_read_ms}ms | ${kiri.io_read_ms}ms | ${comp.text} |`);
}

// 5. HTTP Latency
if (docker.http_ms && kiri.http_ms) {
  const comp = calcComparison(docker.http_ms, kiri.http_ms);
  const reqs = kiri.http_requests || 100;
  const dockerAvgReq = (docker.http_ms / reqs).toFixed(1);
  const kiriAvgReq = (kiri.http_ms / reqs).toFixed(1);
  tableRows.push(`| **HTTP Latency (${reqs} GET requests)** | ${(docker.http_ms / 1000).toFixed(2)}s (${dockerAvgReq}ms/req) | ${(kiri.http_ms / 1000).toFixed(2)}s (${kiriAvgReq}ms/req) | ${comp.text} |`);
}

const badgesMarkdown = `<!-- BENCHMARK_BADGES:START -->
${badges.join('\n')}
<!-- BENCHMARK_BADGES:END -->`;

const tableMarkdown = `<!-- BENCHMARK_TABLE:START -->
## Performance Benchmarks

> Automated benchmark executed on GitHub Actions runner (\`ubuntu-latest\`, 2 vCPU, 7GB RAM).  
> Stack: LAMP recipe (Apache, PHP 8.2, MariaDB 10.11).

| Metric | Docker Engine | Kiri Engine | Difference |
| :--- | :--- | :--- | :--- |
${tableRows.join('\n')}

*Last benchmark run: ${dateStr} (Kiri ${kiriVer})*
<!-- BENCHMARK_TABLE:END -->`;

console.log('--- Benchmark Results ---');
console.log(tableRows.join('\n'));
console.log('-------------------------');

if (process.env.GITHUB_STEP_SUMMARY) {
  fs.appendFileSync(process.env.GITHUB_STEP_SUMMARY, `\n${tableMarkdown}\n`);
}

if (fs.existsSync(readmePath)) {
  let readme = fs.readFileSync(readmePath, 'utf8');

  // Replace badges
  const badgeRegex = /<!-- BENCHMARK_BADGES:START -->[\s\S]*?<!-- BENCHMARK_BADGES:END -->/;
  if (badgeRegex.test(readme)) {
    readme = readme.replace(badgeRegex, badgesMarkdown);
  } else {
    readme = readme.replace(
      /(\[!\[License: MIT\]\(.*?\)\]\(.*?\)\n)/,
      `$1${badgesMarkdown}\n`
    );
  }

  // Replace table
  const tableRegex = /<!-- BENCHMARK_TABLE:START -->[\s\S]*?<!-- BENCHMARK_TABLE:END -->/;
  if (tableRegex.test(readme)) {
    readme = readme.replace(tableRegex, tableMarkdown);
  } else {
    if (readme.includes('## License')) {
      readme = readme.replace('## License', `${tableMarkdown}\n\n---\n\n## License`);
    } else {
      readme += `\n\n---\n\n${tableMarkdown}\n`;
    }
  }

  fs.writeFileSync(readmePath, readme, 'utf8');
  console.log('Successfully updated README.md with benchmark results and shields!');
}
