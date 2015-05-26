'use strict';
var denodeify = require('denodeify');
var logger = require('./logger');
var exec = denodeify(require('child_process').exec, function(err, stdout, stderr) { return [err, stdout]; });
var readFile = denodeify(require('fs').readFile);
var packageJson = require('./package-json');
var nodePrefix = 'export PATH="node_modules/.bin:node-linux-x64/bin:iojs-linux-x64/bin:$PATH"; ';

function parseProcfile (procfile) {
	// Return a map of processes Heroku should run
	var process_types = {};
	var commands = procfile.split('\n')
		.map(function (item) {
			return item.split(':');
		}).forEach(function (item, index) {
			if (item[0].length !== 0) {				
				process_types[item[0]] = nodePrefix + item[1];
			}
		});
	return process_types;
}

module.exports = function(opts) {
	var project = opts.project || process.cwd();
	var app = opts.app;
	if (!app) throw new Error('please provide an app name');
	var token = opts.token;
	if (!token) throw new Error('please provide a heroku access token');
	var commit = opts.commit;

	if (opts.useLegacyToken && token.indexOf("-") === -1) {
		logger.warn("use of base64 encoded token is deprecated, please use raw auth:token");
	} else {
		logger.debug("prefixing token with 'Bearer'");
		token = "Bearer " + token;
	}
	opts = { cwd: project };

	var authorizedPostHeaders = {
		'Accept': 'application/vnd.heroku+json; version=3',
		'Content-Type': 'application/json',
		'Authorization': token
	};

	logger.info("creating slug tarball", ".haikro-cache/slug.tgz");
	return readFile(project+"/Procfile", { encoding: 'UTF-8' })
		.then(function(procfile) {
			var script = parseProcfile(procfile);
			logger.verbose("Read start script from Procfile", script);
			return script;
		})
		.catch(function() {
			return packageJson(project)
			.then(function (data) { 
				logger.verbose("Read start script from package.json", data.scripts.start);
				return {
					web: nodePrefix + data.scripts.start
				};
			});
		})
		.then(function(process_types) {
			return fetch("https://api.heroku.com/apps/" + app + "/slugs", {
					method: 'post',
					headers: authorizedPostHeaders,
					body: JSON.stringify({
						process_types: process_types,
						commit: commit
					})
				}).then(function(response) {
					return response.json();
				}).then(function(slug) {
					// TODO: Invert me.  Only continue if good.
					if (slug.id === 'bad_request' || slug.id === 'forbidden' || slug.id === 'unauthorized' || slug.id === 'not_found') {
						throw new Error('Cannot create slug: ' + slug.id + '\nAre your heroku access token and app name correct?');
					}
					logger.info("uploading slug", slug.id, slug.blob.url);
					return exec("curl -f -X PUT -H 'Content-Type:' --data-binary @.haikro-cache/slug.tgz \"" + slug.blob.url + "\"", opts)
						.then(function() {
							logger.info("releasing slug", slug.id);
							return fetch("https://api.heroku.com/apps/"+app+"/releases", {
								method: 'post', headers: authorizedPostHeaders, body: JSON.stringify({ slug: slug.id })
							});
						});
				});
		})
		.then(function() {
			logger.info('deploy finished');
		});
};
