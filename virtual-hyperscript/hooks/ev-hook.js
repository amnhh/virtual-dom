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
    var es = EvStore(node);
    var propName = propertyName.substr(3);

    es[propName] = this.value;
};

EvHook.prototype.unhook = function(node, propertyName) {
    var es = EvStore(node);
    var propName = propertyName.substr(3);

    es[propName] = undefined;
};
