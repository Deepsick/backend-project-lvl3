#!/usr/bin/env node
import program from 'commander';
import downloadPage from '../src/index.js';

program
  .description('Downloads html page with all its resources.')
  .version('1.0.0')
  .arguments('<url>')
  .option('-o, --output [path]', 'output folder path', '.')
  .action((url) => {
    downloadPage(url, program.output)
      .then((path) => console.log(path))
      .catch((error) => console.error(error));
  })
  .parse(process.argv);
