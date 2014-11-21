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

if (argv._.indexOf('release') !== -1) {
	logger.verbose("will release");
	var release = require('../lib/release');
	promise = promise.then(function() {
		return release({
			project: argv.project,
			token: argv['github-token'],
			repository: argv.repository,
			tag: argv.tag
		});
	});
}

if (argv._.indexOf('deploy') !== -1) {
	if (argv.token) {
		logger.warn("--token is deprecated, use --heroku-token");
		argv['heroku-token'] = argv.token;
	}
	logger.verbose("will deploy");
	var deploy = require('../lib/deploy');
	promise = promise.then(function() {
		return deploy({
			app: argv.app,
			commit: argv.commit,
			project: argv.project || process.cwd(),
			token: argv['heroku-token']
		});
	});
}

promise.then(function() {
	logger.verbose("haikro out");
}, function(err) {
	logger.error(err.message);
});
