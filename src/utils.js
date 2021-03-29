import { promises } from 'fs';
import path from 'path';
import { URL } from 'url';
import 'axios-debug-log';
import axios from 'axios';

const {
  mkdir,
  writeFile,
  access,
} = promises;

const parse = (url, origin) => new URL(url, origin);
const isLocal = (url, origin) => url.origin === origin;

const format = (url, replacer = '-') => url.replace(/[^\w]/g, replacer);

const buildName = (url, isFolder = false) => {
  const { hostname, pathname } = parse(url);
  const { dir, name, ext } = path.parse(pathname);
  const fullPath = path.join(hostname, dir.substring(1), name);
  const postfix = isFolder ? '_files' : (ext || '.html');
  const formatedName = format(fullPath);

  return `${formatedName}${postfix}`;
};

const loadResponse = (url) => (
  axios
    .get(url, {
      responseType: 'arraybuffer',
    })
    .then((response) => response.data)
);

const saveToFile = (content, filePath) => writeFile(filePath, content);
const createFolder = (folderPath) => access(folderPath).catch(() => mkdir(folderPath));

const saveResource = (url, filePath) => (
  loadResponse(url)
    .then((content) => saveToFile(content, filePath))
);

export {
  parse,
  isLocal,
  buildName,
  loadResponse,
  saveToFile,
  createFolder,
  saveResource,
};
