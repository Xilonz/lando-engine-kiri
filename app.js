'use strict';

const http = require('http');

/**
 * App-level lifecycle hooks for Kiri Container Engine.
 */
module.exports = (app, lando) => {
  const _ = lando.utils.getLodash();

  // 1. Automatically inject user: "1001:0" for Bitnami database containers
  // to ensure write permissions on 0775 directories (Kiri < 0.2.3 compatibility).
  app.events.on('post-init', 2, () => {
    const patchServices = services => {
      if (!services) return;
      for (const [name, service] of Object.entries(services)) {
        const type = service.type || name;
        const image = service.image || '';
        const isDb = type.includes('mariadb') || type.includes('mysql') || image.includes('bitnami');
        if (isDb && !_.get(service, 'overrides.user')) {
          _.set(service, 'overrides.user', '1001:0');
          lando.log.verbose(`[lando-engine-kiri] Set user: "1001:0" on service ${name}`);
        }
      }
    };

    patchServices(app.config && app.config.services);
    patchServices(app.services);
  });

  // 2. Pre-start: Check if Kiri internal reverse proxy occupies port 80/443
  app.events.on('pre-start', 1, async () => {
    const isPortBusy = port => new Promise(resolve => {
      const server = http.createServer();
      server.once('error', err => {
        resolve(err.code === 'EADDRINUSE');
      });
      server.once('listening', () => {
        server.close();
        resolve(false);
      });
      server.listen(port, '127.0.0.1');
    });

    const port80Busy = await isPortBusy(80);
    if (port80Busy) {
      // Check if it's Lando's own proxy (if landoproxy is already running, port 80 being busy is expected)
      const landoProxyRunning = _.some(app.info || [], { service: 'proxy' });
      if (!landoProxyRunning) {
        lando.log.warn('[lando-engine-kiri] Port 80 is currently occupied. If Kiri reverse proxy is listening on port 80, move it to 8080 or disable it to avoid proxy conflicts with Lando Traefik.');
      }
    }
  });
};
