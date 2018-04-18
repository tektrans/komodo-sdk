"use strict";

var LRU = require('lru-cache');

const config = require('./config');
const logger = require('./logger');

var topupRequest;
const resendHandlers = LRU({max: 2000, maxAge: 1000 * 3600 * 36});

function init(options) {
    if (options && options.request) {
        request = options.request;
    } else {
        logger.warn('Undefined options.request, terminating....');
        process.exit(1);
    }
}

function cancel(task) {
    const requestId = ( typeof task === 'string' ) ? task : task.requestId;
    if (!requestId) { return; }

    const oldHandler = resendHandlers.get(requestId);
    if (!oldHandler) { return; }

    logger.verbose('Canceling resend delay', {task: oldHandler.task});
    if (oldHandler.handler) { clearTimeout(oldHandler.handler); }
    resendHandlers.del(requestId);
}

function register(task) {
    if (!task.requestId) {
        logger.warn('Invalid task on resendDelay')
        return;
    }

    if (!config || !config.auto_resend || !Number(config.auto_resend.delay_ms) || !Number(config.auto_resend.max_retry)) {
        return;
    }

    var retry = config.auto_resend.max_retry;
    var oldHandler = resendHandlers.get(task.requestId);
    if (oldHandler) {
        retry = oldHandler.retry - 1;
        cancel(task);
    }

    if (retry <= 0) {
        logger.verbose('Resend delay retry exceeded', {task: task});
        cancel(task);
        return;
    }

    logger.verbose('Registering resend delay task request', {task: task, delay_ms: config.auto_resend.delay_ms, retry: retry});
    var handlerData = {
        handler: setTimeout(request, config.auto_resend.delay_ms, task),
        task: task,
        retry: retry
    }

    resendHandlers.set(task.requestId, handlerData);
}

exports.init = init;
exports.cancel = cancel;
exports.register = register;
