// /apps/{app_id_or_name}/formation/{formation_id_or_type}

'use strict';
var logger = require('../lib/logger');

module.exports = function(opts) {
	var token = opts.token;
	if (!token) throw new Error('please provide a heroku access token');
	var name = opts.app;

	opts = {};

	var processProfiles = {
							updates:[{
								"process":"web",
								"quantity":1,
								"size":"2X"
							},
							{
								"process":"worker",
								"quantity":1,
								"size":"2X"
							}]
						};

	logger.verbose("scaling processes", processProfiles);

	var apiUrl = "https://api.heroku.com/apps/" + name + "/formation";
	console.log(apiUrl);

	return fetch(apiUrl, {
		method: 'patch',
		headers: {
			"Accept": "application/vnd.heroku+json; version=3",
			"Content-Type": "application/json",
			"Authorization": "Bearer " + token
		},
		body: JSON.stringify(processProfiles)
	})
		.then(function(response) { return response.json(); })
		.then(function(app) {
			console.log(app);
			if (app.id === "not_found") throw new Error("API fail");
			logger.info("scaled " + " hugs " + " to do wonderous things");
			return name;
		});
};
