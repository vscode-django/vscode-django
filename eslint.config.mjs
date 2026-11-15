import js from '@eslint/js'
import { defineConfig } from 'eslint/config'
import tseslint from 'typescript-eslint'

export default defineConfig({
    files: ['src/**/*.ts'],
    extends: [js.configs.recommended, tseslint.configs.recommended],
    rules: {
        // Provider methods keep the full VS Code interface signature
        '@typescript-eslint/no-unused-vars': ['error', { args: 'none' }],
    },
})
