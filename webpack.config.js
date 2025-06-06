import path from 'path';
import nodeExternals from 'webpack-node-externals';

export default {
  target: 'node',
  mode: 'development',
  entry: './src/index.ts',
  output: {
    filename: 'server.js',
    path: path.resolve(process.cwd(), 'dist'),
    module: true
  },
  experiments: {
    outputModule: true, 
  },
  resolve: {
    extensions: ['.ts', '.tsx', '.js', '.jsx'],
    extensionAlias: {
    '.js': ['.ts', '.js'],
    '.jsx': ['.tsx', '.jsx']
    }
  },
  externals: [nodeExternals({importType: 'module'})],
  devtool: 'source-map',
  module: {
    rules: [
      {
        test: /\.tsx?$/,
        loader: 'ts-loader',
        exclude: /node_modules/,
      },
    ],
  },
};
