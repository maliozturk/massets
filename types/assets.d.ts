// Metro resolves these to an asset id at bundle time. Declared here rather
// than relying on @types/node's `require`, so MASSETS type-checks inside apps
// that don't have @types/node installed.

declare module '*.wav' {
  const asset: number;
  export default asset;
}

declare module '*.mp3' {
  const asset: number;
  export default asset;
}

declare module '*.png' {
  const asset: number;
  export default asset;
}

declare module '*.jpg' {
  const asset: number;
  export default asset;
}
