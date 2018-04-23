const express = require('express');
const bodyParser = require('body-parser');

const matrix = require('../matrix');

const router = express.Router();
module.exports = router;

function getJsonMatrix(req, res, next) {
    res.json(matrix);
}

router.get('/', getJsonMatrix);
