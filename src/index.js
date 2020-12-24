import 'axios-debug-log';
import fs from 'fs';
import { join } from 'path';
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
  buildFileFolderName,
} from './utils.js';

const {
  mkdir,
  writeFile,
} = fs.promises;
const debug = createDebug('page-loader');

const loadResponse = (url) => (
  axios
    .get(url, {
      responseType: 'arraybuffer',
    })
    .then((response) => response.data)
);

const saveToFile = (content, filePath) => writeFile(filePath, content);
const createFolder = (path) => mkdir(path);

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
  const $ = cheerio.load(html, { decodeEntities: false });
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
        const { hostname, pathname } = url;
        const resourcePath = buildResourcePath(folderPath, `${hostname}${pathname}`);
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

const downloadPage = (link, output = '.') => {
  const { hostname, pathname, origin } = parse(link);
  const parsedUrl = `${hostname}${pathname}`;
  const htmlPath = buildHtmlPath(output, parsedUrl);

  const fileFolderName = buildFileFolderName(parsedUrl);
  const fileFolderPath = join(output, fileFolderName);
  let data;

  debug(`Creating ${fileFolderPath} folder for files`);
  return createFolder(fileFolderPath)
    .then(() => {
      debug(`File ${fileFolderPath}  folder Created`);
      debug(`Downloading html from ${link}`);
      return loadResponse(link);
    })
    .then((content) => {
      debug('Html was successfully downloaded');
      debug('Preparing assets');
      data = getResources(content, origin, fileFolderName);
      const tasks = new Listr(data.resources.map(({ url, path }) => ({
        title: `Download ${url.href} to ${path}`,
        task: () => saveResource(url.href, join(output, path)),
      })), { concurrent: true });
      const saveHtmlTask = saveToFile(data.html, htmlPath);

      debug('Downloading assets');
      return Promise
        .all([tasks.run(), saveHtmlTask]);
    })
    .then(() => {
      debug('All resources are downloaded');
      return htmlPath;
    });
};

export default downloadPage;
