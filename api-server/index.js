"use strict";

/**
 * API Server
 *
 * @todo make it work
 */

const express = require('express');

const config = require('../config');
const logger = require('../logger');
const matrix = require('../matrix');
const routerConfig = require('./router-config');

const app = express();

function isConfigured() {
    return Boolean(config && config.apiserver && config.apiserver.apikey && config.apiserver.port);
}

function isValidApikey(apikey) {
    return isConfigured() && (config.apiserver.apikey === apikey);
}

function needValidApikey(req, res, next) {
    if (isValidApikey(req.params.apikey)) {
        next();
    }
    else {
        res.end('INVALID_APIKEY');
    }
}

isConfigured() && app.listen(config.apiserver.port, function () {
    logger.info('API-SERVER listening', {port: config.apiserver.port});
});


app.use('/apikey/:apikey', needValidApikey);
app.use('/apikey/:apikey/config', routerConfig);