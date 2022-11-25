const os = require('os');

const express = require('express');
const numeral = require('numeral');

const logger = require('tektrans-logger');
const matrix = require('../../matrix');

const misc = require('./misc');

const router = express.Router();

function pageMain(req, res) {
    res.redirect('/runtime');
}

function pageLog(req, res) {
    logger.query({ json: true, order: 'desc' }, (err) => {
        if (err) {
            res.end('INVALID LOGGER');
            return;
        }

        res.render(
            `${req.app.locals.cp_views_dir}/log.html`,
            {
                // log: JSON.stringify(results.logs, null, 4)
                log: '[]',
            },
        );
    });
}

function pageRuntime(req, res) {
    res.render(
        `${req.app.locals.cp_views_dir}/runtime.html`,
        {
            uptime: numeral(process.uptime()).format(),
            matrix: JSON.stringify(matrix, null, 4),
            memory_usage: JSON.stringify(process.memoryUsage(), null, 4),
            os_info: JSON.stringify({
                uptime: os.uptime(),
                loadavg: os.loadavg(),
                hostname: os.hostname(),
                type: os.type(),
                platform: os.platform(),
                arch: os.arch(),
                release: os.release(),
                totalmem: os.totalmem(),
            }, null, 4),
        },
    );
}

function pageTerminate(req, res) {
    res.end('Terminating....', () => {
        process.exit(0);
    });
}

router.get('/', pageMain);
router.get('/runtime', misc.needAuthUser, pageRuntime);
router.get('/log', misc.needAuthUser, pageLog);
router.get('/terminate', misc.needAuthUser, pageTerminate);
router.get('/restart', misc.needAuthUser, pageTerminate);

module.exports = router;
