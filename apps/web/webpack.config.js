import Dotenv from "dotenv-webpack";
import HtmlWebpackPlugin from "html-webpack-plugin";
import webpack from "webpack";
import pkg from "./package.json" with { type: "json" };

export default {
  entry: "./src/index.ts",
  // Hashed names, fonts included, can be cached forever (vercel.json). remoteEntry.js keeps its name: hosts load it by URL.
  output: {
    filename: "ludo/[name].[contenthash].js",
    chunkFilename: "ludo/[id].[contenthash].js",
    assetModuleFilename: "ludo/[hash][ext][query]",
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
