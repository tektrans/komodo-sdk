"use strict";

const config = require('./config.js');
const configFromMain = require('./config-from-main');

let core_url;

if (config.core_url) {
    core_url = config.core_url;
}
else if (configFromMain && configFromMain.core && configFromMain.core.url && configFromMain.core.apikey) {
    core_url = configFromMain.core.url.replace(/\/$/, '') + '/apikey/' + configFromMain.core.apikey + '/pull/task';
}

module.exports = core_url;
