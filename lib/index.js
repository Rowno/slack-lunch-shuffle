'use strict';
var Url = require('url');

var DOMAIN = 'localhost';


exports.addDomain = function (url) {
    var parsedUrl = Url.parse(url);
    parsedUrl.host = null;
    parsedUrl.hostname = DOMAIN;

    return Url.format(parsedUrl);
};
