'use strict';
var logger = require('./logger');
var denodeify = require('denodeify');
var exec = denodeify(require('child_process').exec, function(err, stdout, stderr) { return [err, stdout]; });
var exists = denodeify(require('fs').exists, function(exists) {  return [undefined, exists]; });

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

function ensureNodeDownloaded(opts) {
	return exec("node -e \"var pkg=require('./package.json'); process.stdout.write(pkg && pkg.engines && pkg.engines.node ? pkg.engines.node : '');\"", opts)
		.then(function(version) {
			logger.verbose('matching node version against: "'+version+'"');
			return fetch("https://semver.io/node/resolve?range="+version);
		})
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

module.exports = function(project) {
	project = project || process.cwd();
	logger.debug('running for '+project);
	var opts = { cwd: project };

	return Promise.all([
		detectTarOptions(),
		ensureNodeDownloaded(opts),
		exec('mkdir -p tmp', opts)
	])
		.then(function(results) {
			logger.info('making tarball');
			var tarOptions = results[0];
			return exec("tar "+tarOptions+" -f tmp/slug.tgz --exclude-from=.slugignore --exclude './tmp' .", opts);
		})
		.then(function() {
			logger.info('build finished');
		});
};
