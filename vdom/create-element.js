var document = require("global/document")

var applyProperties = require("./apply-properties")

var isVNode = require("../vnode/is-vnode.js")
var isVText = require("../vnode/is-vtext.js")
var isWidget = require("../vnode/is-widget.js")
var handleThunk = require("../vnode/handle-thunk.js")

module.exports = createElement

/**
 * 通过 VNode/VText 来创建元素
 * @param vnode
 * @param opts
 * @returns {*}
 */
function createElement(vnode, opts) {
    // 确定 document
    // opts 里配置了 document 则走 opts 里的配置，没有就使用 document
    var doc = opts ? opts.document || document : document
    // opts 里的 warn 取出来
    var warn = opts ? opts.warn : null

    // 这里调用 handleThunk 方法
    // 因为到当前是 vnode，所以啥都没做
    // 执行了 handleThunk 之后，还是一个 vnode，与 chunk 现在没啥关系
    vnode = handleThunk(vnode).a

    // 如果说是一个 widget 的话
    // 则直接调用 vnode.init() 方法，并且 return
    // 现在来看的话应该是 widget 具有一些可以将 vnode => dom 的方法，比如这个 init 方法
    if (isWidget(vnode)) {
        return vnode.init()
        // 如果说是一个文本节点的话
        // 则调用 document.createTextNode
        // 创建一个没有任何标签包裹的文本节点
    } else if (isVText(vnode)) {
        return doc.createTextNode(vnode.text)
        // 剩下的全部都是在执行 vnode => dom 的操作
        // 所以这里检测的是不是 vnode 的时候，会报错出来
        // 并且什么都不反悔
    } else if (!isVNode(vnode)) {
        if (warn) {
            warn("Item is not a valid virtual dom node", vnode)
        }
        return null
    }

    // 这里开始执行 vnode => dom 的操作
    var node = (vnode.namespace === null) ?
        // 没有设置 namespace 的话，则调用 document.createElement 创建标签
        doc.createElement(vnode.tagName) :
        // 设置了 namespace 的话，则会使用 document.createElementNS 来进行创建
        // 这时候 namespace 会是出现在 node.namespaceURI 属性上
        doc.createElementNS(vnode.namespace, vnode.tagName)

    // 取出来 vnode 对象上挂着的 properties
    var props = vnode.properties
    // 将 properties 里的各种属性赋值到 node 上
    // 需要注意的就是
    // 1. style 和 attributes 这两个 propName
    //      这两个属性容易出现对象的 propValue
    //      出现了对象形式的 value 的时候，会遍历这个对象，做特殊的处理
    //      style 的时候简单做一些处理，赋值到 node.style[k] 上
    //      attributes 的时候遍历，对 node 调用 setAttribute 和 removeAttribute 的操作
    // 2. ev-* 的属性
    //      这里我们以 ev-test : function () { alert('ev-test') } 为例
    //      我们先以 node 为参数实例化一个 EvStore 实例
    //      具体实现就是为 node 添加一个属性，名为__EV_STORE_KEY@7，可以通过 node['__EV_STORE_KEY@7'] 来访问到这个 store
    //      然后将 ev-* 的属性去掉前缀为 key，本身的属性值为 value，缓存到 node['__EV_STORE_KEY@7'] 中
    //      最终的效果就是：
    //      propName = 'ev-test', propValue = function () { alert ('ev-test!')}
    //      node['__EV_STORE_KEY@7'][propName.replace(/^ev-/, '')] = propValue
    applyProperties(node, props)

    // 处理 children 属性
    var children = vnode.children

    // 遍历
    for (var i = 0; i < children.length; i++) {
        // 将 children 里的每一项，都调用 createElement 方法
        // 生成了 node 节点，也就是从 vnode 到达了 dom 元素
        // 然后再将生成的 childNode dom 元素，通过 node.appendChild 方法添加到 node 下
        var childNode = createElement(children[i], opts)
        if (childNode) {
            node.appendChild(childNode)
        }
    }

    // 最后 return 包装后的 node[DOM]
    return node
}
