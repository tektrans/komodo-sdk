const MODULE_NAME = 'KOMODO-SDK.API-SERVER.REQUEST-LOGGER';

const logger = require('logger');

module.exports = (req, res, next) => {
    const { xid } = res.locals;

    logger.verbose(`${MODULE_NAME} 06A6440A: Got a request`, {
        xid,
        reqIp: req.ip,
        method: req.method,
        url: req.url,
        path: req.path,
        qs: req.query,
        body: req.body,
    });

    next();
};
