import { readFileSync } from 'fs';
import { join, dirname, basename, extname } from 'path';
import globby from 'globby';
import uniq from 'lodash.uniq';
import isRoot from 'path-is-root';
import { chunkName, findJSFile, optsToArray, endWithSlash } from './utils';

export function getStore(cwd, api) {
  const { config, utils } = api;
  const { winPath } = utils;
  const storeJSPath = findJSFile(cwd, 'store');
  if (storeJSPath) {
    return [winPath(storeJSPath)];
  }

  return globby
    .sync(`./${config.singular ? 'store' : 'stores'}/**/*.{ts,tsx,js,jsx}`, {
      cwd,
    })
    .filter(
      p =>
        !p.endsWith('.d.ts') &&
        !p.endsWith('.test.js') &&
        !p.endsWith('.test.jsx') &&
        !p.endsWith('.test.ts') &&
        !p.endsWith('.test.tsx'),
    )
    .map(p => api.utils.winPath(join(cwd, p)));
}

function getStoresWithRoutes(routes, api) {
  const { paths } = api;
  return routes.reduce((memo, route) => {
    return [
      ...memo,
      ...(route.component
        ? getPageStores(join(paths.cwd, route.component), api)
        : []),
      ...(route.routes ? getStoresWithRoutes(route.routes, api) : []),
    ];
  }, []);
}

function getPageStores(cwd, api) {
  let stores = [];
  while (!isPagesPath(cwd, api) && !isSrcPath(cwd, api) && !isRoot(cwd)) {
    stores = stores.concat(getStore(cwd, api));
    cwd = dirname(cwd);
  }
  return stores;
}

function isPagesPath(path, api) {
  const { paths, utils } = api;
  const { winPath } = utils;
  return (
    endWithSlash(winPath(path)) === endWithSlash(winPath(paths.absPagesPath))
  );
}

function isSrcPath(path, api) {
  const { paths, utils } = api;
  const { winPath } = utils;
  return (
    endWithSlash(winPath(path)) === endWithSlash(winPath(paths.absSrcPath))
  );
}

export async function getGlobalStores(api, shouldImportDynamic) {
  const { paths, } = api;
  const routes = await api.getRoutes();
  let stores = getStore(paths.absSrcPath, api);
  // TODO: 获取页面级别的 stores
  // stores = [...stores, ...getStoresWithRoutes(routes, api)];
  // 去重
  stores = uniq(stores);
  return stores;
}

export default function (api) {
  const { paths, cwd, compatDirname, utils } = api;
  const { winPath } = utils;
  const opts = api.userConfig.mobx || {};

  // 配置
  api.describe({
    key: 'mobx',
    config: {
      schema(joi) {
        return joi.object({
          exclude: joi.array(),
        });
      },
    },
  });

  // const isProduction = process.env.NODE_ENV === 'production';
  const shouldImportDynamic = false;

  function getMobxJS() {
    const mobxJS = findJSFile(paths.absSrcPath, 'mobx');
    if (mobxJS) {
      return winPath(mobxJS);
    }
  }

  function getStoreName(store) {
    const storeArr = winPath(store).split('/');
    return storeArr[storeArr.length - 1];
  }

  function exclude(stores = [], excludes) {
    return stores.filter(store => {
      for (const exclude of excludes) {
        if (typeof exclude === 'function' && exclude(getStoreName(store))) {
          return false;
        }
        if (exclude instanceof RegExp && exclude.test(getStoreName(store))) {
          return false;
        }
      }
      return true;
    });
  }

  async function getGlobalStoresFiles() {
    const stores = await getGlobalStores(api, shouldImportDynamic)
    return exclude(
      stores,
      optsToArray(opts.exclude),
    )
      .map(path => ({ name: basename(path, extname(path)), path }))
      .filter(_ => _.name);
  }

  async function getGlobalStoresContent() {
    const globalStores = await getGlobalStoresFiles();
    return globalStores.map(({ name, path }) =>
      `"${name}": types.optional(require('${path}').default,{}),`.trim(),
    ).join('\r\n');
  }

  function generateMobxContainer() {
    const tpl = join(__dirname, '../template/MobxContainer.js');
    const tplContent = readFileSync(tpl, 'utf-8');
    // api.writeTmpFile('MobxContainer.js', tplContent);
    api.writeTmpFile({
      path: 'MobxContainer.js',
      content: tplContent
    })
  }

  async function generateInitMobx() {
    const tpl = join(__dirname, '../template/initMobx.js');
    let tplContent = readFileSync(tpl, 'utf-8');
    const mobxJS = getMobxJS();
    if (mobxJS) {
      tplContent = tplContent.replace(
        '<%= MobxConfigure %>',
        `
        ...((require('${mobxJS}').config || (() => ({})))())
        `.trim(),
      );
    } else {
      tplContent = tplContent.replace(
        '<%= MobxConfigure %>',
        `
        {}
        `.trim(),
      );
    }
    const globalStoresContent = await getGlobalStoresContent()
    tplContent = tplContent.replace(
      '<%= RegisterStores %>',
      globalStoresContent,
    );
    // api.writeTmpFile('initMobx.js', tplContent);
    api.writeTmpFile({
      path: 'initMobx.js',
      content: tplContent
    })
  }

  api.onGenerateFiles({
    fn() {
      generateMobxContainer();
      generateInitMobx();
    }
  })

  api.chainWebpack((config, { webpack, env, createCSSRule }) => {
    [
      {
        name: 'mobx',
        path: require.resolve('mobx'),
      },
      {
        name: 'mobx-react',
        path: require.resolve('mobx-react'),
      },
      {
        name: 'mobx-state-tree',
        path: require.resolve('mobx-state-tree'),
      },
    ].forEach((library) => {
      config.resolve.alias.set(
        library.name,
        library.path,
      );
    })
    return config;
  });
  api.addTmpGenerateWatcherPaths(() => [
    join(paths.absSrcPath, 'stores'),
    join(paths.absSrcPath, 'store.js'),
    join(paths.absSrcPath, 'store.jsx'),
    join(paths.absSrcPath, 'store.ts'),
    join(paths.absSrcPath, 'store.tsx'),
    join(paths.absSrcPath, 'mobx.js'),
    join(paths.absSrcPath, 'mobx.jsx'),
    join(paths.absSrcPath, 'mobx.ts'),
    join(paths.absSrcPath, 'mobx.tsx'),
  ]);
  // api.addPageWatcher([
  //   join(paths.absSrcPath, 'stores'),
  //   join(paths.absSrcPath, 'store.js'),
  //   join(paths.absSrcPath, 'store.jsx'),
  //   join(paths.absSrcPath, 'store.ts'),
  //   join(paths.absSrcPath, 'store.tsx'),
  //   join(paths.absSrcPath, 'mobx.js'),
  //   join(paths.absSrcPath, 'mobx.jsx'),
  //   join(paths.absSrcPath, 'mobx.ts'),
  //   join(paths.absSrcPath, 'mobx.tsx'),
  // ]);
  // Runtime Plugin
  api.addRuntimePlugin(() =>
    [join(__dirname, './runtime')],
  );
  api.addRuntimePluginKey(() => ['mobx']);

  api.addEntryCodeAhead(() =>
    `require('@@/initMobx');`.trim(),
  );

}
