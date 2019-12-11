'use strict';

const XiaomiAdapter = require('./xiaomi-adapter');

module.exports = (addonManager, manifest) => {
    new XiaomiAdapter(addonManager, manifest);
};
