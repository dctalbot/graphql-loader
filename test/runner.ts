import * as webpack from 'webpack';
import { join } from 'path';
import MemoryFileSystem = require('memory-fs');
import { StatsError } from 'webpack';

const loaderPath = require.resolve('../src/loader');

export class TestRunError extends Error {
  public errors: string[];

  constructor(errors: StatsError[]) {
    const errorMessages = errors.map(err => err.message);

    super(`Test Run Compiler Error:\n${errorMessages.join('\n')}`);

    Object.setPrototypeOf(this, TestRunError.prototype);

    this.errors = errorMessages;
  }
}

export function runFixture(fixtureName: string): Promise<{}> {
  const config = require(join(
    __dirname,
    '/fixtures/',
    fixtureName,
    'webpack.config.ts',
  ));

  return new Promise((resolve, reject) => {
    const fs = new MemoryFileSystem();

    const compiler = webpack({
      module: {
        rules: [
          {
            test: /\.graphql$/,
            exclude: /node_modules/,
            use: [{ loader: loaderPath }],
          },
        ],
      },
      output: {
        path: '/',
        filename: `bundle.js`,
        libraryTarget: 'commonjs2',
      },
      ...config,
    });

    compiler.outputFileSystem = fs;

    compiler.run((err, stats) => {
      if (err || stats === undefined) {
        reject(err);
      } else {
        if (stats.hasErrors()) {
          reject(new TestRunError(stats.toJson().errors || []));
          return;
        }

        const output = fs.readFileSync('/bundle.js').toString() as string;
        eval(output);
        resolve(module.exports);
      }
    });
  });
}
