"use strict";

const fs = require('fs');
const os = require('os');

const candindates = [
    '/etc/komodo/config.js',
    os.homedir() + '/main/config.json',
    process.cwd() + '/../../main/config.json',
];

let config;

for (let candindate in candindates) {
    if (fs.existsSync(candindate)) {
        config = require(candindate);
        break;
    }
}

module.exports = config;
