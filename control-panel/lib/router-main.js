const os = require('os');

const express = require('express');
const router = express.Router();

const numeral = require('numeral');

const logger = require('tektrans-logger');
const matrix = require('komodo-sdk/matrix');

const misc = require('./misc');

function pageMain(req, res) {
    res.redirect('/runtime');
}

function pageLog(req, res) {
    logger.query({json: true, order: 'desc'}, function(err) {
        if (err) {
            return res.end('INVALID LOGGER');
        }

        res.render(
            req.app.locals.cp_views_dir + '/log.html',
            {
                // log: JSON.stringify(results.logs, null, 4)
                log: '[]'
            }
        );

    });
}
function pageRuntime(req, res) {

    res.render(
        req.app.locals.cp_views_dir + '/runtime.html',
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
        }
    )
}

function pageTerminate(req, res) {
    res.end('Terminating....', function() {
        process.exit(0);
    });
}

//router.use(misc.needAuthUser);

router.get('/', pageMain);
router.get('/runtime', misc.needAuthUser, pageRuntime);
router.get('/log', misc.needAuthUser, pageLog);
router.get('/terminate', misc.needAuthUser, pageTerminate);
router.get('/restart', misc.needAuthUser, pageTerminate);

module.exports = router;
