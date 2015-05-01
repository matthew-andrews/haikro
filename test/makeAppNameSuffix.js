module.exports = function () {
	var suffix;
	if (process.env.TRAVIS && process.env.TRAVIS === 'true') {
		suffix = '-travis';
		if (process.env.TRAVIS_PULL_REQUEST && process.env.TRAVIS_PULL_REQUEST !== 'false') {
			suffix += '-pr';
		}
	} else {
		suffix = 'local';
	}
	return suffix;
};
