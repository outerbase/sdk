require('dotenv').config();
const tsconfigPaths = require('tsconfig-paths');
const { compilerOptions } = require('./tsconfig');

tsconfigPaths.register({
    baseUrl: './',
    paths: compilerOptions.paths,
});
