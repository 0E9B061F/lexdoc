module.exports = {
  "env": {
    "es6": true,
    "node": true,
    "jasmine": true
  },
  "extends": "eslint:recommended",
  "rules": {
    "strict": ["error", "global"],
    "indent": ["error", 2, {"SwitchCase": 1}],
    "linebreak-style": ["error", "unix"],
    "quote-props": ["error", "consistent-as-needed"],
    "semi": ["error", "never"],
    "no-var": "error",
    "quotes": ["error", "single", {"avoidEscape": true, "allowTemplateLiterals": true}],
    "one-var": ["error", "never"],
    "object-curly-spacing": ["warn", "always", {"objectsInObjects": false}],

    "block-spacing": ["warn", "always"],
    "padded-blocks": ["warn", "never"],
    "curly": ["warn", "multi-line"],
    "no-unused-vars": ["warn", {"args": "none"}],
    "no-trailing-spaces": "warn",
    "prefer-const": "warn",
    "no-console": "warn"
  }
}
