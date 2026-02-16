module.exports = {
    preset: 'ts-jest',
    testEnvironment: 'node',
    roots: ['<rootDir>/app/src/', '<rootDir>/app/test/'],
    testMatch: ['**/*.spec.ts', '**/*.test.ts'],
};
