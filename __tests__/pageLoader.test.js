import { constants as httpConstants } from 'http2';
import os from 'os';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import nock from 'nock';
import downloadPage from '../index.js';

const FIXTURES_FOLDER = '__fixtures__';
const RESOURCES_FOLDER = 'resources';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const {
  mkdtemp,
  rmdir,
  access,
  readdir,
  readFile,
} = fs.promises;
const { constants } = fs;

const getFixturePath = (fileName) => join(__dirname, '..', FIXTURES_FOLDER, fileName);
const getResourcePath = (fileName) => join(__dirname, '..', FIXTURES_FOLDER, RESOURCES_FOLDER, fileName);
const isExist = (path) => access(path, constants.F_OK || constants.W_OK);

const URL = 'https://example.com';
const ERROR_URL = 'https://error-example.com';
const RESOURCES = [
  {
    fileName: 'example-com-resources-img.jpg',
    url: '/resources/img.jpg',
  },
  {
    fileName: 'example-com-resources-index.css',
    url: '/resources/index.css',
  },
  {
    fileName: 'example-com-resources-index.js',
    url: '/resources/index.js',
  },
  {
    fileName: 'example-com-resources-blog-about.html',
    url: '/resources/blog/about',
  },
];

const htmlFileName = 'example-com.html';
const fileFolderName = 'example-com_files';

let dirPath;
let htmlFilePath;
let fileFolderPath;
let resourcesCount;

const mapStatusToRoute = {
  [httpConstants.HTTP_STATUS_INTERNAL_SERVER_ERROR]: 'server-error',
  [httpConstants.HTTP_STATUS_NOT_FOUND]: 'not-found',
  [httpConstants.HTTP_STATUS_UNAUTHORIZED]: 'unauthorized',
  [httpConstants.HTTP_STATUS_BAD_REQUEST]: 'bad',
  [httpConstants.HTTP_STATUS_FORBIDDEN]: 'forbidden',
  [httpConstants.HTTP_STATUS_PERMANENT_REDIRECT]: 'redirect',
};

beforeAll(nock.disableNetConnect);

beforeEach(async () => {
  dirPath = await mkdtemp(join(os.tmpdir(), 'page-loader-'));
  htmlFilePath = join(dirPath, htmlFileName);
  fileFolderPath = join(dirPath, fileFolderName);

  const resourcesPath = getFixturePath('resources');
  resourcesCount = (await readdir(resourcesPath)).length;
  nock(URL)
    .persist()
    .get('/')
    .replyWithFile(httpConstants.HTTP_STATUS_OK, getFixturePath('initial.html'));

  RESOURCES.forEach(({ fileName, url }) => {
    nock(URL)
      .persist()
      .get(url)
      .replyWithFile(httpConstants.HTTP_STATUS_OK, join(resourcesPath, fileName));
  });

  nock(ERROR_URL)
    .persist()
    .get('/server-error')
    .reply(httpConstants.HTTP_STATUS_INTERNAL_SERVER_ERROR)
    .get('/not-found')
    .reply(httpConstants.HTTP_STATUS_NOT_FOUND)
    .get('/unauthorized')
    .reply(httpConstants.HTTP_STATUS_UNAUTHORIZED)
    .get('/bad')
    .reply(httpConstants.HTTP_STATUS_BAD_REQUEST)
    .get('/forbidden')
    .reply(httpConstants.HTTP_STATUS_FORBIDDEN)
    .get('/redirect')
    .reply(httpConstants.HTTP_STATUS_PERMANENT_REDIRECT);
});

afterEach(async () => {
  nock.cleanAll();
  await rmdir(dirPath, { recursive: true, force: true });
});
afterAll(nock.restore);

describe('Page loader', () => {
  describe('Functionality', () => {
    test('Should work correctly for predefined output folder', async () => {
      const expectedHtml = await readFile(getFixturePath('expected.html'), 'utf8');

      await downloadPage(URL, dirPath);
      const html = await readFile(htmlFilePath, 'utf8');
      const resources = await readdir(fileFolderPath);

      await expect(isExist(htmlFilePath)).resolves.not.toThrow();
      await expect(isExist(fileFolderPath)).resolves.not.toThrow();

      expect(resources.length).toBe(resourcesCount);
      expect(html).toBe(expectedHtml);
    });

    test.each(RESOURCES.map(({ fileName }) => fileName))('Should process %s resource correctly', async (fileName) => {
      const expectedContent = await readFile(getResourcePath(fileName), 'utf8');

      await downloadPage(URL, dirPath);

      const content = await readFile(join(fileFolderPath, fileName), 'utf8');
      expect(content).toBe(expectedContent);
    });
  });

  describe('File system errors', () => {
    test('Should throw EACCES error if folder access is restricted', async () => {
      await expect(downloadPage(URL, '/sys')).rejects.toThrow('EACCES');
    });

    test('Should throw ENOENT error if folder doesn"t exist', async () => {
      await expect(downloadPage(URL, getFixturePath('notExitingFolder'))).rejects.toThrow('ENOENT');
    });

    test('Should throw ENOTDIR error if file provided instead of folder', async () => {
      await expect(downloadPage(URL, getFixturePath('initial.html'))).rejects.toThrow('ENOTDIR');
    });
  });

  describe('Http errors', () => {
    test.each(Object.keys(mapStatusToRoute))('Should return %s http status', async (status) => {
      const url = `${ERROR_URL}/${mapStatusToRoute[status]}`;
      await expect(downloadPage(url, dirPath)).rejects.toThrow(status);
    });
  });
});
