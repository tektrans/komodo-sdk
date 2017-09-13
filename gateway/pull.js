"use strict";

const request = require('request');

const config = require('../config');
const logger = require('../logger');
const matrix = require('../matrix');

var partner;

function setPartner(_partner) {
    partner = _partner;
}

function pullTask() {
    if (!partner) {
        return;
    }

    let options = {
        url: config.pull_url.task.replace('<CORE_APIKEY>', config.core_apikey),
        qs: {
            handler: config.handler_name,
            products: config.products.join(',')
        }
    }

    request(options, function(error, response, body) {
        if (error) {
            if (matrix.core_is_healthy) {
                logger.warn('Error pulling task from CORE', {error: error});
            }
            matrix.core_is_healthy = false;
            return;
        }

        if (response.statusCode != 200) {
            if (matrix.core_is_healthy) {
                logger.warn('CORE http response status code for pull task is not 200', {http_response_status: response.statusCode});
            }
            matrix.core_is_healthy = false;
            return;
        }

        if (!matrix.core_is_healthy) {
            logger.verbose('CORE is healthy');
        }
        matrix.core_is_healthy = true;

        if (body == 'NONE') {
            return;
        }

        forwardCoreTaskToPartner(body);
    });
}

function forwardCoreTaskToPartner(coreMessage) {
    let task;

    try {
        task = JSON.parse(coreMessage);
    }
    catch(e) {
        logger.warn('Exception on parsing CORE pull task response', {coreMessage: coreMessage, error: e});
    }

    task.remote_product = getRemoteProduct(task.product);

    partner.buy(task);
}

function report(data) {
    reportUsingHttpPost(data);
}

function reportUsingHttpPost(data) {
    let options = {
        url: config.pull_url.report.replace('<CORE_APIKEY>', config.core_apikey),
        form: {
            trx_id: data.trx_id,
            rc: data.rc,
            message: data.message,
            handler: config.handler_name,
            sn: data.sn,
            amount: data.amount
        }
    }

    request.post(options, function(error, response, body) {
        if (error) {
            logger.warn('Error reporting to CORE', {error: error});
        }
        else if (response.statusCode != 200) {
            logger.warn('CORE http response status is not 200', {requestOptions: options, http_response_status: response.statusCode});
        }
        else {
            logger.verbose('Report has been sent to CORE', {requestOptions: options});
        }
    });
}

function reportUsingHttpGet(data) {
    let options = {
        url: config.pull_url.report.replace('<CORE_APIKEY>', config.core_apikey),
        qs: {
            trx_id: data.trx_id,
            rc: data.rc,
            message: data.message,
            handler: config.handler_name,
            sn: data.sn,
            amount: data.amount
        }
    }


    request(options, function(error, response, body) {
        if (error) {
            logger.warn('Error reporting to CORE', {error: error});
        }
        else if (response.statusCode != 200) {
            logger.warn('CORE http response status is not 200', {requestOptions: options, http_response_status: response.statusCode});
        }
        else {
            logger.verbose('Report has been sent to CORE', {requestOptions: options});
        }
    });
}

function resendReport(data) {
    let sleepBeforeResend = 1000;
    logger.verbose('Resend report to CORE in ' + sleepBeforeResend + 'ms')

    setTimeout(
        function() {
            report(data);
        },
        sleepBeforeResend
    )
}

function isPaused() {
    return matrix.paused;
}

function pause() {
    matrix.paused = true;
}

function resume() {
    matrix.pause = false;
}

function initMatrix() {
    if (!matrix) {
        matrix = {};
    }

    matrix.counter = {
        trx: 0
    }
}

function incrementCounterTrx() {
    matrix.counter.trx++;
}

function getRemoteProduct(product) {
    let remoteProduct = config.remote_products[product];
    return remoteProduct || product;
}

initMatrix();
setInterval(pullTask, config.pull_interval_ms || 1000);

exports.setPartner = setPartner;
exports.isPaused = isPaused;
exports.pause = pause;
exports.resume = resume;
exports.report = report;
