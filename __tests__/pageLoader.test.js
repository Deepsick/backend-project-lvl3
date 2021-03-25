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
    fileName: 'example-com-img.jpg',
    url: '/resources/img.jpg',
  },
  {
    fileName: 'example-com-index.css',
    url: '/resources/index.css',
  },
  {
    fileName: 'example-com-index.js',
    url: '/resources/index.js',
  },
  {
    fileName: 'example-com-about.html',
    url: '/resources/about',
  },
];

const htmlFileName = 'example-com.html';
const fileFolderName = 'example-com_files';

let dirPath;
let htmlFilePath;
let fileFolderPath;
let resourcesCount;

const mapStatusToRoute = {
  500: 'server-error',
  404: 'not-found',
  401: 'unauthorized',
  400: 'bad',
  403: 'forbidden',
  301: 'redirect',
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
    .replyWithFile(200, getFixturePath('initial.html'));

  RESOURCES.forEach(({ fileName, url }) => {
    nock(URL)
      .persist()
      .get(url)
      .replyWithFile(200, join(resourcesPath, fileName));
  });

  nock(ERROR_URL)
    .persist()
    .get('/server-error')
    .reply(500)
    .get('/not-found')
    .reply(404)
    .get('/unauthorized')
    .reply(401)
    .get('/bad')
    .reply(400)
    .get('/forbidden')
    .reply(403)
    .get('/redirect')
    .reply(301);
});

afterEach(async () => {
  nock.cleanAll();
  await rmdir(dirPath, { recursive: true, force: true });
});
afterAll(nock.restore);

describe('Page loader', () => {
  test('Should work correctly for predefined output folder', async () => {
    const expectedHtml = await readFile(getFixturePath('expected.html'), 'utf8');

    await downloadPage(URL, dirPath);
    const html = await readFile(htmlFilePath, 'utf8');
    const resources = await readdir(fileFolderPath);

    await expect(isExist(htmlFilePath)).resolves.not.toThrow();
    await expect(isExist(fileFolderPath)).resolves.not.toThrow();

    expect(resources.length).toBe(resourcesCount);
    expect(html).toBe(expectedHtml);
    for (const { fileName } of RESOURCES) {
      const content = await readFile(join(fileFolderPath, fileName), 'utf8');
      const expectedContent = await readFile(getResourcePath(fileName), 'utf8');
      expect(content).toBe(expectedContent);
    }
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
