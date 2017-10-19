"use strict";

const moment = require('moment');
const config = require('./config');

function do() {
    moment.locale(config.moment_locale || 'id');
}

exports.do = do;
