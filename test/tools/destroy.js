'use strict';

var shellpromise = require('shellpromise');

module.exports = function(app) {
	return shellpromise('heroku apps:destroy --app ' + app + ' --confirm ' + app, { verbose: true });
};
