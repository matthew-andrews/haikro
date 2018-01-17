'use strict';

function heroku(res) {
	if (res.ok) {
		return res.json();
	} else {
		return res.json()
			.then(function(data) {
				throw new Error("heroku error=" + data.id + " message=\"" + data.message + "\" url=\"" + data.url + "\"");
			});
	}
}

function text(res) {
	if (res.ok) {
		return res.text();
	} else {
		return res.text()
			.then(function(data) {
				throw new Error("fetch error=" + res.status + " message=\"" + data + "\"");
			});
	}
}

module.exports = {
	heroku: heroku,
	text: text
};
