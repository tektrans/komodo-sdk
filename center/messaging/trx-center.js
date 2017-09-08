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

function onIncomingMessage(paramsFromTransport, cb) {
    logger.verbose('Reporting message to CORE')

    const command = paramsFromTransport.msg.split(/[\., ]+/)[0].toUpperCase();

    if (config.commands && config.commands.balance.indexOf(command) >= 0) {
        executeBalanceCheck(paramsFromTransport, cb);
    }
    else if (config.commands && config.commands.price.indexOf(command) >= 0) {
        executePriceCheck(paramsFromTransport, cb);
    }
    else {
        executePrepaidBuy(paramsFromTransport, cb);
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

function generateRequestId(req) {
    return 'AUTO_' + req.product_name + '_' + req.destination + '_' + strftime('%Y%m%d');
}

function executePrepaidBuy(paramsFromTransport, cb) {
    let tokens = paramsFromTransport.msg.trim().split(/[\., ]+/);

    let qs = {
        request_id: tokens[3],
        terminal_name: paramsFromTransport.partner.toLowerCase(),
        product_name: tokens[0].toUpperCase(),
        destination: tokens[1].toUpperCase(),
        password: tokens[2],
        origin: config.origin || config.username,
        report_port: config.listen_port || '80',
        msg: paramsFromTransport.msg
    }

    if (!config.do_not_prefix_request_id) {
        qs.request_id = generateRequestId(qs);
        if (tokens[3]) {
            qs.request_id += '_' + tokens[3];
        }
    }

    let requestOptions = {
        url: config.core_url + '/prepaid/buy',
        qs: qs
    }

    requestToCore(requestOptions, cb);
}

function requestToCore(requestOptions, partner) {
    logger.verbose('Requesting service to CORE', requestOptions);

    request(requestOptions, function(err, res, body) {
        if (err || res.statusCode != 200) {
            logger.warn('Error requesting to CORE', {module_name: module_name, method_name: 'requestToCore', requestOptions: requestOptions, err: err});
            transport.send(requestOptions.qs.terminal_name, 'INTERNAL ERROR');
            if (cb) { cb(null, {msg: 'INTERNAL ERROR'}); }
            return;
        }

        let result = parseCoreMessage(body);
        if (!result || !result.message) {
            transport.send(requestOptions.qs.terminal_name, 'INTERNAL ERROR');
            if (cb) { cb(null, {msg: 'INTERNAL ERROR'}); }
            return;
        }

        transport.send(requestOptions.qs.terminal_name, result.message);
        if (cb) {
            cb(null, result);
        }
    })
}

function setTransport(_transport) {
    transport = _transport;
    httpResponseServer.setTransport(transport);
}

const callback = {
    onOnline: onOnline,
    onIncomingMessage: onIncomingMessage,
    onH2HIncomingMessage: onH2HIncomingMessage
}

exports.callback = callback;
exports.setTransport = setTransport;
