/* Jest Config */
module.exports = {
  testRegex: '(/__tests__/.*|(\\.|/)(test|spec))\\.(jsx?|tsx?)$',
  moduleFileExtensions: [
    'js',
    'json',
    'jsx',
    'node',
    'ts',
    'tsx',
  ],
  testTimeout: 10000,
  setupFiles: [
    'dotenv/config',
  ],
  collectCoverage: false,
  coverageDirectory: 'coverage',
  preset: 'ts-jest',
  testMatch: null,
}