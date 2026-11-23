'use strict';

const fs = require('fs');
const http = require('http');
const { execSync } = require('child_process');

module.exports = lando => {
  return {
    command: 'kiri-doctor',
    describe: 'Diagnoses Kiri container engine setup and compatibility with Lando',
    run: async () => {
      console.log('\n=== Lando Kiri Engine Doctor ===\n');

      // 1. Check Kiri CLI
      let kiriCliOk = false;
      let kiriVersion = 'Not found';
      try {
        const out = execSync('kiri --version 2>/dev/null || which kiri', { encoding: 'utf8' }).trim();
        kiriCliOk = true;
        kiriVersion = out;
        console.log(`[OK] Kiri CLI found: ${kiriVersion}`);
      } catch (e) {
        console.log('[WARN] Kiri CLI not found in PATH');
      }

      // 2. Check Docker socket
      const socketPath = '/var/run/docker.sock';
      if (fs.existsSync(socketPath)) {
        console.log(`[OK] Docker socket exists at ${socketPath}`);
      } else {
        console.log(`[FAIL] Docker socket missing at ${socketPath}`);
      }

      // 3. Check Engine via Docker CLI / Info
      try {
        const info = execSync('docker version --format "{{.Server.Os}} {{.Server.Version}}" 2>/dev/null', { encoding: 'utf8' }).trim();
        console.log(`[OK] Container Engine responding: ${info}`);
      } catch (e) {
        console.log('[FAIL] Could not query container engine via docker socket');
      }

      // 4. Check Port 80 availability
      const checkPort = port => new Promise(resolve => {
        const server = http.createServer();
        server.once('error', err => resolve(err.code === 'EADDRINUSE'));
        server.once('listening', () => {
          server.close();
          resolve(false);
        });
        server.listen(port, '127.0.0.1');
      });

      const port80InUse = await checkPort(80);
      if (port80InUse) {
        console.log('[INFO] Port 80 is in use (by Lando proxy or Kiri proxy)');
      } else {
        console.log('[OK] Port 80 is available for Lando proxy');
      }

      // 5. Check .wslconfig firewall
      const wslConfigPath = '/mnt/c/Users/steen/.wslconfig';
      if (fs.existsSync(wslConfigPath)) {
        const content = fs.readFileSync(wslConfigPath, 'utf8');
        if (content.includes('firewall=false')) {
          console.log('[OK] WSL2 firewall=false configured in .wslconfig');
        } else {
          console.log('[WARN] WSL2 firewall=false NOT found in .wslconfig (closed ports may hang)');
        }
      }

      console.log('\n=== Doctor check complete ===\n');
    }
  };
};
