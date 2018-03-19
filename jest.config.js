/* Jest Config */
module.exports = {
	/* General Settings */
	transform: {
		"^.+\\.tsx?$": "ts-jest"
	},
	testRegex: "(/__tests__/.*|(\\.|/)(test|spec))\\.(jsx?|tsx?)$",
	moduleFileExtensions: ["ts", "tsx", "js", "jsx", "json", "node"],
	globals: {
		'ts-jest': {
			skipBabel: true
		}
	},

	/* Test Converage */
	collectCoverage: true,
	coverageDirectory: 'coverage',
}