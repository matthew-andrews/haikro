'use strict';
var logger = require('./logger');
var denodeify = require('denodeify');
var exec = denodeify(require('child_process').exec, function(err, stdout, stderr) { return [err, stdout]; });
var exists = denodeify(require('fs').exists, function(exists) {  return [undefined, exists]; });

module.exports = function(opts) {
	var project = opts.project || process.cwd();
	var repository = opts.repository;
	if (!repository) throw new Error('please provide a repository');
	var token = opts.token;
	if (!token) throw new Error('please provide a github access token');
	var tag = opts.tag;
	if (!tag) throw new Error('please provide a git tag');
	opts = { cwd: project };

	var authorizedHeaders = { Authorization: 'token '+token };

	logger.verbose("getting all releases");
	return exists(opts.cwd+'/tmp/slug.tgz')
		.then(function(exists) {
			if (!exists) throw new Error('cannot find releaseable binary');
		})
		.then(function() {
			return fetch("https://api.github.com/repos/"+repository+"/releases", { headers: authorizedHeaders });
		})
		.then(function(response) { return response.json(); })
		.then(function(releases) {
			if (releases.message === 'Bad credentials') {
				throw new Error('cannot access github with provided token, are your github access token and repository correct?');
			}
			logger.verbose("checking if release already exists");
			releases = releases.filter(function(release) {
				return release.tag_name === tag;
			});
			if (releases[0]) return releases[0].id;
		})
		.then(function(release) {
			if (!release) {
				logger.verbose("release not found, trying to create one");
				return fetch("https://api.github.com/repos/"+repository+"/tags", { headers: authorizedHeaders })
					.then(function(response) { return response.json(); })
					.then(function(tags) {
						tags = tags.filter(function(existingTag) {
							return existingTag.name === tag;
						});
						if (!tags[0]) throw new Error("tag cannot be found");
						logger.verbose("creating release: "+tag);
						return fetch("https://api.github.com/repos/"+repository+"/releases", {
							method: "post", headers: authorizedHeaders, body: JSON.stringify({ tag_name: tag })
						})
							.then(function(response) { return response.json(); })
							.then(function(release) { return release.id; });
					});
			}
			return release;
		})
		.then(function(release) {
			logger.verbose("uploading slug");
			return exec("curl -f -X POST "
				+ " -H 'Accept: application/vnd.github.manifold-preview' "
				+ " -H 'Content-Type:application/gzip' "
				+ " -H 'Authorization:"+authorizedHeaders.Authorization+"' "
				+ " --data-binary @tmp/slug.tgz "
				+ " \"https://uploads.github.com/repos/"+repository+"/releases/"+release+"/assets?name="+tag+".tgz\"", { cwd: project });
		});
};
