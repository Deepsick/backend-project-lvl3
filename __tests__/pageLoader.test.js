import os from 'os';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import nock from 'nock';
import downloadPage from '../index.js';
import { buildFileFolderPath, buildHtmlPath } from '../src/utils.js';

const {
  mkdtemp,
  rmdir,
  access,
  readdir,
} = fs.promises;
const { constants } = fs;

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const getFixturePath = (fileName) => join(__dirname, '..', '__fixtures__', fileName);
const isExist = (path) => access(path, constants.F_OK | constants.W_OK);

const URL = 'https://example.com';
const ERROR_URL = 'https://error-example.com';
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
  htmlFilePath = buildHtmlPath(dirPath, URL);
  fileFolderPath = buildFileFolderPath(dirPath, URL);

  const resourcesPath = getFixturePath('resources');
  resourcesCount = (await readdir(resourcesPath)).length;
  nock(URL)
    .persist()
    .get('/')
    .replyWithFile(200, getFixturePath('initial.html'))
    .get('/resources/index.js')
    .replyWithFile(200, `${resourcesPath}/index.js`)
    .get('/resources/index.css')
    .replyWithFile(200, `${resourcesPath}/index.css`)
    .get('/resources/img.jpg')
    .replyWithFile(200, `${resourcesPath}/img.jpg`);

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
    await downloadPage(URL, dirPath);
    await expect(isExist(htmlFilePath)).resolves.not.toThrow();
    await expect(isExist(fileFolderPath)).resolves.not.toThrow();
    const resources = await readdir(fileFolderPath);
    expect(resources.length).toBe(resourcesCount);
  });

  describe('File system errors', () => {
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
