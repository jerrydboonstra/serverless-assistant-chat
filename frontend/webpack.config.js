const HtmlWebPackPlugin = require('html-webpack-plugin');
const Dotenv = require('dotenv-webpack');
const path = require('path');

const htmlPlugin = new HtmlWebPackPlugin({
  template: './index.html',
  filename: './index.html'
});

module.exports = {
  entry: './index.tsx',
  output: {
    path: path.resolve(__dirname, 'www'),
    publicPath: ''
  },
  module: {
    rules: [
      {
        test: /\.(ts|tsx)$/, // Ensure .tsx files are included
        exclude: /node_modules/,
        use: {
          loader: 'babel-loader',
          options: {
            presets: [
              '@babel/preset-env',
              '@babel/preset-react',
              '@babel/preset-typescript' // Add this preset
            ]
          }
        }
      },
      { test: /\.css$/, use: ['style-loader', 'css-loader'] },
      { test: /\.(png|gif)$/, loader: 'file-loader' } // Combine file extensions in one rule
    ]
  },
  resolve: {
    extensions: ['.js', '.jsx', '.ts', '.tsx'], // Add .ts and .tsx extensions
    fallback: {
      "path": require.resolve("path-browserify"),
    }
  },
  plugins: [htmlPlugin, new Dotenv({ path: '../.env' })]
};