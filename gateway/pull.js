const MODULE_NAME = 'KOMODO-SDK.PULL';

const IS_DEBUG = process.env.KOMODO_SDK_DEBUG_PULL;

const request = require('request');
const stringify = require('json-stringify-pretty-compact');
const logger = require('tektrans-logger');

const config = require('../config');
const matrix = require('../matrix');

if (config.control_panel && (config.control_panel.listen_port || config.control_panel.port)) {
    require('../control-panel');
}

const heartbeat = require('../heartbeat');
const core_url = require('../core-url');

const taskArchive = require('./task-archive');

const MAX_SLEEP_BEFORE_RESEND_MS = 500;
const DELAY_AFTER_NO_TASK_MS = 500;

let is_on_delay_after_no_task = false;
let pullTaskLocked = false;

if (config.handler_name) {
    process.title = "KOMODO-GW@" + config.handler_name;
}

matrix.sdk_pending_tasks_count = 0;
matrix.sdk_unresponsed_tasks_count = 0;
matrix.sdk_pending_with_response_tasks_count = 0;

if (!matrix.sdk_pending_tasks) {
    matrix.sdk_pending_tasks = [];
}

if (!matrix.sdk_unresponsed_tasks) {
    matrix.sdk_unresponsed_tasks = [];
}

if (!matrix.sdk_pending_with_response_tasks) {
    matrix.sdk_pending_with_response_tasks = [];
}

heartbeat.setModuleType('gateway');

var partner;

function onNoTask() {
    is_on_delay_after_no_task = true;
    setTimeout(function() {
        is_on_delay_after_no_task = false;
    }, DELAY_AFTER_NO_TASK_MS)
}

function setPartner(_partner) {
    partner = _partner;
}

function pullTask() {
    if (isPaused()) {
        if (IS_DEBUG) {
            logger.verbose(`${MODULE_NAME} 76370FE5: PULL TASK paused`);
        }
        return;
    }

    if (is_on_delay_after_no_task && !config.disable_delay_after_no_task) {
        return;
    }

    if (!partner) {
        if (IS_DEBUG) {
            logger.verbose(`${MODULE_NAME} FFB54A2A: PULL TASK disabled because of undefined partner`);
        }

        return;
    }

    if (matrix && matrix.not_ready) {
        if (IS_DEBUG) {
            logger.verbose(`${MODULE_NAME} 68BDA23B: PULL TASK paused because of gateway is not ready`)
        }
        return;
    }

    let core_pull_task_url;

    if (core_url) {
        core_pull_task_url = core_url + '/pull/task';
    }
    else if (config && config.pull_url && config.pull_url.task) {
        core_pull_task_url = config.pull_url.task.replace('<CORE_APIKEY>', config.core_apikey);
    }

    if (!core_pull_task_url) {
        logger.warn(`${MODULE_NAME} 5F0681B7: Unknown CORE task url`);
        return;
    }

    //if (config.pulltask_mutex && pullTaskLocked) {
    if (pullTaskLocked) {
        if (IS_DEBUG) {
            logger.verbose(`${MODULE_NAME} B81F0CCD: PULL TASK paused because LOCKED`);
        }
        return;
    }
    pullTaskLocked = true;

    const body_or_qs = {
        handler: config.handler_name,
        products: (config.products || []).join(','),
        locations: config.locations && config.locations.length ? config.locations.join(',') : 'ALL',
        advice_url: (config && config.push_server && config.push_server.apikey && config.push_server.advice && config.push_server.advice.url && config.push_server.advice.port) ? config.push_server.advice.url : null,
        api_url: (config && config.apiserver && config.apiserver.apikey && config.apiserver.url) ? config.apiserver.url : null,
        cp_url: (config && config.control_panel && config.control_panel.url) ? config.control_panel.url : null,
        komodosdk_type: matrix.komodosdk_type,
        komodosdk_version: matrix.komodosdk_version
    };

    let options = {
        url: core_pull_task_url,
        timeout: config.request_timeout || 10000
    }

    if (config.pull_task_use_post) {
        //logger.verbose('Requesting PULL-TASK to CORE using POST');
        if (IS_DEBUG) {
            logger.verbose(`${MODULE_NAME} CB855B30: PULL TASK using HTTP POST`);
        }
        options.method = 'POST';
        options.form = body_or_qs;
    }
    else {
        if (IS_DEBUG) {
            logger.verbose(`${MODULE_NAME} BA2EF935: PULL TASK using HTTP GET`);
        }
        options.method = 'GET';
        options.qs = body_or_qs;
    }

    if (config && config.debug_request_task_to_core) {
        logger.verbose(`${MODULE_NAME} 0642E25C: Requesting task to CORE`, {url: options.url, method: options.method, body_or_qs: body_or_qs});
    }

    const start_time = new Date();
    request(options, function(error, response, body) {
        pullTaskLocked = false;

        const lame_limit = 10 * 1000;
        const delta_time = new Date() - start_time;
        if (delta_time > lame_limit) {
            logger.warn(`${MODULE_NAME} B892DC43: LAME-PULL: PULL response from CORE exceeds ` + lame_limit + ' secs', {delta_time: delta_time});
        }

        if (error) {
            if (matrix.core_is_healthy) {
                logger.warn(`${MODULE_NAME} FB762F4A: Error pulling task from CORE`, {error: error});
            }
            matrix.core_is_healthy = false;
            onNoTask();
            return;
        }

        if (response.statusCode != 200) {
            if (matrix.core_is_healthy) {
                logger.warn(`${MODULE_NAME} 8943EECB: CORE http response status code for pull task is not 200`, {http_response_status: response.statusCode});
            }
            matrix.core_is_healthy = false;
            onNoTask();
            return;
        }

        if (!matrix.core_is_healthy) {
            logger.verbose(`${MODULE_NAME} 099F5B3C: CORE is healthy`);
        }
        matrix.core_is_healthy = true;

        if (body === 'NONE') {
            onNoTask();
            return;
        }

        if (body === 'LOCKED') {
            return;
        }

        forwardCoreTaskToPartner(body, start_time);
    });
}

function putTaskToMatrix(task) {
    const trx_id = Number(task.trx_id);

    if (matrix.sdk_unresponsed_tasks.indexOf(trx_id) < 0) {
        matrix.sdk_unresponsed_tasks.push(trx_id);
        matrix.sdk_unresponsed_tasks_count = matrix.sdk_unresponsed_tasks.length;
    }

    if (matrix.sdk_pending_tasks.indexOf(trx_id) < 0) {
        matrix.sdk_pending_tasks.push(trx_id);
        matrix.sdk_pending_tasks_count = matrix.sdk_pending_tasks.length;
    }
}

function updateTaskOnMatrix(trx_id, rc) {
    trx_id = Number(trx_id);

    const unresponsed_task_idx = matrix.sdk_unresponsed_tasks.indexOf(trx_id);
    if (unresponsed_task_idx >= 0) {
        matrix.sdk_unresponsed_tasks.splice(unresponsed_task_idx, 1);
    }
    matrix.sdk_unresponsed_tasks_count = matrix.sdk_unresponsed_tasks.length;

    if (rc == '68') {
        const pending_with_response_tasks_idx = matrix.sdk_pending_with_response_tasks.indexOf(trx_id);
        if (pending_with_response_tasks_idx < 0) {
            matrix.sdk_pending_with_response_tasks.push(trx_id);
            matrix.sdk_pending_with_response_tasks_count = matrix.sdk_pending_with_response_tasks.length;
        }
    }
    else {
        const pending_task_idx = matrix.sdk_pending_tasks.indexOf(trx_id);
        if (pending_task_idx >= 0) {
            matrix.sdk_pending_tasks.splice(pending_task_idx, 1);
            matrix.sdk_pending_tasks_count = matrix.sdk_pending_tasks.length;
        }

        const pending_with_response_tasks_idx = matrix.sdk_pending_with_response_tasks.indexOf(trx_id);
        if (pending_with_response_tasks_idx >= 0) {
            matrix.sdk_pending_with_response_tasks.splice(pending_with_response_tasks_idx, 1);
            matrix.sdk_pending_with_response_tasks_count = matrix.sdk_pending_with_response_tasks.length;
        }
    }
}

function forwardCoreTaskToPartner(coreMessage, start_time) {
    let task;

    try {
        task = JSON.parse(coreMessage);
    }
    catch(e) {
        logger.warn(`${MODULE_NAME} E757F11A: Exception on parsing CORE pull task response`, { coreMessage, eCode: e.code, eMessage: e.message });
        return;
    }

    if (config.sdk_pull_only_postpaid) {
        logger.warn(`${MODULE_NAME} E6662C4F: Got task on sdk_pull_only_postpaid. It should not be happens`, { task });
        report({
            trx_id: task.trx_id,
            rc: '40',
            message: 'GATEWAY ini diset hanya untuk transaksi postpaid (config.sdk_pull_only_postpaid)',
        });
        return;
    }


    const core_pull_request_time = start_time ? (new Date() - start_time) / 1000 : null;

    incrementCounterTrx();

    task.remote_product = getRemoteProduct(task.product);
    if (Number(config.sdk_trx_id_adder)) {
        task.trx_id = Number(task.trx_id) + Number(config.sdk_trx_id_adder);
    }

    putTaskToMatrix(task);

    const created_ts = new Date(task.created);
    const queue_time = ((new Date()) - created_ts) / 1000;
    logger.info(`${MODULE_NAME} 7F131334: Got task from CORE`, { trx_id: task.trx_id, destination: task.destination, product: task.product, queue_time: queue_time, core_pull_request_time: core_pull_request_time });

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
    if (!config || !config.replace_rc) {
        return original_rc;
    }

    return config.replace_rc[original_rc] || original_rc;
}

function report(data, xid) {

    let core_pull_report_url;

    if (data && data.trx_id && data.rc) {
        updateTaskOnMatrix(data.trx_id, data.rc);
    }

    if (core_url) {
        core_pull_report_url = core_url + '/pull/report';
    } else if (config && config.pull_url && config.pull_url.report) {
        core_pull_report_url = config.pull_url.report.replace('<CORE_APIKEY>', config.core_apikey);
    }

    if (!core_pull_report_url) {
        logger.warn(`${MODULE_NAME} C23CC601: Unknown CORE report url`);
        return;
    }

    if (config && config.push_server && config.push_server.apikey && config.push_server.advice && config.push_server.advice.url && config.push_server.advice.port) {
        if (!data.misc) {
            data.misc = {};
        }

        //logger.verbose('Including advice url on report');
        data.misc.advice_url = config.push_server.advice.url;
    }

    let trx_id = Number(data.trx_id) - (Number(config.sdk_trx_id_adder) || 0);
    if (trx_id <= 0) {
        logger.warn(`${MODULE_NAME} 6A8C7303: REPORT: calculated trx_id is a negative number, using uncalculated trx_id`, {uncalculated: data.trx_id, calculated: trx_id, sdk_trx_id_adder: config.sdk_trx_id_adder});
        trx_id = data.trx_id;
    }

    let options = {
        url: core_pull_report_url,
        form: {
            trx_id: trx_id,
            rc: replaceRc(data.rc),
            rc_from_handler: data.rc_from_handler,
            message: typeof data.message === 'string' ? data.message : stringify(data.message),
            handler: config.handler_name,
            sn: data.sn,
            amount: data.amount,
            balance: data.balance,
            raw: data.raw,
            misc: data.misc,
            product: data.product || ( (data.misc && data.misc.task && typeof data.misc.task.product === 'string') ? data.misc.task.product : null ),
            remote_product: data.remote_product || ( (data.misc && data.misc.task && typeof data.misc.task.remote_product === 'string') ? data.misc.task.remote_product : null ),
            detail: data.detail || null,
        }
    }

    if (!config.do_not_verbose_log_report) {
        logger.verbose(`${MODULE_NAME} 2110168C: Report to CORE using HTTP POST`, { xid });
    }

    request.post(options, function(error, response) {
        if (error) {
            logger.warn(`${MODULE_NAME} B1CA595F: Error reporting to CORE`, { xid, error });
            resendReport(data);
        }
        else if (response.statusCode != 200) {
            logger.warn(`${MODULE_NAME} 4B73BD23: Error reporting to CORE, http response status is not 200`, {
                xid, requestOptions: options, http_response_status: response.statusCode,
            });
            resendReport(data);
        }
        else if (!config.do_not_verbose_log_report) {
            logger.verbose(`${MODULE_NAME} 379A25AA: Report has been sent to CORE`, { xid, requestOptions: options });
        }
    });
}

function resendReport(data) {
    const sleepBeforeResend = Math.round(Math.random() * MAX_SLEEP_BEFORE_RESEND_MS)
    logger.verbose(`${MODULE_NAME} DEE44715: Resend report to CORE in ${sleepBeforeResend} ms`);

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
    matrix.paused = false;
}

function initMatrix() {
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

if (!global.KOMODO_SDK_DISABLE_PULL) {
    setInterval(pullTask, config.pull_interval_ms || 1000);
    logger.verbose(`${MODULE_NAME} B6AEB920: Pull task every ${config.pull_interval_ms || 1000} ms`);
} else {
    logger.info(`${MODULE_NAME} DEC80C55: Pull task disabled because of global.KOMODO_SDK_DISABLE_PULL flag`);
}

exports.setPartner = setPartner;
exports.isPaused = isPaused;
exports.pause = pause;
exports.resume = resume;
exports.report = report;
exports.getRemoteProduct = getRemoteProduct;
