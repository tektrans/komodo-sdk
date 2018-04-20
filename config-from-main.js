"use strict";

const fs = require('fs');
const os = require('os');

const candindates = [
    '/etc/komodo/config.js',
    os.homedir() + '/main/config.json',
    process.cwd() + '/../../main/config.json',
    os.homedir() + '/Projects/tektrans/dev/komodo/config.json'
];

let config;

for (let candindate in candindates) {
    if (fs.existsSync(candindate)) {
        console.log(candindate + ' FOUND');
        try {
            config = require(candindate);
            config.this_config_filename = candindate;
        }
        catch(e) {}

        break;
    }
    console.log(candindate + ' NOT FOUND');
}

module.exports = config;
