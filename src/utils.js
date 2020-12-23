import path from 'path';

const format = (url) => `${url.replace(/[^a-zA-Z0-9]/g, '-')}`;

export const buildResourcePath = (folder, filePath) => {
  const { dir, name, ext } = path.parse(filePath);
  const postfix = ext || '.html';
  const fileName = format(`${path.join(dir, name)}`);
  return path.join(folder, `${fileName}${postfix}`);
};

export const buildHtmlPath = (output, origin) => path.join(output, `${format(origin)}.html`);
export const buildFileFolderName = (origin, postfix = '_files') => `${format(origin)}${postfix}`;
