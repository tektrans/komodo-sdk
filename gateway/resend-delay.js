"use strict";

const LRU = require('lru-cache');
const moment = require('moment');

const config = require('./config');
const logger = require('./logger');

const resendHandlers = LRU({
    max: (( config && config.auto_resend && config.auto_resend.max_handler ) ? Number(config.auto_resend.max_handler) : 0) || 5000,
    maxAge: 1000 * 3600 * 24
});

function isEnabled() {
    return config && config.auto_resend && Number(config.auto_resend.delay_ms) && Number(config.auto_resend.max_retry);
}

function _resend(task, request) {
    const trx_date = moment(task.created).format('YYYYMMDD');
    if (trx_date !== moment().format('YYYYMMDD')) {
        logger.info('RESEND-DELAY: skip resend because of different trx date', {trx_id: task.trx_id, destination: task.destination, product: task.product, remote_product: task.remote_product, created: task.created});
        return;
    }

    logger.verbose('RESEND-DELAY: Resending trx', {trx_id: task.trx_id, destination: task.destination, product: task.product, remote_product: task.remote_product, created: task.created});
    request(task);
}

function cancel(_task) {
    const trx_id = ( typeof _task === 'string' ) ? _task : _task.trx_id;
    if (!trx_id) { return; }

    const oldHandler = resendHandlers.get(trx_id);
    if (!oldHandler) { return; }

    const task = oldHandler.task;
    logger.verbose('RESEND-DELAY: Canceling task', {trx_id: task.trx_id, destination: task.destination, product: task.product, remote_product: task.remote_product});

    if (oldHandler.handler) { clearTimeout(oldHandler.handler); }
    resendHandlers.del(trx_id);
}

function register(task, request) {
    if (!task.trx_id) {
        logger.warn('RESEND-DELAY: Invalid task on register')
        return;
    }

    if (!request || !config || !config.auto_resend || !Number(config.auto_resend.delay_ms) || !Number(config.auto_resend.max_retry)) {
        return;
    }

    let retry = config.auto_resend.max_retry;
    const oldHandler = resendHandlers.get(task.trx_id);
    if (oldHandler) {
        retry = oldHandler.retry - 1;
        cancel(task);
    }

    if (retry <= 0) {
        logger.verbose('RESEND-DELAY: Retry exceeded', {trx_id: task.trx_id, destination: task.destination, product: task.product, remote_product: task.remote_product});
        cancel(task);
        return;
    }

    logger.verbose('RESEND-DELAY: Registering task request', {trx_id: task.trx_id, destination: task.destination, product: task.product, remote_product: task.remote_product, delay_ms: config.auto_resend.delay_ms, retry: retry});
    const handlerData = {
        handler: setTimeout(
            function() { _resend(task, request); },
            config.auto_resend.delay_ms
        ),
        task: task,
        retry: retry
    }

    resendHandlers.set(task.trx_id, handlerData);
}

setInterval(
    function() {
        resendHandlers.prune();
        logger.verbose('RESEND-DELAY: pruned');
    },
    24 * 3600 * 1000
)

exports.cancel = cancel;
exports.register = register;
exports.isEnabled = isEnabled;
