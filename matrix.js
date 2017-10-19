"use strict";

const simpleGit = require('simple-git');

const matrix = {};

// get active git version
simpleGit(process.cwd()).raw(
    ['describe'],
    function(err, result) {
        if (!err) {
            matrix.version_active = result;
        }
    }
)

module.exports = matrix;
