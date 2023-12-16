import * as path from 'path';
import * as Mocha from 'mocha';
import { glob } from 'glob';

import * as NYC from 'nyc';

// Simulates the recommended config option
// extends: "@istanbuljs/nyc-config-typescript",
import * as baseConfig from '@istanbuljs/nyc-config-typescript';

// Recommended modules, loading them here to speed up NYC init
// and minimize risk of race condition
import 'ts-node/register';
import 'source-map-support/register';

export async function run(): Promise<void> {
  // Setup coverage pre-test, including post-test hook to report
  const nyc = new NYC({
    ...baseConfig,
    cwd: path.join(__dirname, '..', '..', '..'),
    reporter: ['text-summary', 'html', 'lcov'],
    all: true,
    silent: false,
    instrument: true,
    hookRequire: true,
    hookRunInContext: true,
    hookRunInThisContext: true,
    include: ['out/**/*.js'],
    exclude: ['out/test/**', 'out/Ri5devBrowser.js', 'out/extension.js'],
  });
  await nyc.reset();
  await nyc.wrap();

  // Create the mocha test
  const mocha = new Mocha({
    ui: 'bdd',
    color: true,
  });

  const testsRoot = path.resolve(__dirname, '..');

  return new Promise((resolve, e) => {
    glob('**/**.test.js', { cwd: testsRoot }).then((files) => {
      // Add files to the test suite
      files.forEach((f) => mocha.addFile(path.resolve(testsRoot, f)));

      try {
        // Run the mocha test
        mocha.run((failures) => {
          if (failures > 0) {
            e(new Error(`${failures} tests failed.`));
          } else {
            resolve({});
          }
        });
      } catch (err) {
        console.error(err);
        e(err);
      }
    });
  })
    .then(() => nyc.writeCoverageFile())
    .then(() => nyc.report());
}
