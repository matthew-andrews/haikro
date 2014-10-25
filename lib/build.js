'use strict';
require('es6-promise').polyfill();
var denodeify = require('denodeify');
var exec = denodeify(require('child_process').exec, function(err, stdout, stderr) {
	return [err, stdout];
});

function detectTarOptions() {
	// Detect which tar is available
	return exec('tar --version | grep bsdtar')
		.then(function(result) {
			if (result === '') {
				return "-cz --transform 's,^\\.,./app,S'";
			}
			return "-cz -s ',^\\.,./app,g'";
		});
}

module.exports = function(project) {
	project = project || process.cwd();
	process.stdout.write("Downloading node… ");
	var opts = { cwd: project };

	return Promise.all([
		detectTarOptions(),
		exec('rm -rf node-v0.10.32-linux-x64; curl http://nodejs.org/dist/v0.10.32/node-v0.10.32-linux-x64.tar.gz | tar xz', opts), // Download node
		exec('mkdir -p tmp', opts) // Make tmp directory
	])
		.then(function(results) {
			console.log('✔');
			process.stdout.write("Making tarball… ");
			var tarOptions = results[0];
			return exec("cat .slugignore 2> /dev/null | tar "+tarOptions+" -f tmp/slug.tgz --exclude-from=- --exclude './tmp' .", opts);
		})
		.then(function() {
			console.log('✔');
			process.stdout.write("Tidying up… ");
			return exec("rm -rf node-v0.10.32-linux-x64;", opts);
		})
		.then(function() {
			console.log('✔');
		});
};
