'use strict';
var denodeify = require('denodeify');
var resolve = require('path').resolve;
var shellpromise = require('shellpromise');
var exists = denodeify(require('fs').exists, function(exists) {  return [undefined, exists]; });
var readFile = denodeify(require('fs').readFile, function(err, data) {  return [undefined, data]; });
var packageJson = require('./package-json');
var textResJson = require('./res-json').text;
var glob = denodeify(require('glob'));
var semver = require('semver');

// Detect which tar is available
function detectTarOptions() {
	console.log('detecting which tar available');
	return shellpromise('tar --version')
		.then(function(result) {
			if (/gnu tar/i.test(result)) {
				console.log('gnu-tar detected');
				return "-cz --transform 's,^\\.,./app,S'";
			}
			console.log('bsdtar detected');
			return "-cz -s ',^\\.,./app,g'";
		});
}

function minimumNpmVersion() {
	return shellpromise('npm --version')
		.then(function(version) {
			version = version.trim();
			console.log('Checking NPM version ' + version + ' matches >=2.7.0');
			if (!semver.satisfies(version, '>=2.7.0')) {
				throw new Error("Insufficiently new version of npm, please upgrade to v2.7.0 or above.");
			}
		});
}

function detectUbuntu(strict) {
	return shellpromise('lsb_release -irc 2>/dev/null')
	.catch(function() {
		var error = "If you don't run `npm install` on Ubuntu and a dependency of your application relies on node-gyp to compile C"
			+ " on `npm install` your application may break when deployed to Heroku as it runs Ubuntu";
		if (strict) {
			throw new Error(error);
		} else {
			console.log(error);
		}
	});
}

function ensureNodeDownloaded(opts, version) {
	console.log('matching node version against: "'+version+'"');
	return fetch("https://semver.io/node/resolve?range="+version)
		.then(textResJson)
		.then(function(version) {
			var node = 'node-v'+version+'-linux-x64';
			console.log('checking if node '+version+' already downloaded');
			return exists(opts.cwd+'/'+node)
				.then(function(exists) {
					if (exists) {
						console.log('node '+version+' already downloaded, using it');
					} else {
						console.log('downloading node '+version);
						return shellpromise('curl https://nodejs.org/dist/v'+version+'/node-v'+version+'-linux-x64.tar.gz | tar xz node-v'+version+'-linux-x64/bin/node', opts);
					}
				})
				.then(function() {
					console.log('creating a symlink to the downloaded node binary folder');
					return shellpromise('rm -f node-linux-x64 && ln -s node-v'+version+'-linux-x64/ node-linux-x64', opts);
				});
		});
}

function ensureIojsDownloaded(opts, version) {
	console.log('matching iojs version against: "'+version+'"');
	return fetch("https://semver.herokuapp.com/iojs/resolve?range="+version)
		.then(textResJson)
		.then(function(version) {
			var iojs = 'iojs-v'+version+'-linux-x64';
			console.log('checking if iojs '+version+' already downloaded');
			return exists(opts.cwd+'/'+iojs)
				.then(function(exists) {
					if (exists) {
						console.log('iojs '+version+' already downloaded, using it');
					} else {
						console.log('downloading iojs '+version);
						return shellpromise('curl https://iojs.org/dist/v'+version+'/iojs-v'+version+'-linux-x64.tar.gz | tar xz iojs-v'+version+'-linux-x64/bin/iojs iojs-v'+version+'-linux-x64/bin/node', opts);
					}
				})
				.then(function() {
					console.log('creating a symlink to the downloaded iojs binary folder');
					return shellpromise('rm -f iojs-linux-x64 && ln -s iojs-v'+version+'-linux-x64/ iojs-linux-x64', opts);
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
			shellpromise('npm ls --production --parseable', opts),
			glob('*', { dot: true, cwd: opts.cwd, nodir: true }),
			exists(opts.cwd+'/node_modules/.bin')
		])
		.then(function(results) {
			// Strip out anything that isn't a path e.g. loglevel info output
			results[1] = results[1].replace(/^[^\/].+/m, '');

			var nodeModules = results[1].trim().split("\n");
			var deps = results[0]
				.map(function(folder) { return './' + folder; });

			// Check that the node_modules returned are from the current project not a parent folder.
			if (nodeModules[0] === opts.cwd) {
				nodeModules = nodeModules
					.splice(1) // ignore the first
					.map(function(folder) { return '.' + folder.replace(opts.cwd, '') + '/'; })

					// Filter so that we only pass first level folders in /node_modules/ to tar command.
					// You might think this is equivalent to --depth 0 passed to npm ls.  You would be wrong.
					.filter(function(folder) { return /^\.\/node_modules\/(@[^/]+\/)?[^/]+\/$/.test(folder); });

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
	console.log('running for '+project);
	var opts = { cwd: project };

	return Promise.all([
		detectTarOptions(),
		readFile(opts.cwd+'/.slugignore', 'utf8'),
		ensureJavaScriptEngineDownloaded(opts)
			.then(function() {
				return getDependencies(opts);
			}),
		detectUbuntu(strict),
		shellpromise('mkdir -p .haikro-cache && rm -rf .haikro-cache/*', opts),
		minimumNpmVersion()
	])
		.then(function(results) {
			console.log('making tarball');
			var tarOptions = results[0];
			var slugContents = results[1];
			var includeList = results[2];
			var excludeList = ["--exclude './.haikro-cache/*'"];

			// GNU tar <1.28 does not support --exclude-from
			if (slugContents) {
				var slugIgnores = slugContents.split('\n').filter(Boolean).map(function(a) {
					return '--exclude ' + a;
				});

				excludeList.push.apply(excludeList, slugIgnores);
			}
			
			console.log('including', includeList);
			console.log('ignoring', excludeList);
			console.log("tar "+tarOptions+" -f .haikro-cache/slug.tgz " + excludeList.join(' ') + ' ' + includeList.join(' '));
			return shellpromise("tar "+tarOptions+" -f .haikro-cache/slug.tgz " + excludeList.join(' ') + ' ' + includeList.join(' '), opts);
		})
		.then(function() {
			console.log('build finished');
		});
};
