#!/usr/bin/env node

require('es6-promise').polyfill();
var argv = require('minimist')(process.argv.slice(2));

var promise = Promise.resolve();

if (argv._.indexOf('build') !== -1) {
	var build = require('../lib/build');
	promise = promise.then(function() {
		return build(argv.project);
	});
}

if (argv._.indexOf('deploy') !== -1) {
	var deploy = require('../lib/deploy');
	promise = promise.then(function() {
		return deploy({
			app: argv.app,
			entry: argv.entry || 'app.js',
			commit: argv.commit,
			project: argv.project || process.cwd(),
			token: argv.token || process.env.HEROKU_AUTH_TOKEN
		});
	});
}
