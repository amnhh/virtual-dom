var version = require("./version")

VirtualPatch.NONE = 0
VirtualPatch.VTEXT = 1
VirtualPatch.VNODE = 2
VirtualPatch.WIDGET = 3
VirtualPatch.PROPS = 4
VirtualPatch.ORDER = 5
VirtualPatch.INSERT = 6
VirtualPatch.REMOVE = 7
VirtualPatch.THUNK = 8

module.exports = VirtualPatch

/**
 * patch 类型的构造函数函数
 * @param type
 * @param vNode
 * @param patch
 * @constructor
 */
function VirtualPatch(type, vNode, patch) {
    // 存储 type
    this.type = Number(type)
    // 存储 node
    this.vNode = vNode
    // 存储 patch 结果
    this.patch = patch
}

VirtualPatch.prototype.version = version
VirtualPatch.prototype.type = "VirtualPatch"
