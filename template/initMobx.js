import { types } from "mobx-state-tree";
import makeInspectable from 'mobx-devtools-mst';

const runtimeMobx = window.g_plugins.mergeConfig('mobx');
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