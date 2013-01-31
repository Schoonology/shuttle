module.exports = require('./lib/shuttle');

// HACK - Hitting the HWM can block the process completely. To unblock applications already using Shuttle,
// I've added this hack to unblock them periodically.
setInterval(console.log, 100)
