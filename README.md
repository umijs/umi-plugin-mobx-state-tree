# umi-plugin-mobx-state-tree

umi@3 的 mobx 插件。

约定加载 src/stores 下的所有文件(可通过设置 exclude 排除某些文件)

所有store全部加载到统一的store对象上，默认取文件名作为inject查找的对象名。
```
inject(({stores}) => ({
    list: stores.list
}))(observer(App));

注意：这里的list，实际上是stores.stores.list
```

## 快速使用
安装
```
$ npm i umi-plugin-mobx-state-tree
```

## 支持配置

```js
export default {
  mobx: {
    exclude: [/^\$/] //这里是以$开头的stores不会被引用
  }
};
```

exclude:提供 src/stores 下的文件不被注册的功能，比如加上$前缀就不会被注册了,值为正则表达式


## /src/mobx.js
可以通过src/mobx.js配置初始值和开启mobx-react-devtools调试工具
```
export function config() {
  return {
    devTools: true,
    mstTools: false,
    initStores: {
      list: {
        name: "init list name"
      }
    }
  };
}
```
可以通过设置``mstTools: true``开启mobx-devtools-mst，这个功能需要依赖[mobx浏览器调试工具](https://github.com/mobxjs/mobx-devtools/blob/master/README.md#features)使用。

这个配置可以通过runtime修改。

[examples codesandbox](https://codesandbox.io/s/zw15r4yrrl)
