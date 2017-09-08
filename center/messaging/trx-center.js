"use strict";

/**
 * Trx Handler untuk center messaging
 */

const path = require('path');
const request = require('request');
const strftime = require('strftime');
const config = require('../../config');
const logger = require('../../logger');
const httpResponseServer = require('../http-response-server');

const module_name = path.basename(__filename);

let transport;

function onOnline(params) {
    logger.info('CENTER is ONLINE, ready to communicate');

}

function onIncomingMessage(paramsFromTransport) {
    logger.verbose('Reporting message to CORE')

    const command = paramsFromTransport.msg.split(/[\., ]+/)[0].toUpperCase();

    if (config.commands.balance.indexOf(command) >= 0) {
        executeBalanceCheck(paramsFromTransport);
    }
    else if (config.commands.price.indexOf(command) >= 0) {
        executePriceCheck(paramsFromTransport);
    }
    else {
        executePrepaidBuy(paramsFromTransport);
    }
}

function executeBalanceCheck(paramsFromTransport) {
    const terminal_name = paramsFromTransport.partner.toLowerCase();
    const password = paramsFromTransport.msg.trim().split(/[\., ]+/)[1];

    const requestOptions = {
        url: config.core_url + '/services/balance',
        qs: {
            terminal_name: terminal_name,
            password: password
        }
    }

    requestToCore(requestOptions);
}

function executePriceCheck(paramsFromTransport) {
    const requestOptions = {
        url: config.core_url + '/services/pricelist',
        qs: {
            terminal_name: paramsFromTransport.partner.toLowerCase(),
            keyword: paramsFromTransport.msg.trim().split(/[\., ]+/)[1]
        }
    }

    requestToCore(requestOptions);
}

function parseBalanceResponse(body) {
    let result;

    try {
        result = JSON.parse(body);
    }
    catch(e) {
        logger.warn('Error JSON parsing', {module_name: module_name, method_name: 'parseBalanceResponse', body: body})
        result = null;
    }
    return result;
}

function generateRequestId(req) {
    return 'AUTO_' + req.product_name + '_' + req.destination + '_' + strftime('%Y%m%d');
}

function executePrepaidBuy(paramsFromTransport) {
    let tokens = paramsFromTransport.msg.trim().split(/[\., ]+/);

    let qs = {
        request_id: null,
        terminal_name: paramsFromTransport.partner.toLowerCase(),
        product_name: tokens[0].toUpperCase(),
        destination: tokens[1].toUpperCase(),
        password: tokens[2],
        origin: config.origin || config.username,
        report_port: config.listen_port || '80',
        msg: paramsFromTransport.msg
    }

    qs.request_id = generateRequestId(qs);
    if (tokens[3]) {
        qs.request_id += '_' + tokens[3];
    }

    let requestOptions = {
        url: config.core_url + '/prepaid/buy',
        qs: qs
    }

    requestToCore(requestOptions);
}

function requestToCore(requestOptions, partner) {
    logger.verbose('Requesting service to CORE', requestOptions);

    request(requestOptions, function(err, res, body) {
        if (err || res.statusCode != 200) {
            logger.warn('Error requesting to CORE', {module_name: module_name, method_name: 'requestToCore', requestOptions: requestOptions, err: err});
            transport.send(requestOptions.qs.terminal_name, 'INTERNAL ERROR');
            return;
        }

        let result = parseBalanceResponse(body);
        if (!result || !result.message) {
            transport.send(requestOptions.qs.terminal_name, 'INTERNAL ERROR');
            return;
        }

        transport.send(requestOptions.qs.terminal_name, result.message);
    })
}

function parseCoreMessage(body) {
    let coreRes;

    try {
        coreRes = JSON.parse(body)
    }
    catch(err) {
        logger.warn('Exception on parsing CORE response as JSON', {body: body, err: err});
        coreRes = null;
    }

    return coreRes;
}

function setTransport(_transport) {
    transport = _transport;
    httpResponseServer.setTransport(transport);
}

const callback = {
    onOnline: onOnline,
    onIncomingMessage: onIncomingMessage
}

exports.callback = callback;
exports.setTransport = setTransport;
