'use strict';

var shellpromise = require('shellpromise');

module.exports = function(app) {
	return shellpromise('heroku destroy --app ' + app + ' --confirm ' + app, { verbose: true });
};
