/* eslint-disable import/prefer-default-export */
import path from 'path';
import { parse } from './url.js';

const format = (url, replacer = '-') => url.replace(/[^a-zA-Z0-9]/g, replacer);

export const buildName = (url, isFolder = false) => {
  const { hostname, pathname } = parse(url);
  const { dir, name, ext } = path.parse(pathname);
  const fullPath = path.join(hostname, dir.substring(1), name);
  const postfix = isFolder ? '_files' : (ext || '.html');
  const formatedName = format(fullPath);

  return `${formatedName}${postfix}`;
};
