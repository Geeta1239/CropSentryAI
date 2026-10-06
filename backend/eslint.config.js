export default [{
    files: ["src/**/*.js", "tests/**/*.js"],
    languageOptions: { ecmaVersion: 2022, sourceType: "module" },
    rules: { "no-unused-vars": ["error", { argsIgnorePattern: "^next$" }], semi: ["error", "always"] }
}];
