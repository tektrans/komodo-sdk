const express = require('express');
// const sortObj = require('sort-object');
const naturalCompare = require('string-natural-compare');

const config = require('../config');
const matrix = require('../matrix');

const router = express.Router();
module.exports = router;

const splitProductSeparator = / *[;,]+ */;

function pageIndex(req, res) {
    res.json({
        method: '/products',
        error: null,
        result: config.remote_products,
    });
}

function pageSet(req, res) {
    function responseWithUsageHelp() {
        res.json({
            method: '/remote-products/set',
            error: true,
            error_msg: 'Usage: /remote-products/set/<LOCAL_PRODUCT>/<REMOTE_PRODUCT>',
        });
    }

    if (!req.params.localProduct && !req.query.local) {
        responseWithUsageHelp();
        return;
    }

    if (!req.params.remoteProduct && !req.query.remote) {
        responseWithUsageHelp();
        return;
    }

    const localProduct = (req.params.localProduct || req.query.local).trim().toUpperCase();
    const remoteProduct = (req.params.remoteProduct || req.query.remote).trim();

    config.remote_products[localProduct] = remoteProduct;

    /*
    config.remote_products = sortObj(config.remote_products, {
        sort: naturalCompare.caseInsensitive
    });
    */

    const sortedRemoteProducts = {};
    const remoteProductsKeys = Object.keys(
        config.remote_products,
    ).sort(naturalCompare.caseInsensitive);

    remoteProductsKeys.forEach((item) => {
        sortedRemoteProducts[item] = config.remote_products[item];
    });
    config.remote_products = sortedRemoteProducts;

    matrix.config_is_dirty = true;

    res.json({
        method: '/remote-products/set',
        error: null,
        local_product: localProduct,
        remote_product: remoteProduct,
        remote_products: config.remote_products,
    });
}

function pageDel(req, res) {
    function responseWithUsageHelp() {
        res.json({
            method: '/remote-products/del',
            error: true,
            error_msg: 'Usage: /remote-products/del/<LOCAL_PRODUCT>',
        });
    }

    let localProducts = req.params.localProduct || req.query.local;
    if (!localProducts) {
        responseWithUsageHelp();
        return;
    }

    if (typeof localProducts === 'string') {
        localProducts = localProducts.split(splitProductSeparator);
    }

    const localProductsCount = localProducts.length;
    for (let i = 0; i < localProductsCount; i += 1) {
        const localProduct = localProducts[i];

        if (localProduct) {
            delete config.remote_products[localProduct];
            matrix.config_is_dirty = true;
        }
    }

    res.json({
        method: '/remote-products/del',
        error: null,
        deleted_product: localProducts,
        remote_products: config.remote_products,
    });
}

router.get('/', pageIndex);
router.get('/set/:localProduct/:remoteProduct', pageSet);
router.get('/set', pageSet);
router.get('/del/:localProduct', pageDel);
router.get('/del', pageDel);
