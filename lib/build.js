'use strict';
var logger = require('./logger');
var denodeify = require('denodeify');
var exec = denodeify(require('child_process').exec, function(err, stdout, stderr) { return [err, stdout]; });
var exists = denodeify(require('fs').exists, function(exists) {  return [undefined, exists]; });
var readFile = denodeify(require('fs').readFile, function(err, data) {  return [undefined, data]; });
var packageJson = require('./package-json');

// Detect which tar is available
function detectTarOptions() {
	logger.debug('detecting which tar available');
	return exec('tar --version')
		.then(function(result) {
			if (/gnu tar/i.test(result)) {
				logger.debug('gnu-tar detected');
				return "-cz --transform 's,^\\.,./app,S'";
			}
			logger.debug('bsdtar detected');
			return "-cz -s ',^\\.,./app,g'";
		});
}

function detectUbuntu(strict) {
	return exec('lsb_release -irc 2>/dev/null')
	.catch(function() {
		var error = "If you don't run `npm install` on Ubuntu and a dependency of your application relies on node-gyp to compile C"
			+ " on `npm install` your application may break when deployed to Heroku as it runs Ubuntu";
		if (strict) {
			throw new Error(error);
		} else {
			logger.warn(error);
		}
	});
}

function ensureNodeDownloaded(opts, version) {
	logger.verbose('matching node version against: "'+version+'"');
	return fetch("https://semver.io/node/resolve?range="+version)
		.then(function(response) { return response.text(); })
		.then(function(version) {
			var node = 'node-v'+version+'-linux-x64';
			logger.verbose('checking if node '+version+' already downloaded');
			return exists(opts.cwd+'/'+node)
				.then(function(exists) {
					if (exists) {
						logger.info('node '+version+' already downloaded, using it');
					} else {
						logger.info('downloading node '+version);
						return exec('curl http://nodejs.org/dist/v'+version+'/node-v'+version+'-linux-x64.tar.gz | tar xz node-v'+version+'-linux-x64/bin/node', opts);
					}
				})
				.then(function() {
					logger.verbose('creating a symlink to the downloaded node binary folder');
					return exec('rm -f node-linux-x64 && ln -s node-v'+version+'-linux-x64/ node-linux-x64', opts);
				});
		});
}

function ensureIojsDownloaded(opts, version) {
	logger.verbose('matching iojs version against: "'+version+'"');
	return fetch("https://semver.herokuapp.com/iojs/resolve?range="+version)
		.then(function(response) { return response.text(); })
		.then(function(version) {
			var iojs = 'iojs-v'+version+'-linux-x64';
			logger.verbose('checking if iojs '+version+' already downloaded');
			return exists(opts.cwd+'/'+iojs)
				.then(function(exists) {
					if (exists) {
						logger.info('iojs '+version+' already downloaded, using it');
					} else {
						logger.info('downloading iojs '+version);
						return exec('curl https://iojs.org/dist/v'+version+'/iojs-v'+version+'-linux-x64.tar.gz | tar xz iojs-v'+version+'-linux-x64/bin/iojs', opts);
					}
				})
				.then(function() {
					logger.verbose('creating a symlink to the downloaded iojs binary folder');
					return exec('rm -f iojs-linux-x64 && ln -s iojs-v'+version+'-linux-x64/ iojs-linux-x64', opts);
				});
		});
}

function ensureJavaScriptEngineDownloaded(opts) {
	return packageJson(opts.cwd)
		.then(function(data) {
			if (data && data.engines && data.engines.iojs) {
				return ensureIojsDownloaded(opts, data && data.engines && data.engines.iojs);
			}
			return ensureNodeDownloaded(opts, data && data.engines && data.engines.node);
		});
}

function getDevDependencies(opts) {
	return packageJson(opts.cwd)
		.then(function(data) {
			if (data) {
				return Object.keys(data.devDependencies || {});
			}
			return [];
		});
}

module.exports = function(options) {
	var strict = options.strict;
	var project = options.project || process.cwd();
	var prune = options.prune;
	logger.debug('running for '+project);
	var opts = { cwd: project };

	return Promise.all([
		detectTarOptions(),
		readFile(opts.cwd+'/.slugignore', 'utf8'),
		getDevDependencies(opts),
		detectUbuntu(strict),
		ensureJavaScriptEngineDownloaded(opts),
		exec('mkdir -p .haikro-cache && rm -rf .haikro-cache/*', opts)
	])
		.then(function(results) {
			logger.info('making tarball');
			var tarOptions = results[0];
			var slugContents = results[1];

			// the --prune or -P flag must be specificed before haikro attempts to remove devDependencies
			// as this is potentially destructive
			// items in the slugignore will still be removed regardless of this flag
			// todo [PW] Make this logic more intelligent
			var excludeList = prune ? results[2].map(function(devDependency) {
				return "--exclude './node_modules/" + devDependency + "/*'";
			}) : [];

			excludeList.push("--exclude './.haikro-cache/*'");
			logger.verbose('ignoring', excludeList);
			// GNU tar <1.28 does not support --exclude-from
			if (slugContents) {
				var slugIgnores = slugContents.split('\n').filter(Boolean).map(function(a) {
					return '--exclude ' + a;
				});

				excludeList.push.apply(excludeList, slugIgnores);
			}

			return exec("tar "+tarOptions+" -f .haikro-cache/slug.tgz " + excludeList.join(' ') + " .", opts);
		})
		.then(function() {
			logger.info('build finished');
		});
};
