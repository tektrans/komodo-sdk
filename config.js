"use strict";

const fs = require('fs');
const configFiller = require('./config-filler');

let configFile = process.cwd() + "/config.json";

if (!fs.existsSync(configFile)) {
    console.trace('Config file not found. Terminating');
    //setImmediate(function() {
        process.exit(1);
    //});
}

const config = require(configFile);
configFiller.go();

module.exports = config;
