"use strict";

const express = require('express');
const bodyParser = require('body-parser');

const pull = require('./pull');
const config = require('../config');
const logger = require('../logger');
const matrix = require('../matrix');

if (!config || !config.push_server || !!config.push_server.apikey || !config.push_server.advice_port) return;

const app = express();

let partner = null;

function setPartner(_partner) {
    partner = _partner;

    app.listen(config.push_server.advice_port, function () {
        logger.info('Advice server listening', {port: config.push_server.advice_port});
    });
}

function isValidApikey(req, res, next) {
    if (req.params.apikey === config.push_server.apikey) {
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
        task = JSON.parse(coreMessage);
    }
    catch(e) {
        logger.warn('PUSH-ADVICE: Exception on parsing task to advice', {err: e});
    }

    if (!task) {
        res.end('INVALID_TASK');
        return;
    }

    task.remote_product = pull.getRemoteProduct(task.product);
    partner.advice(task);
}

app.use(bodyParser.json());
app.use('/apikey/:apikey', isValidApikey);
app.use('/apikey/:apikey/advice', adviceHandler);

exports.setPartner = setPartner;
