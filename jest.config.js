/** @type {import('ts-jest').JestConfigWithTsJest} */

const { pathsToModuleNameMapper } = require('ts-jest')
const { compilerOptions } = require('./tsconfig')

pathsToModuleNameMapper(compilerOptions.paths, { prefix: '<rootDir>' })

module.exports = {
    preset: 'ts-jest',
    testEnvironment: 'node',
    moduleNameMapper: pathsToModuleNameMapper(compilerOptions.paths, {
        prefix: '<rootDir>/',
    }),
    moduleDirectories: ['node_modules', 'src'],
    modulePaths: ['<rootDir>'],
    setupFiles: ['<rootDir>/jest.setup.js'],
}
