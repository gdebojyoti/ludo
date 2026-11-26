import Dotenv from "dotenv-webpack";
import HtmlWebpackPlugin from "html-webpack-plugin";
import webpack from "webpack";
import pkg from "./package.json" with { type: "json" };

export default {
  entry: "./src/index.ts",
  // Hashed names let fonts and sounds be cached forever (vercel.json). Scripts aren't: Vercel would add the header to a
  // 404 too, and a chunk missing for a moment, as in a rollback, would stay missing for a year. remoteEntry.js keeps its
  // name: host apps load it by URL.
  output: {
    filename: "ludo/[name].[contenthash].js",
    chunkFilename: "ludo/[id].[contenthash].js",
    assetModuleFilename: "ludo/[hash][ext][query]",
    // Changing the salt renames every hashed file, so browsers and caches that kept a broken copy of one (a 404, or
    // part of a file) fetch it afresh. Changed 2026-11-26, when a 404 for an app chunk was cached for a year.
    hashSalt: "2026-11-26",
    publicPath: "/",
    clean: true,
  },
  devServer: {
    port: 8083,
    // Mirrors the routes in vercel.json.
    setupMiddlewares: (middlewares) => [
      (req, res, next) => {
        const { pathname, search } = new URL(req.url, "http://localhost");
        if (pathname === "/") return res.writeHead(307, { Location: "/ludo" + search }).end();
        if (pathname === "/ludo/") return res.writeHead(308, { Location: "/ludo" + search }).end();
        if (pathname === "/ludo") req.url = "/index.html";
        next();
      },
      ...middlewares,
    ],
  },
  resolve: { extensions: [".ts", ".tsx", ".js"] },
  module: {
    rules: [
      {
        test: /\.tsx?$/,
        loader: "esbuild-loader",
        options: { target: "es2022", jsx: "automatic" },
      },
      {
        test: /\.css$/,
        use: [
          "style-loader",
          "css-loader",
          {
            loader: "postcss-loader",
            options: { postcssOptions: { plugins: ["@tailwindcss/postcss"] } },
          },
        ],
      },
      { test: /\.mp3$/, type: "asset/resource" },
    ],
  },
  plugins: [
    new webpack.container.ModuleFederationPlugin({
      name: "ludo",
      filename: "ludo/remoteEntry.js",
      exposes: { "./Ludo": "./src/ui/Ludo.tsx" },
      shared: {
        react: { singleton: true, requiredVersion: pkg.dependencies.react },
        "react-dom": { singleton: true, requiredVersion: pkg.dependencies["react-dom"] },
      },
    }),
    // Reads apps/web/.env if there is one, and the platform's variables on Vercel.
    new Dotenv({ systemvars: true, silent: true }),
    new HtmlWebpackPlugin({ template: "./src/index.html", chunks: ["main"] }),
  ],
};
