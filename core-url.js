"use strict";

const config = require('./config.js');
const logger = require('../logger');
const configFromMain = require('./config-from-main');

let core_url;

if (config.core_url) {
    logger.verbose('Using CORE url from local config.json');
    core_url = config.core_url;
}
else if (configFromMain && configFromMain.core && configFromMain.core.url && configFromMain.core.apikey) {
    logger.verbose('Using CORE url from main config', {filename: configFromMain.this_config_filename});
    core_url = configFromMain.core.url.replace(/\/$/, '') + '/apikey/' + configFromMain.core.apikey + '/pull/task';
}

module.exports = core_url;
