"use strict";

const config = require('./config.js');
const logger = require('./logger');
const configFromMain = require('./config-from-main');

let core_url;

if (config.core_url) {
    core_url = config.core_url;
    logger.verbose('Using CORE url from local config.json', {url: core_url});
}
else if (configFromMain && configFromMain.core && configFromMain.core.url && configFromMain.core.apikey) {
    core_url = configFromMain.core.url.replace(/\/$/, '') + '/apikey/' + configFromMain.core.apikey + '/pull/task';
    logger.verbose('Using CORE url from main config', {url: core_url, filename: configFromMain.this_config_filename});
}

module.exports = core_url;
