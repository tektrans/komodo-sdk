"use strict";

var LRU = require('lru-cache');

const config = require('./config');
const logger = require('./logger');

const resendHandlers = LRU({max: 5000, maxAge: 1000 * 3600 * 36});

function cancel(task) {
    const trx_id = ( typeof task === 'string' ) ? task : task.trx_id;
    if (!trx_id) { return; }

    const oldHandler = resendHandlers.get(trx_id);
    if (!oldHandler) { return; }

    const task = oldHandler.task;
    logger.verbose('Canceling resend delay', {trx_id: task.trx_id, destination: task.destination, product: task.product, remote_product: task.remote_product});

    if (oldHandler.handler) { clearTimeout(oldHandler.handler); }
    resendHandlers.del(trx_id);
}

function register(task, request) {
    if (!task.trx_id) {
        logger.warn('Invalid task on resendDelay')
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
        logger.verbose('Resend delay retry exceeded', {trx_id: task.trx_id, destination: task.destination, product: task.product, remote_product: task.remote_product});
        cancel(task);
        return;
    }

    logger.verbose('Registering resend delay task request', {trx_id: task.trx_id, destination: task.destination, product: task.product, remote_product: task.remote_product, delay_ms: config.auto_resend.delay_ms, retry: retry});
    const handlerData = {
        handler: setTimeout(request, config.auto_resend.delay_ms, task),
        task: task,
        retry: retry
    }

    resendHandlers.set(task.trx_id, handlerData);
}

exports.cancel = cancel;
exports.register = register;
