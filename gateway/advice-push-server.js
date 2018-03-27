"use strict";

const express = require('express');
const bodyParser = require('body-parser');

const pull = require('./pull');
const config = require('../config');
const logger = require('../logger');
const matrix = require('../matrix');

const app = express();

let partner = null;

function setPartner(_partner) {
    partner = _partner;

    if (!config || !config.push_server || !config.push_server.apikey || !config.push_server.advice || !config.push_server.advice.url || !config.push_server.advice.port) {
        return;
    }

    app.listen(config.push_server.advice.port, function () {
        logger.info('Advice server listening', {port: config.push_server.advice.port});
    });
}

function isValidApikey(req, res, next) {
    if (config.push_server && config.push_server.apikey && (req.params.apikey === config.push_server.apikey)) {
        next();
    }
    else {
        res.end('INVALID_APIKEY');
    }
}

function adviceHandler(req, res, next) {

    if (!partner) {
        logger.warn('PUSH-ADVICE: Undefined partner, skipped');
        res.end('UNDEFINED_PARTNER');
        return;
    }

    if (!partner.advice) {
        logger.warn('PUSH-ADVICE: Partner does not have ADVICE capabilities');
        res.end('UNSUPPORTED');
        return;
    }

    let task = null;

    try {
        task = JSON.parse(req.body);
    }
    catch(e) {
        logger.warn('PUSH-ADVICE: Exception on parsing task to advice', {err: e, body: req.body});
    }

    if (!task) {
        logger.warn('PUSH-ADVICE: Invalid task');
        res.end('INVALID_TASK');
        return;
    }

    logger.verbose('PUSH-ADVICE: Got advice push', {task: task});

    task.remote_product = pull.getRemoteProduct(task.product);
    partner.advice(task);
}

app.use(bodyParser.json());
app.use('/apikey/:apikey', isValidApikey);
app.use('/apikey/:apikey/advice', adviceHandler);

exports.setPartner = setPartner;
