const MODULE_NAME = 'KOMODO-SDK.GATEWAY.ADVICE-PUSH-SERVER';

const express = require('express');
const logger = require('tektrans-logger');

const config = require('../config');

const app = express();

let partner = null;

function setPartner(_partner) {
    if (!config.push_server.advice.port) {
        logger.info(`${MODULE_NAME} EE186FAC: config.push_server.advice.port not set, skip listening`);
        return;
    }

    partner = _partner;

    if (
        !config
        || !config.push_server
        || !config.push_server.apikey
        || !config.push_server.advice
        || !config.push_server.advice.url
        || !config.push_server.advice.port) {
        return;
    }

    app.listen(config.push_server.advice.port, () => {
        logger.info(`${MODULE_NAME} 7C994547: Listening`, {
            port: config.push_server.advice.port,
        });
    });
}

function isValidApikey(req, res, next) {
    const { xid } = res.locals;

    if (
        config.push_server
        && config.push_server.apikey
        && (req.params.apikey === config.push_server.apikey)
    ) {
        next();
    } else {
        logger.verbose(`${MODULE_NAME} 22222BF5: Invalid APIKEY`, { xid });
        res.end('INVALID_APIKEY');
    }
}

function adviceHandler(req, res) {
    const { xid } = res.locals;

    if (!partner) {
        logger.warn(`${MODULE_NAME} 58FACCD9: Undefined partner, skipped`, { xid });
        res.end('UNDEFINED_PARTNER');
        return;
    }

    if (!partner.advice) {
        logger.warn(`${MODULE_NAME} 73E745A0: Partner does not have ADVICE capabilities`, { xid });
        res.end('UNSUPPORTED');
        return;
    }

    const task = req.body;

    if (!task || !task.trx_id || !task.destination || !task.product) {
        logger.warn(`${MODULE_NAME} DABD50A5: Invalid task`, { xid, task });
        res.end('INVALID_TASK');
        return;
    }

    res.end('OK');

    logger.verbose(`${MODULE_NAME} DB27D06B: Got advice push`, { xid, task });

    task.remote_product = config.remote_products[task.product] || task.product;
    if (Number(config.sdk_trx_id_adder)) {
        task.trx_id = Number(task.trx_id) + Number(config.sdk_trx_id_adder);
    }

    partner.advice(task);
}

app.post('/apikey/:apikey/advice', isValidApikey, express.json(), adviceHandler);

exports.setPartner = setPartner;
