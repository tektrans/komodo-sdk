"use strict";

const fs = require('fs');

let configFile = process.cwd() + "/config.json";

if (!fs.existsSync(configFile)) {
    console.trace('Config file not found. Terminating');
    setImmedate(function() {
        process.exit(1);
    });
}

const config = require(configFile);

module.exports = config;
