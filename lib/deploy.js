'use strict';
require('es6-promise').polyfill();
var denodeify = require('denodeify');
var logger = require('./logger');
var request = require('request');
var post = denodeify(request.post, function(err, response, body) {
	if (body.id === 'invalid_params' || body.id === 'not_found' || body.id === 'unauthorized') err = body;
	return [err, body];
});
var exec = denodeify(require('child_process').exec, function(err, stdout, stderr) { return [err, stdout]; });
var readFile = denodeify(require('fs').readFile);

module.exports = function(opts) {
	var app = opts.app;
	if (!app) throw new Error('please provide an app name');
	var token = opts.token;
	if (!token) throw new Error('please provide a heroku access token');
	var commit = opts.commit;
	var project = opts.project;

	if (token.indexOf("-") === -1) {
		logger.warn("use of base64 encoded token is deprecated, please use raw auth:token");
	} else {
		logger.verbose("prefixing token with 'Bearer'");
		token = "Bearer " + token;
	}

	var authorizedPostHeaders = {
		'Accept': 'application/vnd.heroku+json; version=3',
		'Authorization': 'Bearer ' + token
	};

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
