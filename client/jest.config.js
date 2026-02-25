/** @type {import('ts-jest').JestConfigWithTsJest} */
module.exports = {
  preset: "ts-jest",
  testEnvironment: "jsdom",
  moduleNameMapper: {
    "^@/(.*)$": "<rootDir>/src/$1",
    "^monaco-editor$": "<rootDir>/src/tests/mocks/monaco-editor.mock.ts",
  },
  setupFilesAfterEnv: ["<rootDir>/src/tests/setup.ts"],
  testMatch: ["**/__tests__/**/*.ts?(x)", "**/?(*.)+(spec|test).ts?(x)"],
  transform: {
    "^.+\\.tsx?$": [
      "ts-jest",
      {
        tsconfig: "tsconfig.json",
        isolatedModules: true,
      },
    ],
  },
};
