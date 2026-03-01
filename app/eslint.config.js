import eslint from "@eslint/js";
import tseslint from "typescript-eslint";
import stylistic from "@stylistic/eslint-plugin";

export default tseslint.config(
    eslint.configs.recommended,
    tseslint.configs.recommended,
    {
        ignores: ["**/docs/**", "**/src/dist/**"]
    },
    {
        plugins: {
            "@stylistic": stylistic
        },
        rules: {
            "@typescript-eslint/no-unused-vars": [
                "error",
                {
                    argsIgnorePattern: "^_",
                    varsIgnorePattern: "^h|^_",
                    caughtErrorsIgnorePattern: "^_",
                }
            ],
            "max-len": ["error", { code: 89 }],
            "semi": ["error", "always"],
            "no-console": "error",
            "@stylistic/member-delimiter-style": [
                "error",
                {
                    multiline: {
                        delimiter: "comma",
                        requireLast: false,
                    },
                    singleline: {
                        delimiter: "comma",
                        requireLast: false,
                    },
                },
            ],
        }
    }
);
