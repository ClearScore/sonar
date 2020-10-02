module.exports = {
    root: true,
    env: {
        es6: true,
        node: true,
    },
    plugins: ['prettier'],
    extends: ['eslint:recommended', 'airbnb', 'prettier'],
    globals: {},
    parserOptions: {
        sourceType: 'module',
        ecmaFeatures: {
            ecmaVersion: 2018,
            classes: true,
        },
    },
    rules: {
        'prettier/prettier': [
            'error',
            {
                singleQuote: true,
                trailingComma: 'all',
                arrowParens: 'always',
                printWidth: 120,
            },
        ],
        indent: 0,
        'lines-between-class-members': ['error', 'always', { exceptAfterSingleLine: true }],
        'no-multiple-empty-lines': ['error', { max: 1, maxBOF: 0 }],
        'import/order': [
            'error',
            {
                'newlines-between': 'always',
                groups: [
                    ['builtin', 'external'],
                    ['parent', 'sibling', 'index'],
                ],
            },
        ],
        'no-unused-expressions': ['error', { allowTernary: true }],
        quotes: 0,
        semi: ['error', 'always'],
        'no-console': 2,
        'func-style': ['error', 'declaration', { allowArrowFunctions: true }],
        'eol-last': ['error', 'always'],
        'arrow-body-style': ['error', 'as-needed', { requireReturnForObjectLiteral: false }],
        'max-len': [2, { code: 120, ignoreStrings: true }],
        'arrow-parens': [2, 'always'],
        'function-paren-newline': 0,
        'comma-dangle': [
            'error',
            {
                arrays: 'always-multiline',
                objects: 'always-multiline',
                imports: 'always-multiline',
                exports: 'always-multiline',
                functions: 'ignore',
            },
        ],
        'no-irregular-whitespace': 0,
        /*
          An unspaced *i18n* comment is necessary for jsLingui
          to be able to extract messages and build locale catalogues
        */
        'spaced-comment': ['error', 'always', { exceptions: ['i18n'] }],
        // 'object-curly-newline': [
        //     'error',
        //     {
        //         ObjectExpression: {
        //             minProperties: 5,
        //             multiline: true,
        //             consistent: true,
        //         },
        //         ObjectPattern: {
        //             minProperties: 5,
        //             multiline: true,
        //             consistent: true,
        //         },
        //         ImportDeclaration: {
        //             minProperties: 5,
        //             multiline: true,
        //             consistent: true,
        //         },
        //         ExportDeclaration: {
        //             minProperties: 5,
        //             multiline: true,
        //             consistent: true,
        //         },
        //     },
        // ],
        'implicit-arrow-linebreak': 0,
        'no-else-return': ['error', { allowElseIf: true }],
        'no-underscore-dangle': 0,
        'global-require': 0,
        /*
         disabled so as not to force a build before running lint
        */
        'import/no-extraneous-dependencies': 0,
        'import/no-unresolved': 0,
        'import/extensions': 0,
        /*
         Everything below here has been 'ignored' temporarily.
         Please feel to delete any of the following lines and fix any errors.
         Please only submit one rule change per PR.
         Thanks!
         */
        'prefer-promise-reject-errors': ['warn'],
        'guard-for-in': ['warn'],
    },
    overrides: [
        // Jest
        {
            files: ['**/*.test.js'],
            env: {
                jest: true,
            },
            plugins: ['prettier', 'jest'],
            rules: {
                /* no need to destructure in tests for many `let` uses */
                'prefer-destructuring': 0,
                'global-require': 0,
                'react/jsx-props-no-spreading': 0,

                /*
              Below are auto fixed
             */
                'jest/consistent-test-it': 'error',
                'jest/no-test-prefixes': 'error',
                'jest/prefer-to-have-length': 'error',
                'jest/prefer-to-be-null': 'error',
                'jest/prefer-to-be-undefined': 'error',
                /*
              Below are recommended
            */
                'jest/no-disabled-tests': 'error',
                'jest/no-focused-tests': 'error',
                'jest/no-identical-title': 'error',
                'jest/no-jest-import': 'error',
                /*
              Below are just good CS things we already do
            */
                'jest/valid-expect': 'error',
                'jest/valid-expect-in-promise': 'error',
                'jest/no-large-snapshots': 'error',
                'jest/valid-describe': 'error',
                /*
             Everything below here has been 'ignored' temporarily.
             Please feel to delete any of the following lines and fix any errors.
             Please only submit one rule change per PR.
             Thanks!
             */
                'jest/lowercase-name': 0,
                'jest/no-hooks': 0,
                'jest/prefer-expect-assertions': 0,
            },
        },
    ],
};
