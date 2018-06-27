"use strict";

const express = require('express');
const sortObj = require('sort-object');
const naturalCompare = require('string-natural-compare');

const config = require('../config');
const logger = require('../logger');
const matrix = require('../matrix');

const router = express.Router();
module.exports = router;

function pageIndex(req, res, next) {
    res.json({
        method: '/products',
        error: null,
        result: config.remote_products
    });
}

function pageSet(req, res, next) {
    if (!req.params.localProduct || !req.params.localProduct.trim() || !req.params.remoteProduct || !req.params.remoteProduct.trim()) {
        res.json({
            method: '/remote-products/set',
            error: true,
            error_msg: 'Usage: /remote-products/set/<LOCAL_PRODUCT>/<REMOTE_PRODUCT>'
        });

        return;
    }

    const localProduct = req.params.localProduct.trim().toUpperCase();
    const remoteProduct = req.params.remoteProduct.trim();

    config.remote_products[localProduct] = remoteProduct;
    sortObj(config.remote_products, {
        sort: naturalCompare.caseInsensitive
    });
    matrix.config_is_dirty = true;

    res.json({
        method: '/remote-products/set',
        error: null,
        local_product: localProduct,
        remote_product: remoteProduct,
        remote_products: config.remote_products
    })
}

router.get('/', pageIndex);
router.get('/set/:localProduct/:remoteProduct', pageSet);
