"use strict";

const express = require('express');
const naturalSort = require('node-natural-sort');
const unique = require('array-unique');

const config = require('../config');
const logger = require('../logger');
const matrix = require('../matrix');

const router = express.Router();
module.exports = router;

function pageIndex(req, res, next) {
    res.json({
        method: '/products',
        error: null,
        result: config.products
    });
}

function pageAdd(req, res, next) {
    let products = req.params.product || req.query.product

    if (!products) {
        res.json({
            method: '/products/add',
            error: true,
            error_msg: 'Usage: /products/add/<NEW_PRODUCT>'
        });

        return;
    }

    if (typeof products === 'string') {
        products = products.trim().split(/[\s,]+/);
    }

    const productsCount = products.length;
    for (let i=0; i<productsCount; i++) {
        const product = products[i];
        if (!product.trim()) {
            continue;
        }

        config.products.push(product.trim().toUpperCase());
    }

    config.products.map(function(x) { return x.toUpperCase(); });
    unique(config.products);
    config.products.sort(naturalSort());
    matrix.config_is_dirty = true;

    res.json({
        method: '/products/add',
        error: null,
        new_product: products,
        products: config.products
    })
}

function pageDel(req, res, next) {
    let products = req.params.product || req.query.product
    if (!products) {
        res.json({
            method: '/products/del',
            error: true,
            error_msg: 'Usage: /products/del/<PRODUCT_TO_DELETE> or /products/del?product=<PRODUCT_TO_DELETE>'
        });

        return;
    }

    if (typeof products === 'string') {
        products = products.trim().split(/[\s,]+/);
    }

    config.products.map(function(x) { return x.toUpperCase(); });
    const productsCount = products.length;
    for (let i=0; i<productsCount; i++) {
        const product = products[i].toUpperCase();
        const idx = config.products.indexOf(product);
        if (idx >= 0) {
            matrix.config_is_dirty = true;
            config.products.splice(idx, 1)
        }
    }

    res.json({
        method: '/products/del',
        error: null,
        product_to_delete: products,
        products: config.products
    })
}

router.get('/', pageIndex);
router.get('/add/:product', pageAdd);
router.get('/add', pageAdd);

router.get('/del/:product', pageDel);
router.get('/delete/:product', pageDel);
router.get('/remove/:product', pageDel);
router.get('/del', pageDel);
router.get('/delete', pageDel);
router.get('/remove', pageDel);
