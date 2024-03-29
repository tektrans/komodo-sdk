const express = require('express');
const naturalSort = require('node-natural-sort');
const unique = require('array-unique');

const config = require('../config');
const matrix = require('../matrix');

const router = express.Router();
module.exports = router;

function pageIndex(req, res) {
    res.json({
        method: '/locations',
        error: null,
        result: config.locations,
    });
}

function pageAdd(req, res) {
    let locations = req.params.locations || req.query.locations;

    if (!locations) {
        res.json({
            method: '/locations/add',
            error: true,
            error_msg: 'Usage: /locations/add/<NEW_LOCATION>',
        });

        return;
    }

    if (typeof locations === 'string') {
        locations = locations
            .trim()
            .split(/[\s,]+/)
            .filter((loc) => typeof loc === 'string')
            .map((loc) => loc.trim().toUpperCase())
            .filter((loc) => loc && (loc !== 'ALL'));
    }

    const locationsCount = locations.length;
    for (let i = 0; i < locationsCount; i += 1) {
        const location = locations[i];

        if (!config.locations) config.locations = [];
        config.locations.push(location);
    }

    // config.locations.map((x) => x.toUpperCase());

    unique(config.locations);
    config.locations.sort(naturalSort());
    matrix.config_is_dirty = true;

    res.json({
        method: '/locations/add',
        error: null,
        new_location: locations,
        locations: config.locations,
    });
}

function pageDel(req, res) {
    let locations = req.params.locations || req.query.locations;
    if (!locations) {
        res.json({
            method: '/locations/del',
            error: true,
            error_msg: 'Usage: /locations/del/<LOCATION_TO_DELETE> or /locations/del?locations=<LOCATION_TO_DELETE>',
        });

        return;
    }

    if (typeof locations === 'string') {
        locations = locations.trim().split(/[\s,]+/);
    }

    // config.locations.map((x) => x.toUpperCase());
    const locationsCount = locations.length;

    for (let i = 0; i < locationsCount; i += 1) {
        const location = locations[i].toUpperCase();
        const idx = config.locations.indexOf(location);
        if (idx >= 0) {
            matrix.config_is_dirty = true;
            config.locations.splice(idx, 1);
        }
    }

    res.json({
        method: '/locations/del',
        error: null,
        locations_to_delete: locations,
        locations: config.locations,
    });
}

router.get('/', pageIndex);
router.get('/add/:locations', pageAdd);
router.get('/add', pageAdd);

router.get('/del/:locations', pageDel);
router.get('/delete/:locations', pageDel);
router.get('/remove/:locations', pageDel);
router.get('/del', pageDel);
router.get('/delete', pageDel);
router.get('/remove', pageDel);
