"use strict";

function extractFromMessage(msg, default_pattern, default_match_idx, custom_rule) {
    if (!msg || typeof msg !== 'string') {
        return;
    }

    let pattern;
    let match_idx;

    if (custom_rule && custom_rule.pattern) {
        pattern = custom_rule.pattern;
        match_idx = custom_rule.match_idx;
    }
    else {
        pattern = default_pattern;
        match_idx = default_match_idx;
    }

    const re = new RegExp(pattern);
    const matches = msg.match(re);

    if (!matches) return;

    if (match_idx < matches.length) {
        return matches[match_idx] || null;
    } else {
        return;
    }
}

module.exports = extractFromMessage;
