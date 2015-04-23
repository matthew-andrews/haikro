'use strict';
var logger = require('./logger');
var denodeify = require('denodeify');
var resolve = require('path').resolve;
var exec = denodeify(require('child_process').exec, function(err, stdout, stderr) { return [err, stdout]; });
var exists = denodeify(require('fs').exists, function(exists) {  return [undefined, exists]; });
var readFile = denodeify(require('fs').readFile, function(err, data) {  return [undefined, data]; });
var packageJson = require('./package-json');
var glob = denodeify(require('glob'));
var semver = require('semver');

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

function minimumNpmVersion() {
	return exec('npm --version')
		.then(function(version) {
			version = version.trim();
			logger.verbose('Checking NPM version ' + version + ' matches ^2.7.0');
			if (!semver.satisfies(version, '^2.7.0')) {
				throw new Error("Insufficiently new version of npm, please upgrade to v2.7.0 or above.");
			}
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

function getDependencies(opts) {
	return Promise.all([
			glob('!(node_modules)/', opts),
			exec('npm ls --production --parseable --depth 0', opts),
			glob('*', { cwd: opts.cwd, nodir: true }),
			exists(opts.cwd+'/node_modules/.bin')
		])
		.then(function(results) {
			var nodeModules = results[1].trim().split("\n");
			var deps = results[0]
				.map(function(folder) { return './' + folder; });

			// Check that the node_modules returned are from the current project not a parent folder.
			if (nodeModules[0] === opts.cwd) {
				nodeModules = nodeModules
					.splice(1) // ignore the first
					.map(function(folder) { return '.' + folder.replace(opts.cwd, '') + '/'; });
				deps = deps.concat(nodeModules);
			}

			if (results[3]) {
				deps.push('./node_modules/.bin');
			}
			var topLevelFiles = results[2]
				.map(function(file) { return './' + file; });
			return deps.concat(topLevelFiles);
		});
}

module.exports = function(options) {
	var strict = options.strict;
	var project = resolve(options.project || process.cwd());
	logger.debug('running for '+project);
	var opts = { cwd: project };

	return Promise.all([
		detectTarOptions(),
		readFile(opts.cwd+'/.slugignore', 'utf8'),
		ensureJavaScriptEngineDownloaded(opts)
			.then(function() {
				return getDependencies(opts);
			}),
		detectUbuntu(strict),
		exec('mkdir -p .haikro-cache && rm -rf .haikro-cache/*', opts),
		minimumNpmVersion()
	])
		.then(function(results) {
			logger.info('making tarball');
			var tarOptions = results[0];
			var slugContents = results[1];
			var includeList = results[2];
			var excludeList = ["--exclude './.haikro-cache/*'"];
			logger.verbose('including', includeList);
			logger.verbose('ignoring', excludeList);

			// GNU tar <1.28 does not support --exclude-from
			if (slugContents) {
				var slugIgnores = slugContents.split('\n').filter(Boolean).map(function(a) {
					return '--exclude ' + a;
				});

				excludeList.push.apply(excludeList, slugIgnores);
			}

			logger.verbose("tar "+tarOptions+" -f .haikro-cache/slug.tgz " + excludeList.join(' ') + ' ' + includeList.join(' '));
			return exec("tar "+tarOptions+" -f .haikro-cache/slug.tgz " + excludeList.join(' ') + ' ' + includeList.join(' '), opts);
		})
		.then(function() {
			logger.info('build finished');
		});
};
