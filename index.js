'use strict';

const XiaomiAdapter = require('./xiaomi-adapter').default.default;

module.exports = (addonManager, manifest) => {
    new XiaomiAdapter(addonManager, manifest);
};
