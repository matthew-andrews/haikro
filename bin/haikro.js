#!/usr/bin/env node
'use strict';

require('es6-promise').polyfill();
var argv = require('minimist')(process.argv.slice(2));
var logger = require('../lib/logger');
var promise = Promise.resolve();

if (argv.verbose) {
	logger.setLevel('debug');
}
if (argv.silent) {
	logger.setLevel('silent');
}

if (argv._.indexOf('build') !== -1) {
	logger.verbose("will build");
	var build = require('../lib/build');
	promise = promise.then(function() {
		return build(argv.project);
	});
}

var denodeify = require('denodeify');
var exec = denodeify(require('child_process').exec);

function getHerokuAuthToken() {
	var token = argv.token;
	if (token) return token;
	logger.verbose("token argument not passed, using heroku cli instead");
	return exec("(echo -n \":\" ; heroku auth:token) | base64");
}

if (argv._.indexOf('deploy') !== -1) {
	logger.verbose("will deploy");
	var deploy = require('../lib/deploy');
	promise = getHerokuAuthToken()
		.then(function(token) {
			return deploy({
				app: argv.app,
				commit: argv.commit,
				project: argv.project || process.cwd(),
				token: token
			});
		});
}

promise.then(function() {
	logger.verbose("haikro out");
}, function(err) {
	logger.error(err.message);
});
