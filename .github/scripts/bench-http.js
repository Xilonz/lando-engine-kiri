#!/usr/bin/env node
'use strict';

const http = require('http');

const url = process.argv[2] || 'http://127.0.0.1:8080/';
const count = parseInt(process.argv[3], 10) || 250;
const warmup = parseInt(process.argv[4], 10) || 10;

function get(u) {
  return new Promise((resolve, reject) => {
    http.get(u, (res) => {
      res.resume();
      res.on('end', resolve);
    }).on('error', reject);
  });
}

async function run() {
  // Warmup pass
  for (let i = 0; i < warmup; i++) {
    await get(url);
  }

  const start = Date.now();
  for (let i = 0; i < count; i++) {
    await get(url);
  }
  const duration = Date.now() - start;
  console.log(duration);
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
