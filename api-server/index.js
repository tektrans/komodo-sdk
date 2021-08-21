/**
 * API Server
 *
 * @todo make it work
 */

const express = require('express');
const uniqid = require('uniqid');

const config = require('../config');
const logger = require('../logger');

const requestLogger = require('./middlewares/request-logger');

const routerConfig = require('./router-config');
const routerMatrix = require('./router-matrix');
const routerServices = require('./router-services');
const routerProducts = require('./router-products');
const routerRemoteProducts = require('./router-remote-products');
const routerLocations = require('./router-locations');

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

// initialize xid
app.use((req, res, next) => {
    res.locals.xid = uniqid();
    next();
});

app.use(requestLogger);

app.use('/apikey/:apikey', needValidApikey);
app.use('/apikey/:apikey/config', routerConfig);
app.use('/apikey/:apikey/matrix', routerMatrix);
app.use('/apikey/:apikey/services', routerServices);
app.use('/apikey/:apikey/products', routerProducts);
app.use('/apikey/:apikey/remote-products', routerRemoteProducts);
app.use('/apikey/:apikey/locations', routerLocations);
