module.exports = (api) => {
  api.cache(true)
  return {
    presets: [["babel-preset-expo"]],
    // presets: [
    //   ["babel-preset-expo", { jsxImportSource: "nativewind" }],
    //   "nativewind/babel",
    // ],
  }
}
