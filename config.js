'use strict';

const fs = require('fs');
const configFiller = require('./config-filler');

let configFile = process.cwd() + '/config.json';

if (!fs.existsSync(configFile)) {
    configFile = process.cwd() + '/config.js';
    if (!fs.existsSync(configFile)) {
        throw new Error("Config file not found");
    }
}

const config = require(configFile);
configFiller.go();

module.exports = config;
