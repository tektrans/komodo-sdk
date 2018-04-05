"use strict";

const request = require('request');

const config = require('../config');
const logger = require('../logger');
const matrix = require('../matrix');
const controlPanel = require('../control-panel');
const heartbeat = require('../heartbeat');

const taskArchive = require('./task-archive');

const MAX_SLEEP_BEFORE_RESEND_MS = 500;

if (config.handler_name) {
    process.title = "KOMODO-GW@" + config.handler_name;
}

if (!matrix.pending_tasks) {
    matrix.sdk_pending_tasks = [];
}

if (!matrix.active_tasks) {
    matrix.sdk_unresponsed_tasks = [];
}

if (!matrix.pending_with_response_tasks) {
    matrix.sdk_pending_with_response_tasks = [];
}

heartbeat.setModuleType('gateway');

var partner;

function setPartner(_partner) {
    partner = _partner;
}

function pullTask() {
    if (!partner) {
        return;
    }

    let core_pull_task_url;

    if (config.core_url) {
        core_pull_task_url = config.core_url + '/pull/task';
    } else if (config.pull_url.task) {
        core_pull_task_url = config.pull_url.task.replace('<CORE_APIKEY>', config.core_apikey);
    }

    if (!core_pull_task_url) {
        logger.warn('Unknown CORE task url');
        return;
    }

    let options = {
        url: core_pull_task_url,
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

function putTaskToMatrix(task) {
    if (matrix.sdk_unresponsed_tasks.indexOf(task.trx_id) < 0) {
        matrix.sdk_unresponsed_tasks.push(task.trx_id);
    }

    if (matrix.sdk_pending_tasks.indexOf(task.trx_id) < 0) {
        matrix.sdk_pending_tasks.push(task.trx_id);
    }

    if (matrix.sdk_pending_with_response_tasks.indexOf(task.trx_id) < 0) {
        matrix.sdk_pending_with_response_tasks.push(task.trx_id);
    }
}

function updateTaskOnMatrix(trx_id, rc) {
    const unresponsed_task_idx = matrix.sdk_unresponsed_tasks.indexOf(trx_id);
    if (unresponsed_task_idx >= 0) {
        matrix.sdk_unresponsed_tasks.splice(unresponsed_task_idx, 1);
    }

    if (rc === '68') {

        const pending_with_response_tasks_idx = matrix.sdk_pending_with_response_tasks.indexOf(trx_id);
        if (pending_with_response_tasks_idx >= 0) {
            matrix.sdk_pending_with_response_tasks.splice(pending_with_response_tasks_idx, 1);
        }

        return;
    }

    const pending_task_idx = matrix.sdk_pending_tasks.indexOf(trx_id);
    if (pending_task_idx >= 0) {
        matrix.sdk_pending_tasks.splice(pending_task_idx, 1);
    }
}

function forwardCoreTaskToPartner(coreMessage) {
    let task;

    try {
        task = JSON.parse(coreMessage);
    }
    catch(e) {
        logger.warn('Exception on parsing CORE pull task response', {coreMessage: coreMessage, error: e});
    }

    incrementCounterTrx();

    task.remote_product = getRemoteProduct(task.product);

    putTaskToMatrix(task);

    taskArchive.get(task, function(res) {
        if (res && partner.advice) {
            partner.advice(task);
        }
        else {
            partner.buy(task);
        }
    });
}

function replaceRc(original_rc) {
    if (!config || !config.replace_rc || !config.replace_rc.length) {
        return original_rc;
    }

    return config.replace_rc[original_rc] || original_rc;
}

function report(data) {

    let core_pull_report_url;

    if (data && data.trx_id && data.rc) {
        updateTaskOnMatrix(data.trx_id, data.rc);
    }

    if (config.core_url) {
        core_pull_report_url = config.core_url + '/pull/report';
    } else if (config.pull_url.report) {
        core_pull_report_url = config.pull_url.report.replace('<CORE_APIKEY>', config.core_apikey);
    }

    if (!core_pull_report_url) {
        logger.warn('Unknown CORE report url');
        return;
    }

    if (config && config.push_server && config.push_server.apikey && config.push_server.advice && config.push_server.advice.url && config.push_server.advice.port) {
        if (!data.misc) {
            data.misc = {};
        }

        logger.verbose('Including advice url on report');

        data.misc.advice_url = config.push_server.advice.url;
    }

    let options = {
        url: core_pull_report_url,
        form: {
            trx_id: data.trx_id,
            rc: replaceRc(data.rc),
            message: data.message,
            handler: config.handler_name,
            sn: data.sn,
            amount: data.amount,
            raw: data.raw,
            misc: data.misc
        }
    }

    if (!config.do_not_verbose_log_report) {
        logger.verbose('Report to CORE using HTTP POST');
    }

    request.post(options, function(error, response, body) {
        if (error) {
            logger.warn('Error reporting to CORE', {error: error});
            resendReport(data);
        }
        else if (response.statusCode != 200) {
            logger.warn('Error reporting to CORE, http response status is not 200', {requestOptions: options, http_response_status: response.statusCode});
            resendReport(data);
        }
        else if (!config.do_not_verbose_log_report) {
            logger.verbose('Report has been sent to CORE', {requestOptions: options});
        }
    });
}

function resendReport(data) {
    const sleepBeforeResend = Math.round(Math.random() * MAX_SLEEP_BEFORE_RESEND_MS)
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
exports.getRemoteProduct = getRemoteProduct;
