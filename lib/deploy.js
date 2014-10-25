'use strict';
require('es6-promise').polyfill();
var denodeify = require('denodeify');
var logger = require('./logger');
var post = denodeify(require('request').post, function(err, response, body) { return [err, body]; });
var exec = denodeify(require('child_process').exec, function(err, stdout, stderr) { return [err, stdout]; });
var readFile = denodeify(require('fs').readFile);

module.exports = function(opts) {
	var app = opts.app;
	if (!app) throw new Error('please provide an app name');
	var token = opts.token;
	if (!token) throw new Error('please provide a heroku access token');
	var commit = opts.commit;
	var project = opts.project;

	var authorizedPostHeaders = {
		'Accept': 'application/vnd.heroku+json; version=3',
		'Authorization': token
	};

	var web = 'export PATH=\\\"node-v0.10.32-linux-x64/bin:$PATH\\\"; `cat Procfile | sed "s/web: //"`';

	// Backwards compatibility
	if (opts.entry) {
		logger.warn('deprecated: --entry is deprecated, use Procfile instead');
		web = "node-v0.10.32-linux-x64/bin/node "+ opts.entry;
	}

	logger.info("creating slug tarball");
	return readFile(project+"/Procfile", { encoding: 'UTF-8' })
		.then(function(procfile) {
			return post("https://api.heroku.com/apps/"+app+"/slugs", {
					headers: authorizedPostHeaders,
					json: true,
					body: { process_types: { web: 'export PATH="node-v0.10.32-linux-x64/bin:$PATH"; ' + procfile.match(/web:(.*)/)[1] }, commit: commit }
				}).then(function(slug) {
					if (slug.id === 'forbidden') {
						throw new Error('cannot create slug, are your heroku access token and app name correct?');
					}
					logger.info("uploading slug");
					return exec("curl -f -X PUT -H 'Content-Type:' --data-binary @tmp/slug.tgz \""+slug.blob.url+"\"", { cwd: project })
						.then(function() {
							logger.info("releasing slug");
							return post("https://api.heroku.com/apps/"+app+"/releases", {
								headers: authorizedPostHeaders, json: true, body: { slug: slug.id }
							});
						});
				});
		})
		.then(function() {
			logger.info('deploy finished');
		});
};
