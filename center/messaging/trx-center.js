"use strict";

/**
 * Trx Handler untuk center messaging
 */

const module_name = require('path').basename(__filename);

const request = require('request');
const strftime = require('strftime');
const config = require('../../config');
const logger = require('../../logger');
const httpResponseServer = require('../http-response-server');
const controlPanel = require('../../control-panel');
const heartbeat = require('../../heartbeat');

let transport;

if (config.origin) {
    process.title = "KOMODO-CENTER@" + config.origin.replace(/\W/g, '-').toUpperCase();
}

heartbeat.setModuleType('center')

function onOnline(params) {
    logger.info('CENTER is ONLINE, ready to communicate');
}

function onIncomingMessage(paramsFromTransport, cb) {
    logger.verbose('Reporting message to CORE', {
        origin: config.origin || config.username,
        terminal_name: paramsFromTransport && paramsFromTransport.partner ? paramsFromTransport.partner.toLowerCase() : null,
        msg: paramsFromTransport ? paramsFromTransport.msg : null
    });

    const command = paramsFromTransport.msg.split(/[\., ]+/)[0].toUpperCase();

    if (config.commands && config.commands.balance && config.commands.balance.indexOf(command) >= 0) {
        executeBalanceCheck(paramsFromTransport, cb);
    }
    else if (config.commands && config.commands.price && config.commands.price.indexOf(command) >= 0) {
        executePriceCheck(paramsFromTransport, cb);
    }
    else if (config.commands && config.commands.postpaid_inquiry && config.commands.postpaid_inquiry.indexOf(command) >= 0) {
        executePostpaidInquiry(paramsFromTransport, cb);

    }
    else if (config.commands && config.commands.postpaid_pay && config.commands.postpaid_pay.indexOf(command) >= 0) {
        executePostpaidPay(paramsFromTransport, cb);
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
            password: password,
            msg: paramsFromTransport.msg
        }
    }

    requestToCore(requestOptions);
}

function executePriceCheck(paramsFromTransport) {
    const requestOptions = {
        url: config.core_url + '/services/pricelist',
        qs: {
            terminal_name: paramsFromTransport.partner.toLowerCase(),
            keyword: paramsFromTransport.msg.trim().split(/[\., ]+/)[1],
            password: paramsFromTransport.msg.trim().split(/[\., ]+/)[2],
            postpaid: 0,
            msg: paramsFromTransport.msg
        }
    }

    requestToCore(requestOptions);
}

function parseCoreMessage(body) {
    let coreRes;

    try {
        coreRes = JSON.parse(body);
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
    const tokens = paramsFromTransport.msg.trim().split(/[\., ]+/);

    if (!tokens || tokens.length < 3) {
        if (cb) { cb(null, {msg: 'Invalid command'}); }
        return;
    }

    const qs = {
        request_id: tokens[3],
        terminal_name: paramsFromTransport.partner.toLowerCase(),
        product_name: typeof tokens[0] === 'string' ? tokens[0].toUpperCase() : null,
        destination: typeof tokens[1] === 'string' ? tokens[1].toUpperCase() : null,
        password: typeof tokens[2] === 'string' ? tokens[2] : null,
        origin: config.origin || config.username,
        report_port: config.listen_port || '80',
        msg: paramsFromTransport.msg,
        reverse_url: paramsFromTransport.reverse_url,
        center_extdata: paramsFromTransport.center_extdata
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

function executePostpaidInquiry(paramsFromTransport, cb) {
    // PAY.PLN.1234567890.PIN

    let tokens = paramsFromTransport.msg.trim().split(/[\., ]+/);

    let qs = {
        request_id: tokens[4],
        terminal_name: paramsFromTransport.partner.toLowerCase(),
        product_name: tokens[1].toUpperCase(),
        destination: tokens[2].toUpperCase(),
        password: tokens[3],
        origin: config.origin || config.username,
        report_port: config.listen_port || '80',
        msg: paramsFromTransport.msg,
        reverse_url: paramsFromTransport.reverse_url
    }

    if (!config.do_not_prefix_request_id) {
        qs.request_id = generateRequestId(qs) + '_INQ';
        if (tokens[4]) {
            qs.request_id += '_' + tokens[4];
        }
    }

    let requestOptions = {
        url: config.core_url + '/postpaid/inquiry',
        qs: qs
    }

    requestToCore(requestOptions, cb);
}

function executePostpaidPay(paramsFromTransport, cb) {
    let tokens = paramsFromTransport.msg.trim().split(/[\., ]+/);

    let qs = {
        request_id: tokens[4],
        terminal_name: paramsFromTransport.partner.toLowerCase(),
        product_name: tokens[1].toUpperCase(),
        destination: tokens[2].toUpperCase(),
        password: tokens[3],
        origin: config.origin || config.username,
        report_port: config.listen_port || '80',
        msg: paramsFromTransport.msg,
        reverse_url: paramsFromTransport.reverse_url
    }

    if (!config.do_not_prefix_request_id) {
        qs.request_id = generateRequestId(qs);
        if (tokens[4]) {
            qs.request_id += '_' + tokens[4];
        }
    }

    let requestOptions = {
        url: config.core_url + '/postpaid/pay',
        qs: qs
    }

    requestToCore(requestOptions, cb);
}

function requestToCore(requestOptions, cb) {
    logger.verbose('Requesting service to CORE', requestOptions);

    request(requestOptions, function(err, res, body) {
        if (err || res.statusCode != 200) {
            logger.warn('Error requesting to CORE', {module_name: module_name, method_name: 'requestToCore', requestOptions: requestOptions, err: err});
            let msg = "INTERNAL ERROR, silahkan cek status transaksi di WEB REPORT";
            if (requestOptions.qs.msg) {
                msg = requestOptions.qs.msg + ": " + msg;
            }

            if (cb) {
                cb(null, {msg: msg});
            }
            else if (transport.send) {
                transport.send(requestOptions.qs.terminal_name, msg);
            }
            return;
        }

        let result = parseCoreMessage(body);
        if (!result || !result.message) {
            logger.warn('Error parsing CORE response', {module_name: module_name, method_name: 'requestToCore', requestOptions: requestOptions, responseBody: body});
            let msg = "INTERNAL ERROR, silahkan cek status transaksi di WEB REPORT";
            if (requestOptions.qs.msg) {
                msg = requestOptions.qs.msg + ": " + msg;
            }

            if (cb) {
                cb(null, {msg: msg});
            }
            else if (transport.send) {
                transport.send(requestOptions.qs.terminal_name, msg);
            }
            return;
        }

        if (cb) {
            cb(null, result);
        }
        else if (transport.send) {
            transport.send(requestOptions.qs.terminal_name, result.message);

        }
    })
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
