import 'axios-debug-log';
import fs from 'fs';
import Listr from 'listr';
import cheerio from 'cheerio';
import axios from 'axios';
import createDebug from 'debug';
import {
  isLocal,
  parse,
} from './url.js';
import {
  buildResourcePath,
  buildHtmlPath,
  buildFileFolderPath,
} from './utils.js';

const FILE_FORMAT = 'binary';

const {
  access,
  mkdir,
  rmdir,
  writeFile,
} = fs.promises;
const { constants } = fs;
const debug = createDebug('page-loader');

const loadResponse = (url) => (
  axios.get(url)
    .then((response) => response.data)
);

const saveToFile = (content, filePath) => (
  writeFile(filePath, content, FILE_FORMAT)
    .catch((error) => console.error(error))
);

const saveResource = (url, path) => (
  loadResponse(url)
    .then((content) => saveToFile(content, path))
);

const mapTagToAttribute = {
  link: 'href',
  script: 'src',
  img: 'src',
};

const getResources = (html, origin, folderPath) => {
  const $ = cheerio.load(html);
  const resources = [];

  Object.keys(mapTagToAttribute).forEach((tag) => {
    const attribute = mapTagToAttribute[tag];
    const nodes = $(tag)
      .filter((_, elem) => $(elem).attr(attribute))
      .map((_, elem) => {
        const attr = $(elem).attr(attribute);
        return {
          url: parse(attr, origin),
          node: $(elem),
        };
      }).get();

    nodes
      .filter(({ url }) => isLocal(url, origin))
      .forEach(({ node, url }) => {
        const resourcePath = buildResourcePath(folderPath, url.href);
        $(node).attr(attribute, resourcePath);
        resources.push({
          path: resourcePath,
          url,
        });
      });
  });

  return {
    html: $.html(),
    resources,
  };
};

const createFileFolder = (path) => (
  access(path, constants.F_OK | constants.W_OK)
    .then(() => rmdir(path, { recursive: true, force: true }))
    .then(() => mkdir(path))
    .catch(() => mkdir(path))
);

const downloadPage = (link, output = '.') => {
  const htmlPath = buildHtmlPath(output, link);
  const fileFolderPath = buildFileFolderPath(output, link);
  let data;

  debug(`Creating ${fileFolderPath} folder for files`);
  return createFileFolder(fileFolderPath)
    .then(() => {
      debug('File folder Created');
      debug(`Downloading html from ${link}`);
      return loadResponse(link);
    })
    .then((content) => {
      debug('Html was successfully downloaded');
      debug('Preparing assets');
      data = getResources(content, link, fileFolderPath);
      const tasks = new Listr(data.resources.map(({ url, path }) => ({
        title: `Download ${url.href} to ${path}`,
        task: () => saveResource(url.href, path),
      })), { concurrent: true });
      const saveHtmlTask = saveToFile(data.html, htmlPath);

      debug('Downloading assets');
      return Promise
        .all([tasks.run(), saveHtmlTask])
        .catch((error) => console.error(error));
    })
    .then(() => {
      debug('All resources are downloaded');
      return htmlPath;
    });
};

export default downloadPage;
