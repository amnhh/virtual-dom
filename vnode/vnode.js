var version = require("./version")
var isVNode = require("./is-vnode")
var isWidget = require("./is-widget")
var isThunk = require("./is-thunk")
var isVHook = require("./is-vhook")

module.exports = VirtualNode

var noProperties = {}
var noChildren = []

function VirtualNode(tagName, properties, children, key, namespace) {
    // 标签名
    this.tagName = tagName
    // 属性
    this.properties = properties || noProperties
    // 子节点
    this.children = children || noChildren
    // key 必然 string
    this.key = key != null ? String(key) : undefined
    // namespace 也必须 string
    this.namespace = (typeof namespace === "string") ? namespace : null

    // 缓存 children 个数
    var count = (children && children.length) || 0
    var descendants = 0
    var hasWidgets = false
    var hasThunks = false
    var descendantHooks = false
    var hooks

    // 填充 hooks 对象
    for (var propName in properties) {
        // 自有属性 + 是 hook 且 unhook 存在
        if (properties.hasOwnProperty(propName)) {
            var property = properties[propName]
            if (isVHook(property) && property.unhook) {
                if (!hooks) {
                    hooks = {}
                }
                // 将 hooks 全部缓存到 hooks 属性中
                hooks[propName] = property
            }
        }
    }

    // 遍历每个 children
    // 循环的次数就是之前缓存的 children 的个数
    // 这里并没有递归，所以只是遍历一级
    for (var i = 0; i < count; i++) {
        var child = children[i]
        if (isVNode(child)) {
            // descendants 变量用于记录子代的 count 值之和
            // 也就是如果说子代是 vnode 的话，则他本身也可能有 children，而他本身的 count 值为它自己的 children 与他的多级 children 拥有的节点之和
            descendants += child.count || 0

            // 是否含有 widget
            if (!hasWidgets && child.hasWidgets) {
                hasWidgets = true
            }

            // 是否含有 thunks
            if (!hasThunks && child.hasThunks) {
                hasThunks = true
            }

            // 如果说 child hooks 属性为真
            // 代表 child 也具有 hooks => ev-* 属性
            if (!descendantHooks && (child.hooks || child.descendantHooks)) {
                // 就把这个 flag 置为 true
                descendantHooks = true
            }
            // 或者 child 就是一个 widget
        } else if (!hasWidgets && isWidget(child)) {
            if (typeof child.destroy === "function") {
                hasWidgets = true
            }
            // 或者 child 就是一个 chunk
        } else if (!hasThunks && isThunk(child)) {
            hasThunks = true;
        }
    }

    // 这里把自己的 child 个数 count，与自己 children 的拥有的子节点总数相加
    // 得到当前 vnode 总共有的后代节点个数
    // 缓存到实例的 count 属性中
    this.count = count + descendants
    // 当前 vnode 是否含有 widget
    this.hasWidgets = hasWidgets
    // 当前 vnode 是否含有 thunks
    this.hasThunks = hasThunks
    // 当前 vnode 的自有属性中，所有的 hooks 存储到 hooks 属性里
    // 从当前来看，貌似就是 ev-* 属性是 hooks
    this.hooks = hooks
    // 当前的 vnode 后代是否含有 hooks
    this.descendantHooks = descendantHooks
}

// 版本号挂到构造函数原型链上
// 供给每个实例继承
VirtualNode.prototype.version = version

// type 也挂到构造函数的原型链上
// 供给每个实例继承
VirtualNode.prototype.type = "VirtualNode"
