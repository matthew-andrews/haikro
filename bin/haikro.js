#!/usr/bin/env node
'use strict';
require('es6-promise').polyfill();
require('isomorphic-fetch');

var argv = require('minimist')(process.argv.slice(2));
var promise = Promise.resolve();
var getProcessesProfiles = require('../lib/get-processes-profiles');

if (argv._.indexOf('build') !== -1) {
	console.log("will build");
	var build = require('../lib/build');
	promise = promise.then(function() {
		return build({
			project: argv.project,
			strict: argv.strict
		});
	});
}

if (argv._.indexOf('deploy') !== -1) {
	if (argv.token) {
		console.log("--token is deprecated, use --heroku-token");
		argv['heroku-token'] = argv.token;
	}
	console.log("will deploy");
	var deploy = require('../lib/deploy');
	promise = promise.then(function() {
		return deploy({
			app: argv.app,
			commit: argv.commit,
			project: argv.project || process.cwd(),
			token: argv['heroku-token'],
			useLegacyToken: !!argv.token
		});
	});
}

promise.then(function() {
	console.log("haikro out");
}, function(err) {
	logger.error(err.stack);
	process.exit(1);
});
