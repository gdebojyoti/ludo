// An MP3 file imports as its URL (webpack.config.js).
declare module "*.mp3" {
  const url: string;
  export default url;
}
