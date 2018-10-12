"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.getStore = getStore;
exports.getGlobalStores = getGlobalStores;
exports.default = _default;

var _fs = require("fs");

var _path = require("path");

var _globby = _interopRequireDefault(require("globby"));

var _lodash = _interopRequireDefault(require("lodash.uniq"));

var _pathIsRoot = _interopRequireDefault(require("path-is-root"));

var _utils = require("./utils");

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function _objectSpread(target) { for (var i = 1; i < arguments.length; i++) { var source = arguments[i] != null ? arguments[i] : {}; var ownKeys = Object.keys(source); if (typeof Object.getOwnPropertySymbols === 'function') { ownKeys = ownKeys.concat(Object.getOwnPropertySymbols(source).filter(function (sym) { return Object.getOwnPropertyDescriptor(source, sym).enumerable; })); } ownKeys.forEach(function (key) { _defineProperty(target, key, source[key]); }); } return target; }

function _defineProperty(obj, key, value) { if (key in obj) { Object.defineProperty(obj, key, { value: value, enumerable: true, configurable: true, writable: true }); } else { obj[key] = value; } return obj; }

function getStore(cwd, api) {
  const config = api.config,
        winPath = api.winPath;
  const storeJSPath = (0, _utils.findJSFile)(cwd, "store");

  if (storeJSPath) {
    return [winPath(storeJSPath)];
  }

  return _globby.default.sync(`./${config.singular ? "store" : "stores"}/**/*.{ts,tsx,js,jsx}`, {
    cwd
  }).filter(p => !p.endsWith(".d.ts") && !p.endsWith(".test.js") && !p.endsWith(".test.jsx") && !p.endsWith(".test.ts") && !p.endsWith(".test.tsx")).map(p => api.winPath((0, _path.join)(cwd, p)));
}

function getStoresWithRoutes(routes, api) {
  const paths = api.paths;
  return routes.reduce((memo, route) => {
    return [...memo, ...(route.component && route.component.indexOf("() =>") !== 0 ? getPageStores((0, _path.join)(paths.cwd, route.component), api) : []), ...(route.routes ? getStoresWithRoutes(route.routes, api) : [])];
  }, []);
}

function getPageStores(cwd, api) {
  let stores = [];

  while (!isPagesPath(cwd, api) && !isSrcPath(cwd, api) && !(0, _pathIsRoot.default)(cwd)) {
    stores = stores.concat(getStore(cwd, api));
    cwd = (0, _path.dirname)(cwd);
  }

  return stores;
}

function isPagesPath(path, api) {
  const paths = api.paths,
        winPath = api.winPath;
  return (0, _utils.endWithSlash)(winPath(path)) === (0, _utils.endWithSlash)(winPath(paths.absPagesPath));
}

function isSrcPath(path, api) {
  const paths = api.paths,
        winPath = api.winPath;
  return (0, _utils.endWithSlash)(winPath(path)) === (0, _utils.endWithSlash)(winPath(paths.absSrcPath));
}

function getGlobalStores(api, shouldImportDynamic) {
  const paths = api.paths,
        routes = api.routes;
  let stores = getStore(paths.absSrcPath, api);

  if (!shouldImportDynamic) {
    // 不做按需加载时，还需要额外载入 page 路由的 stores 文件
    stores = [...stores, ...getStoresWithRoutes(routes, api)]; // 去重

    stores = (0, _lodash.default)(stores);
  }

  return stores;
}

function _default(api, opts = {}) {
  const paths = api.paths,
        cwd = api.cwd,
        compatDirname = api.compatDirname,
        winPath = api.winPath;
  const isProduction = process.env.NODE_ENV === "production";
  const shouldImportDynamic = isProduction && opts.dynamicImport;

  function getMobxJS() {
    const mobxJS = (0, _utils.findJSFile)(paths.absSrcPath, "mobx");

    if (mobxJS) {
      return winPath(mobxJS);
    }
  }

  function getStoreName(store) {
    const storeArr = winPath(store).split("/");
    return storeArr[storeArr.length - 1];
  }

  function exclude(stores, excludes) {
    return stores.filter(store => {
      var _iteratorNormalCompletion = true;
      var _didIteratorError = false;
      var _iteratorError = undefined;

      try {
        for (var _iterator = excludes[Symbol.iterator](), _step; !(_iteratorNormalCompletion = (_step = _iterator.next()).done); _iteratorNormalCompletion = true) {
          const exclude = _step.value;

          if (typeof exclude === "function" && exclude(getStoreName(store))) {
            return false;
          }

          if (exclude instanceof RegExp && exclude.test(getStoreName(store))) {
            return false;
          }
        }
      } catch (err) {
        _didIteratorError = true;
        _iteratorError = err;
      } finally {
        try {
          if (!_iteratorNormalCompletion && _iterator.return != null) {
            _iterator.return();
          }
        } finally {
          if (_didIteratorError) {
            throw _iteratorError;
          }
        }
      }

      return true;
    });
  }

  function getGlobalStoresFiles() {
    return exclude(getGlobalStores(api, shouldImportDynamic), (0, _utils.optsToArray)(opts.exclude)).map(path => ({
      name: (0, _path.basename)(path, (0, _path.extname)(path)),
      path
    })).filter(_ => _.name);
  }

  function getGlobalStoresContent() {
    return getGlobalStoresFiles().map(({
      name,
      path
    }) => `"${name}": types.optional(require('${path}').default,{}),`.trim()).join("\r\n");
  }

  function generateMobxContainer() {
    const tpl = (0, _path.join)(__dirname, "../template/MobxContainer.js");
    const tplContent = (0, _fs.readFileSync)(tpl, "utf-8");
    api.writeTmpFile("MobxContainer.js", tplContent);
  }

  function generateInitMobx() {
    const tpl = (0, _path.join)(__dirname, "../template/initMobx.js");
    let tplContent = (0, _fs.readFileSync)(tpl, "utf-8");
    const mobxJS = getMobxJS();

    if (mobxJS) {
      tplContent = tplContent.replace("<%= MobxConfigure %>", `
        ...((require('${mobxJS}').config || (() => ({})))())
        `.trim());
    } else {
      tplContent = tplContent.replace("<%= MobxConfigure %>", `
        {}
        `.trim());
    }

    tplContent = tplContent.replace("<%= RegisterStores %>", getGlobalStoresContent());
    api.writeTmpFile("initMobx.js", tplContent);
  }

  api.onGenerateFiles(() => {
    generateMobxContainer();
    generateInitMobx();
  });

  if (shouldImportDynamic) {
    api.addRouterImport({
      source: "umi-plugin-mobx-state-tree/dynamic",
      specifier: "_mobxDynamic"
    });
  }

  if (shouldImportDynamic) {
    api.modifyRouteComponent((memo, args) => {
      const importPath = args.importPath,
            webpackChunkName = args.webpackChunkName;

      if (!webpackChunkName) {
        return memo;
      }

      if (opts.dynamicImport.loadingComponent) {
        loadingOpts = `LoadingComponent: require('${winPath((0, _path.join)(paths.absSrcPath, opts.dynamicImport.loadingComponent))}').default,`;
      }

      let extendStr = "";

      if (opts.dynamicImport.webpackChunkName) {
        extendStr = `/* webpackChunkName: ^${webpackChunkName}^ */`;
      }

      let ret = `
      _mobxDynamic({
  <%= MODELS %>
        component: () => import(${extendStr}'${importPath}'),
      })
      `.trim();
      const stores = getPageStores((0, _path.join)(paths.absTmpDirPath, importPath), api).map(path => ({
        name: (0, _path.basename)(path, (0, _path.extname)(path)),
        path
      })).filter(_ => _.name);

      if (stores && stores.length) {
        ret = ret.replace("<%= MODELS %>", `
          stores: ${stores},
          `.trim());
      }

      return ret.replace("<%= MODELS %>", "");
    });
  }

  const mobxDir = compatDirname("mobx/package.json", cwd, (0, _path.dirname)(require.resolve("mobx/package.json")));
  api.addVersionInfo([`mobx@${require((0, _path.join)(mobxDir, "package.json")).version} (${mobxDir})`, `mobx-react@${require("mobx-react/package").version}`, `mobx-state-tree@${require("mobx-state-tree/package").version}`]);
  api.modifyAFWebpackOpts(memo => {
    const alias = _objectSpread({}, memo.alias, {
      mobx: require.resolve("mobx"),
      "mobx-react": require.resolve("mobx-react"),
      "mobx-state-tree": require.resolve("mobx-state-tree")
    });

    return _objectSpread({}, memo, {
      alias
    });
  });
  api.addPageWatcher([(0, _path.join)(paths.absSrcPath, "stores"), (0, _path.join)(paths.absSrcPath, "store.js"), (0, _path.join)(paths.absSrcPath, "store.jsx"), (0, _path.join)(paths.absSrcPath, "store.ts"), (0, _path.join)(paths.absSrcPath, "store.tsx"), (0, _path.join)(paths.absSrcPath, "mobx.js"), (0, _path.join)(paths.absSrcPath, "mobx.jsx"), (0, _path.join)(paths.absSrcPath, "mobx.ts"), (0, _path.join)(paths.absSrcPath, "mobx.tsx")]);
  api.addRuntimePlugin((0, _path.join)(__dirname, "./runtime"));
  api.addRuntimePluginKey("mobx");
  api.addEntryCodeAhead(`
require('@tmp/initMobx');
  `.trim());
}