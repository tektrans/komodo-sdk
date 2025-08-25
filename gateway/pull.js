/* eslint-disable no-param-reassign */
const MODULE_NAME = 'KOMODO-SDK.PULL';

const DEFAULT_REQUEST_TIMEOUT_MS = 20 * 1000;
const IS_DEBUG = process.env.KOMODO_SDK_DEBUG_PULL;

const { default: axios } = require('axios');
const stringify = require('json-stringify-pretty-compact');
const logger = require('tektrans-logger');
const urljoin = require('url-join');
const uniqid = require('uniqid');

const config = require('../config');
const matrix = require('../matrix');

if (config.control_panel && (config.control_panel.listen_port || config.control_panel.port)) {
    // eslint-disable-next-line global-require
    require('../control-panel');
}

const heartbeat = require('../heartbeat');
const coreUrl = require('../core-url');

const taskArchive = require('./task-archive');

const MAX_SLEEP_BEFORE_RESEND_MS = 500;
const DELAY_AFTER_NO_TASK_MS = 500;

let isOnDelayAfterNoTask = false;
let pullTaskLocked = false;

if (config.handler_name) {
    process.title = `KOMODO-GW@${config.handler_name}`;
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

let partner;

function onNoTask() {
    isOnDelayAfterNoTask = true;
    setTimeout(() => {
        isOnDelayAfterNoTask = false;
    }, DELAY_AFTER_NO_TASK_MS);
}

function setPartner(_partner) {
    partner = _partner;
}

function isPaused() {
    return matrix.paused;
}

function getRemoteProduct(product) {
    const remoteProduct = config.remote_products[product];
    return remoteProduct || product;
}

function incrementCounterTrx() {
    matrix.counter.trx += 1;
}

function updateTaskOnMatrix(trxId, rc) {
    trxId = Number(trxId);

    const unresponsedTaskIdx = matrix.sdk_unresponsed_tasks.indexOf(trxId);
    if (unresponsedTaskIdx >= 0) {
        matrix.sdk_unresponsed_tasks.splice(unresponsedTaskIdx, 1);
    }
    matrix.sdk_unresponsed_tasks_count = matrix.sdk_unresponsed_tasks.length;

    if (rc === '68' || rc === 68) {
        const pendingWithResponseTaskIdx = matrix.sdk_pending_with_response_tasks.indexOf(trxId);
        if (pendingWithResponseTaskIdx < 0) {
            matrix.sdk_pending_with_response_tasks.push(trxId);
            // eslint-disable-next-line max-len
            matrix.sdk_pending_with_response_tasks_count = matrix.sdk_pending_with_response_tasks.length;
        }
    } else {
        const pendingTaskIdx = matrix.sdk_pending_tasks.indexOf(trxId);
        if (pendingTaskIdx >= 0) {
            matrix.sdk_pending_tasks.splice(pendingTaskIdx, 1);
            matrix.sdk_pending_tasks_count = matrix.sdk_pending_tasks.length;
        }

        const pendingWithResponseTaskIdx = matrix.sdk_pending_with_response_tasks.indexOf(trxId);
        if (pendingWithResponseTaskIdx >= 0) {
            matrix.sdk_pending_with_response_tasks.splice(pendingWithResponseTaskIdx, 1);
            // eslint-disable-next-line max-len
            matrix.sdk_pending_with_response_tasks_count = matrix.sdk_pending_with_response_tasks.length;
        }
    }
}

function putTaskToMatrix(task) {
    const trxId = Number(task.trx_id);

    if (matrix.sdk_unresponsed_tasks.indexOf(trxId) < 0) {
        matrix.sdk_unresponsed_tasks.push(trxId);
        matrix.sdk_unresponsed_tasks_count = matrix.sdk_unresponsed_tasks.length;
    }

    if (matrix.sdk_pending_tasks.indexOf(trxId) < 0) {
        matrix.sdk_pending_tasks.push(trxId);
        matrix.sdk_pending_tasks_count = matrix.sdk_pending_tasks.length;
    }
}

function replaceRc(originalRc) {
    if (!config || !config.replace_rc) {
        return originalRc;
    }

    return config.replace_rc[originalRc] || originalRc;
}

const report = async (data, xidFromCaller) => {
    const xid = xidFromCaller || uniqid();

    let corePullReportUrl;

    if (data && data.trx_id && data.rc) {
        updateTaskOnMatrix(data.trx_id, data.rc);
    }

    if (coreUrl) {
        corePullReportUrl = urljoin(coreUrl, '/pull/report');
    } else if (config && config.pull_url && config.pull_url.report) {
        corePullReportUrl = config.pull_url.report.replace('<CORE_APIKEY>', config.core_apikey);
    }

    if (!corePullReportUrl) {
        logger.warn(`${MODULE_NAME} C23CC601: Unknown CORE report url`);
        return;
    }

    if (
        config && config.push_server && config.push_server.apikey
        && config.push_server.advice && config.push_server.advice.url
        && config.push_server.advice.port
    ) {
        if (!data.misc) {
            data.misc = {};
        }

        data.misc.advice_url = config.push_server.advice.url;
    }

    const sdkTrxIdAdder = Number(config.sdk_trx_id_adder) || 0;
    let trxId = Number(data.trx_id) - sdkTrxIdAdder;

    if (sdkTrxIdAdder) {
        logger.verbose(`${MODULE_NAME} 3E0016E8: REPORT: Adjusting trx id`, {
            xid,
            sdkTrxIdAdder,
            trxId: data.trx_id,
            adjustedTrxId: trxId,
        });
    }

    if (trxId <= 0) {
        logger.warn(`${MODULE_NAME} 6A8C7303: REPORT: calculated trx_id is a negative number, using uncalculated trx_id`, {
            xid,
            uncalculated: data.trx_id,
            calculated: trxId,
            sdkTrxIdAdder,
        });
        trxId = data.trx_id;
    }

    const params = new URLSearchParams({
        trx_id: trxId,
        rc: replaceRc(data.rc),
        rc_from_handler: data.rc_from_handler,
        message: typeof data.message === 'string' ? data.message : stringify(data.message),
        handler: config.handler_name,
        sn: data.sn,
        amount: data.amount,
        balance: data.balance,
        raw: data.raw,
        misc: data.misc,
        product: data.product
            || (data.misc && data.misc.task && typeof data.misc.task.product === 'string' && data.misc.task.product)
            || null,
        remote_product: data.remote_product
            || (data.misc && data.misc.task && typeof data.misc.task.remote_product === 'string' && data.misc.task.remote_product)
            || null,
        detail: data.detail || null,
    });

    logger.verbose(`${MODULE_NAME} 2110168C: Sending report to CORE`, {
        xid,
        corePullReportUrl,
    });

    try {
        await axios.post(corePullReportUrl, params);
    } catch (e) {
        logger.warn(`${MODULE_NAME} D2877DF6: Exception on sending report to CORE`, {
            xid,
            eCode: e.code,
            eMessage: e.message || e.toString(),
            httpStatus: e.response && e.response.status,
            responseBody: e.response && e.response.data,
        });

        const sleepBeforeResend = Math.round(Math.random() * MAX_SLEEP_BEFORE_RESEND_MS);
        setTimeout(() => {
            report(data, xidFromCaller);
        }, sleepBeforeResend);
    }
};

function forwardCoreTaskToPartner(coreMessage, startTime, xid) {
    let task;

    try {
        task = JSON.parse(coreMessage);
    } catch (e) {
        logger.warn(`${MODULE_NAME} E757F11A: Exception on parsing CORE pull task response`, {
            xid, coreMessage, eCode: e.code, eMessage: e.message,
        });
        return;
    }

    if (config.sdk_pull_only_postpaid) {
        logger.warn(`${MODULE_NAME} E6662C4F: Got task on sdk_pull_only_postpaid. It should not be happens`, { xid, task });
        report({
            trx_id: task.trx_id,
            rc: '40',
            message: {
                xid,
                msg: 'GATEWAY ini diset hanya untuk transaksi postpaid (config.sdk_pull_only_postpaid)',
            },
        });
        return;
    }

    const corePullRequestTime = startTime ? (new Date() - startTime) / 1000 : null;

    incrementCounterTrx();

    task.remote_product = getRemoteProduct(task.product);
    const sdkTrxIdAdder = Number(config.sdk_trx_id_adder);
    if (sdkTrxIdAdder) {
        const newTrxId = Number(task.trx_id) + sdkTrxIdAdder;
        logger.verbose(`${MODULE_NAME} 873BA19B: Adjusting trx id`, {
            xid,
            sdkTrxIdAdder,
            originalTrxId: task.trx_id,
            newTrxId,
        });

        task.trx_id = newTrxId;
    }

    putTaskToMatrix(task);

    const createdTs = new Date(task.created);
    const queueTime = ((new Date()) - createdTs) / 1000;
    logger.info(`${MODULE_NAME} 7F131334: Got task from CORE`, {
        xid,
        trx_id: task.trx_id,
        destination: task.destination,
        product: task.product,
        queue_time: queueTime,
        core_pull_request_time: corePullRequestTime,
    });

    taskArchive.get(task, (res) => {
        if (res && partner.advice) {
            partner.advice(task, xid);
        } else {
            partner.buy(task, xid);
        }
    });
}

const pullTask = async () => {
    if (isPaused()) {
        if (IS_DEBUG) {
            logger.verbose(`${MODULE_NAME} 76370FE5: PULL TASK paused`);
        }
        return;
    }

    if (isOnDelayAfterNoTask && !config.disable_delay_after_no_task) {
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
            logger.verbose(`${MODULE_NAME} 68BDA23B: PULL TASK paused because of gateway is not ready`);
        }
        return;
    }

    let corePullTaskUrl;

    if (coreUrl) {
        corePullTaskUrl = urljoin(coreUrl, '/pull/task');
    } else if (config && config.pull_url && config.pull_url.task) {
        corePullTaskUrl = config.pull_url.task.replace('<CORE_APIKEY>', config.core_apikey);
    }

    if (!corePullTaskUrl) {
        logger.warn(`${MODULE_NAME} 5F0681B7: Unknown CORE task url`);
        return;
    }

    if (pullTaskLocked) {
        if (IS_DEBUG) {
            logger.verbose(`${MODULE_NAME} B81F0CCD: PULL TASK paused because LOCKED`);
        }
        return;
    }
    pullTaskLocked = true;

    const xid = uniqid();

    const params = new URLSearchParams({
        handler: config.handler_name,
        products: (config.products || []).join(','),
        locations: config.locations && config.locations.length ? config.locations.join(',') : 'ALL',
        advice_url: (
            config && config.push_server
            && config.push_server.apikey && config.push_server.advice
            && config.push_server.advice.url && config.push_server.advice.port
            && config.push_server.advice.url
        ) || null,
        api_url: (
            config && config.apiserver
            && config.apiserver.apikey && config.apiserver.url && config.apiserver.url
        ) || null,
        cp_url: (
            config && config.control_panel && config.control_panel.url && config.control_panel.url
        ) || null,
        komodosdk_type: matrix.komodosdk_type,
        komodosdk_version: matrix.komodosdk_version,
    });

    const startTime = new Date();
    try {
        const response = await axios.post(corePullTaskUrl, params, {
            timeout: DEFAULT_REQUEST_TIMEOUT_MS,
        });

        if (!matrix.core_is_healthy) {
            logger.verbose(`${MODULE_NAME} 099F5B3C: CORE is healthy`, { xid });
            matrix.core_is_healthy = true;
        }

        const body = response && response.data;

        if (!body) {
            onNoTask();
            return;
        }

        if (body === 'NONE') {
            onNoTask();
            return;
        }

        if (body === 'LOCKED') {
            return;
        }

        forwardCoreTaskToPartner(body, startTime, xid);
    } catch (e) {
        if (matrix.core_is_healthy) {
            logger.warn(`${MODULE_NAME} FB762F4A: Error pulling task from CORE`, {
                xid,
                eCode: e.code,
                eMessage: e.message || e.toString(),
                httpStatus: e.response && e.response.status,
                responseBody: e.response && e.response.data,
            });
        }

        matrix.core_is_healthy = false;
        onNoTask();
    } finally {
        pullTaskLocked = false;
    }
};

function pause() {
    matrix.paused = true;
}

function resume() {
    matrix.paused = false;
}

function initMatrix() {
    matrix.counter = {
        trx: 0,
    };
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
