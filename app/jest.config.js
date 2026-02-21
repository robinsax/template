export default {
    preset: 'ts-jest',
    moduleNameMapper: {
        '^@/(.*)$': '<rootDir>/src/$1',
        '@fontsource/*': 'jest-transform-stub',
        '@common/*': 'jest-transform-stub',
        'marked': 'jest-transform-stub',
    },
    transform: {
        '^.+\\.(ts|tsx)$': 'ts-jest',
    },
    transformIgnorePatterns: ['<rootDir>/node_modules/'],
    modulePaths: ['<rootDir>/src'],
    moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'json', 'node'],
    forceExit: true
};
