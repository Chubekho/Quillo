// Mock AWS SDK client for esbuild bundling
module.exports = {
  CloudWatchLogs: class CloudWatchLogs {
    constructor() {}
    send() { return Promise.resolve({}); }
  }
};
