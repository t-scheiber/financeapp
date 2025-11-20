import react from "eslint-plugin-react";
import typescriptEslint from "@typescript-eslint/eslint-plugin";
import globals from "globals";
import tsParser from "@typescript-eslint/parser";

export default [
    {
        ignores: [
            ".next/**/*",
            "node_modules/**/*",
            "**/*.config.js",
            "**/*.config.mjs",
            "**/*.config.ts",
            "**/next-env.d.ts",
            "lib/generated/**/*",
        ],
    },
    // JavaScript files
    {
        files: ["**/*.{js,mjs,cjs,jsx}"],

        plugins: {
            react,
        },

        languageOptions: {
            globals: {
                ...globals.browser,
                ...globals.node,
            },

            ecmaVersion: "latest",
            sourceType: "module",

            parserOptions: {
                ecmaFeatures: {
                    jsx: true,
                },
            },
        },

        settings: {
            react: {
                version: "detect",
            },
        },

        rules: {
            "react/react-in-jsx-scope": "off",
            "react/prop-types": "off",
        },
    },
    // TypeScript files
    {
        files: ["**/*.{ts,tsx}"],
        
        plugins: {
            react,
            "@typescript-eslint": typescriptEslint,
        },

        languageOptions: {
            globals: {
                ...globals.browser,
                ...globals.node,
            },

            parser: tsParser,
            ecmaVersion: "latest",
            sourceType: "module",

            parserOptions: {
                ecmaFeatures: {
                    jsx: true,
                },
            },
        },

        settings: {
            react: {
                version: "detect",
            },
        },

        rules: {
            // React rules
            "react/react-in-jsx-scope": "off", // Not needed in Next.js
            "react/prop-types": "off", // Using TypeScript
            
            // TypeScript rules
            "@typescript-eslint/no-unused-vars": ["warn", { 
                argsIgnorePattern: "^_",
                varsIgnorePattern: "^_" 
            }],
            "@typescript-eslint/no-explicit-any": "warn",
        },
    },
];