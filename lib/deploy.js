'use strict';
require('es6-promise').polyfill();
var denodeify = require('denodeify');
var exec = denodeify(require('child_process').exec, function(err, stdout, stderr) {
	if (err) console.log(stderr);
	return [err, stdout];
});

module.exports = function(opts) {
	process.stdout.write("Creating slug tarball… ");
	var app = opts.app;
	var entry = opts.entry
	var token = opts.token;
	var commit = opts.commit;
	var project = opts.project

	opts = { cwd: project };
	var authorizedPost = "curl -X POST -H 'Content-Type: application/json'"
		+ " -H 'Accept: application/vnd.heroku+json; version=3'"
		+ " -H 'Authorization: "+token+"'";

	return exec(authorizedPost+" -d \"{\\\"process_types\\\":{\\\"web\\\":\\\"node-v0.10.32-linux-x64/bin/node "+entry+"\\\"}, \\\"commit\\\": \\\""+commit+"\\\"}\""
		+ " https://api.heroku.com/apps/"+app+"/slugs", opts)
		.then(function(slug) {
			slug = JSON.parse(slug);
			console.log('✔');
			process.stdout.write("Uploading slug… ");
			return exec("curl -f -X PUT -H 'Content-Type:' --data-binary @tmp/slug.tgz \""+slug.blob.url+"\"", opts)
				.then(function() {
					console.log('✔');
					process.stdout.write("Releasing slug… ");
					return exec(authorizedPost+" -d \"{\\\"slug\\\":\\\""+slug.id+"\\\"}\""
						+ " https://api.heroku.com/apps/"+app+"/releases", opts);
					});
		})
		.then(function() {
			console.log('✔');
		});
};
