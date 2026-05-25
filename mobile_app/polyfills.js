// polyfills.js
// Polyfill for import.meta
if (typeof global.import === 'undefined') {
  global.import = { meta: { url: '' } };
}

// Fix for regeneratorRuntime
if (typeof global.regeneratorRuntime === 'undefined') {
  try {
    const regeneratorRuntime = require('regenerator-runtime');
    global.regeneratorRuntime = regeneratorRuntime;
  } catch (e) {
    console.warn('regenerator-runtime not available');
  }
}