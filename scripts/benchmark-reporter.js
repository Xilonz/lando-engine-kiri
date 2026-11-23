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

// Cold boot metrics
const dockerBootSec = (docker.cold_boot_ms / 1000).toFixed(1);
const kiriBootSec = (kiri.cold_boot_ms / 1000).toFixed(1);
const bootFaster = docker.cold_boot_ms >= kiri.cold_boot_ms;
const bootPct = Math.abs(((docker.cold_boot_ms - kiri.cold_boot_ms) / docker.cold_boot_ms) * 100).toFixed(1);
const bootBadgeColor = bootFaster ? 'brightgreen' : 'orange';
const bootDiffText = bootFaster ? `**${bootPct}% faster** ⚡` : `**${bootPct}% slower**`;

// CLI exec metrics
const dockerExecSec = (docker.cli_exec_ms / 1000).toFixed(1);
const kiriExecSec = (kiri.cli_exec_ms / 1000).toFixed(1);
const dockerAvgMs = Math.round(docker.cli_exec_ms / (docker.cli_runs || 10));
const kiriAvgMs = Math.round(kiri.cli_exec_ms / (kiri.cli_runs || 10));
const execFaster = docker.cli_exec_ms >= kiri.cli_exec_ms;
const execPct = Math.abs(((docker.cli_exec_ms - kiri.cli_exec_ms) / docker.cli_exec_ms) * 100).toFixed(1);
const execBadgeColor = execFaster ? 'brightgreen' : 'orange';
const execDiffText = execFaster ? `**${execPct}% faster** ⚡` : `**${execPct}% slower**`;

const dateStr = new Date().toISOString().split('T')[0];
const kiriVer = kiri.kiri_version ? `v${kiri.kiri_version}` : 'latest';

// Generate shields
const bootBadgeUrl = `https://img.shields.io/badge/Cold%20Boot-${bootPct}%25%20${bootFaster ? 'faster' : 'slower'}-${bootBadgeColor}?style=flat-square`;
const execBadgeUrl = `https://img.shields.io/badge/CLI%20Exec-${execPct}%25%20${execFaster ? 'faster' : 'slower'}-${execBadgeColor}?style=flat-square`;

const badgesMarkdown = `<!-- BENCHMARK_BADGES:START -->
[![Cold Boot](${bootBadgeUrl})](#performance-benchmarks)
[![CLI Overhead](${execBadgeUrl})](#performance-benchmarks)
<!-- BENCHMARK_BADGES:END -->`;

// Generate Markdown Table
const tableMarkdown = `<!-- BENCHMARK_TABLE:START -->
## Performance Benchmarks

> Automated benchmark executed on GitHub Actions runner (\`ubuntu-latest\`, 2 vCPU, 7GB RAM).  
> Stack: WordPress recipe (Nginx, PHP 8.2-FPM, MariaDB).

| Metric | Docker Engine | Kiri Engine | Difference |
| :--- | :--- | :--- | :--- |
| **Cold Boot (\`lando start\`)** | ${dockerBootSec}s | ${kiriBootSec}s | ${bootDiffText} |
| **CLI Exec Overhead (${kiri.cli_runs || 10}x \`lando php\`)** | ${dockerExecSec}s (${dockerAvgMs}ms/call) | ${kiriExecSec}s (${kiriAvgMs}ms/call) | ${execDiffText} |

*Last benchmark run: ${dateStr} (Kiri ${kiriVer})*
<!-- BENCHMARK_TABLE:END -->`;

console.log('--- Benchmark Results ---');
console.log(`Cold Boot: Docker ${dockerBootSec}s vs Kiri ${kiriBootSec}s (${bootPct}% ${bootFaster ? 'faster' : 'slower'})`);
console.log(`CLI Exec: Docker ${dockerExecSec}s vs Kiri ${kiriExecSec}s (${execPct}% ${execFaster ? 'faster' : 'slower'})`);
console.log('-------------------------');

// Write to GITHUB_STEP_SUMMARY if available
if (process.env.GITHUB_STEP_SUMMARY) {
  fs.appendFileSync(process.env.GITHUB_STEP_SUMMARY, `\n${tableMarkdown}\n`);
}

// Update README.md
if (fs.existsSync(readmePath)) {
  let readme = fs.readFileSync(readmePath, 'utf8');

  // Replace badges
  const badgeRegex = /<!-- BENCHMARK_BADGES:START -->[\s\S]*?<!-- BENCHMARK_BADGES:END -->/;
  if (badgeRegex.test(readme)) {
    readme = readme.replace(badgeRegex, badgesMarkdown);
  } else {
    // If not present yet, inject after existing badges
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
    // Append table before License or at the end
    if (readme.includes('## License')) {
      readme = readme.replace('## License', `${tableMarkdown}\n\n---\n\n## License`);
    } else {
      readme += `\n\n---\n\n${tableMarkdown}\n`;
    }
  }

  fs.writeFileSync(readmePath, readme, 'utf8');
  console.log('Successfully updated README.md with benchmark results and shields!');
}
