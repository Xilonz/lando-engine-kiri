'use strict';

/**
 * Lando Engine Integration for Kiri Container Engine.
 *
 * 1. Configures Kiri as the active container engine and disables Docker Desktop installer checks.
 * 2. Sets safe default timeouts for internal network scans to avoid stalls on closed ports.
 * 3. Provides Kiri-specific health and error handling.
 */
module.exports = lando => {
  // 1. Prevent Lando from timing out for 127s on closed ports if Windows/Bitdefender drops SYN packets
  try {
    const axios = lando.utils.getAxios();
    if (axios && axios.defaults && !axios.defaults.timeout) {
      axios.defaults.timeout = 5000;
    }
  } catch (e) {
    // ignore
  }

  // 2. Pre-bootstrap engine: configure Kiri as engine and disable Docker Desktop auto-installer
  lando.events.on('pre-bootstrap-engine', () => {
    // Disable Docker Desktop setup/download check
    if (lando.config.setup) {
      lando.config.setup.buildEngine = false;
    }

    // Set engine type identifier
    lando.config.engine = 'kiri';

    // Ensure socket points to default docker/kiri socket
    if (lando.config.engineConfig) {
      lando.config.engineConfig.socketPath = lando.config.engineConfig.socketPath || '/var/run/docker.sock';
    }
  });

  // 3. Post-bootstrap engine: wrap engine health check to report Kiri status cleanly
  lando.events.on('post-bootstrap-engine', () => {
    if (lando.engine) {
      const origIsRunning = lando.engine.isRunning;
      if (typeof origIsRunning === 'function') {
        lando.engine.isRunning = async function() {
          try {
            return await origIsRunning.apply(this, arguments);
          } catch (err) {
            lando.log.warn('[lando-engine-kiri] Engine communication failed. Is the Kiri daemon running? Check "kiri status" or "kiri daemon".');
            throw err;
          }
        };
      }
    }
  });
};
