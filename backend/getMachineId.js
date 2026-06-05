const { machineIdSync } = require('node-machine-id');

try {
  const id = machineIdSync();
  console.log('Machine ID:', id);
} catch (err) {
  console.error('Error reading machine ID:', err.message);
}