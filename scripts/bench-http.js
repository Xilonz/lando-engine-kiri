#!/usr/bin/env node
'use strict';

const http = require('http');

const url = process.argv[2] || 'http://127.0.0.1:8080/';
const count = parseInt(process.argv[3], 10) || 100;

async function run() {
  const start = Date.now();
  for (let i = 0; i < count; i++) {
    await new Promise((resolve, reject) => {
      http.get(url, (res) => {
        res.resume();
        res.on('end', resolve);
      }).on('error', reject);
    });
  }
  const duration = Date.now() - start;
  console.log(duration);
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
