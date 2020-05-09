import { types } from "mobx-state-tree";
import makeInspectable from 'mobx-devtools-mst';
import { ApplyPluginsType } from 'umi';
import { plugin } from './core/umiExports';

const runtimeMobx = plugin.applyPlugins({
  key: 'layout',
  type: ApplyPluginsType.modify,
  initialValue: {},
}) || {};
let config = { <%= MobxConfigure %> } || {}
config = {...config,...(runtimeMobx.config || {})};

const RootStore = types
    .model("RootStore", {
 <%= RegisterStores %>
    })

const mobx_stores = RootStore.create(config.initStores || {});
if(config.mstTools)
makeInspectable(mobx_stores);

window.mobx_app = {
  mobx_stores,
  devTools:config.devTools || false
}
