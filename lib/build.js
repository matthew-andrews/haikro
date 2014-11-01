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
	var node = 'node-v0.10.32-linux-x64';
	logger.verbose('checking if node already downloaded');
	return exists(opts.cwd+'/'+node)
		.then(function(exists) {
			if (exists) {
				logger.info('node already downloaded, using it');
			} else {
				logger.info('downloading node');
				return exec('curl http://nodejs.org/dist/v0.10.32/node-v0.10.32-linux-x64.tar.gz | tar xz node-v0.10.32-linux-x64/bin/node', opts); // Download node
			}
		});
}

module.exports = function(project) {
	project = project || process.cwd();
	logger.debug('running for '+project);
	var opts = { cwd: project };

	return Promise.all([
		detectTarOptions(),
		ensureNodeDownloaded(opts),
		exec('mkdir -p tmp', opts) // Make tmp directory
	])
		.then(function(results) {
			logger.info('making tarball');
			var tarOptions = results[0];
			return exec("cat .slugignore 2> /dev/null | tar "+tarOptions+" -f tmp/slug.tgz --exclude-from=- --exclude './tmp' .", opts);
		})
		.then(function() {
			logger.info('build finished');
		});
};
