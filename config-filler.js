"use strict";

const moment = require('moment');
const config = require('./config');

function go() {
    moment.locale(config.moment_locale || 'id');
}

exports.go = go;
