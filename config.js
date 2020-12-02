const fs = require('fs');
const moment = require('moment');
// const configFiller = require('./config-filler');

let configFile = process.cwd() + '/config.json';

if (!fs.existsSync(configFile)) {
    configFile = process.cwd() + '/config.js';
    if (!fs.existsSync(configFile)) {
        throw new Error("Config file not found");
    }
}

global.KOMODO_SDK_CONFIG_FILENAME = configFile;

const config = require(configFile);
// configFiller.go();
moment.locale(config.moment_locale || 'id');

module.exports = config;
