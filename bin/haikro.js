#!/usr/bin/env node
'use strict';
GLOBAL.fetch = require('node-fetch');

var program = require('commander');

var build = require('../lib/build');
var deploy = require('../lib/deploy');

program
	.command('build')
	.description('packages an app ready to be put onto Heroku')
	.option('--project [project]', 'directory to package up')
	.option('--strict', 'be strict about which runtimes haikro can run in')
	.action(function(opts) {
		console.log("will build");
		build({
			project: opts.project,
			strict: opts.strict
		})
			.then(succeed)
			.catch(error);
	});

program
	.command('deploy')
	.description('uploads and releases app to heroku')
	.option('--app [app]', 'name of application on Heroku')
	.option('--commit [commit]', 'commit hash to show next to release')
	.option('--project [project]', 'directory to look for haikro tarball')
	.action(function(opts) {
		console.log('will deploy ' + opts.app);
		deploy({
			app: opts.app,
			commit: opts.commit,
			project: opts.project
		})
			.then(succeed)
			.catch(error);
	});

function error(err) {
	console.log(err.stack);
	process.exit(1);
}

function succeed() {
	console.log('haikro out');
}

program.parse(process.argv);
