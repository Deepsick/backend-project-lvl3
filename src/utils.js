import path from 'path';

const format = (url) => {
  const urlWithoutProtocol = url.split('://')[1];
  return `${urlWithoutProtocol.replace(/[^a-zA-Z0-9]/g, '-')}`;
};

export const buildResourcePath = (folder, filePath) => {
  const extension = path.extname(filePath);
  const fileName = filePath.split('.').slice(0, -1).join('.');
  return path.join(folder, `${format(fileName)}${extension}`);
};

export const buildHtmlPath = (output, origin) => path.join(output, `${format(origin)}.html`);
export const buildFileFolderName = (origin) => `${format(origin)}_files`;
