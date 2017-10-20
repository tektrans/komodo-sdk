"use strict";

const querystring = require('querystring');

function needAuthUser(req, res, next) {
    if (!req || !req.session || !req.session.username) {
        const qs = {
            msg: 'Anda diharuskan login sebagai super terminal dari super password untuk mengakses halaman yang diminta.',
            ref: req.referer
        };

        res.redirect('/login?' + querystring.stringify(qs));
        return;
    }

    next();
}

exports.needAuthUser = needAuthUser;
