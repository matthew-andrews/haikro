'use strict';

module.exports = function(res) {
	if (res.ok) {
		return res.json();
	} else {
		return res.json()
			.then(function(data) {
				throw new Error("heroku error=" + data.id + " message=\"" + data.url + "\" url=\"" + data.url + "\"");
			});
	}
};
