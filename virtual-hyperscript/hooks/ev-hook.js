'use strict';

var EvStore = require('ev-store');

module.exports = EvHook;

// 事件钩子构造函数
function EvHook(value) {
    // 必须以构造函数方式调用 EvHook 函数
    // 否则就我帮你调用。。
    if (!(this instanceof EvHook)) {
        return new EvHook(value);
    }

    // 将 value 的值存储到实例上
    this.value = value;
}

EvHook.prototype.hook = function (node, propertyName) {
    // 为 node 注册一个 evStore 专属的 hash 属性
    // 也就是 node[hash]
    // hash 为 __EV_STORE_KEY@7
    // 所以 node 现在多了一个 node['__EV_STORE_KEY@7'] 的属性
    var es = EvStore(node);
    // 把 propName 的 ev- 前缀去掉
    var propName = propertyName.substr(3);

    // node[hash][propname] = (ev-* 的属性值)
    es[propName] = this.value;
};

EvHook.prototype.unhook = function(node, propertyName) {
    // 取出来 node[hash]
    var es = EvStore(node);
    // 解析出来对应 hook 的 namespace
    var propName = propertyName.substr(3);

    // 置空
    es[propName] = undefined;
};
