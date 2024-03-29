// eslint-disable-next-line global-require
const MODULE_NAME = `CONTROL_PANEL_${require('path').basename(__filename)}`;

const querystring = require('querystring');
const express = require('express');
const bodyParser = require('body-parser');
const logger = require('tektrans-logger');

const router = express.Router();

const config = require('../../config');

const requestToCore = require('./request-to-core');

function pageLogin(req, res) {
    if (req.session && req.session.username && req.session.terminal) {
        res.redirect('/');
        return;
    }

    res.render(
        `${req.app.locals.cp_views_dir}/login.html`,
        {
            ref: req.query.ref,
            msg: req.query.msg,
        },
    );
}

function pageLoginSubmitted(req, res) {
    const methodName = 'pageLoginSubmitted';

    if (!req || !req.body || !req.body.terminal_name || !req.body.password) {
        const qs = {
            msg: 'Nama terminal dan password harus diisi',
            ref: req.query.ref,
        };

        res.redirect(`/login?${querystring.stringify(qs)}`);
        return;
    }

    const qs = {
        terminal_name: req.body.terminal_name,
        web_password: req.body.password,
        request_by: config.handler_name || config.username || config.origin,
    };

    requestToCore.doRequestAndParse('/services/terminalAuthentication', qs, (err, coreResponse) => {
        if (err) {
            logger.warn('Error requesting authentication check to CORE', {
                module_name: MODULE_NAME,
                method_name: methodName,
                err,
            });
            res.end('SOMETHING WRONG');
            return;
        }

        const redirectQs = {
            terminal_name: req.body.terminal_name,
            ref: req.query.ref,
        };

        if (coreResponse.message) {
            redirectQs.msg = coreResponse.message;
        }

        if (coreResponse.error) {
            res.redirect(`/login?${querystring.stringify(redirectQs)}`);
            return;
        }

        if (!coreResponse.terminal) {
            redirectQs.msg = 'Terminal tidak terdefinisi';
            res.redirect(`/login?${querystring.stringify(redirectQs)}`);
            return;
        }

        if (!coreResponse.terminal.super || !coreResponse.terminal.store_is_super) {
            redirectQs.msg = 'Hanya super terminal pada super store yang dapat mengakses sistem.';
            res.redirect(`/login?${querystring.stringify(redirectQs)}`);
            return;
        }

        req.session.username = req.body.terminal_name;
        req.session.terminal = coreResponse.terminal;

        const redirectUrl = req.query.ref || '/';
        res.redirect(redirectUrl);
    });
}

function pageLogout(req, res) {
    req.session.username = null;
    req.session.terminal = null;

    res.redirect('/login');
}

router.get('/', pageLogin);
router.post('/', bodyParser.urlencoded({ extended: true }), pageLoginSubmitted);
router.get('/out', pageLogout);

module.exports = router;
