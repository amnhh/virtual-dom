var isObject = require("is-object")
var isHook = require("../vnode/is-vhook.js")

module.exports = applyProperties

/**
 * 在 create-element 中，是没有 previous 的，所以我们这里只看前两个参数
 * @param node
 * @param props
 * @param previous
 */

function applyProperties(node, props, previous) {
    // for in 遍历所有 vnode.properties
    for (var propName in props) {
        var propValue = props[propName]

        // 如果说 propValue 为 undefined
        // 则直接 remove
        if (propValue === undefined) {
            removeProperty(node, propName, propValue, previous);
            // 如果说是 hook 的话
        } else if (isHook(propValue)) {
            removeProperty(node, propName, propValue, previous)
            if (propValue.hook) {
                // 为 node 挂载 hook
                // hook 压根就不需要传入第三个参数也...
                // 最后大概就是这样：
                // node[hash][propName.replace(/^ev-/, '')] = propValue
                // 也算是另一方面的绑定了吧...
                // 因为我添加了一个 ev-test
                // 所以此时 node['__EV_STORE_KEY@7'] 这个对象中
                // 多了一个 test 的属性
                // 属性值就是我绑定的函数值
                propValue.hook(node,
                    propName,
                    previous ? previous[propName] : undefined)
            }
        } else {
            // 如果说 node.properties[propName] 是一个对象的话
            // 则对这个对象进行处理
            if (isObject(propValue)) {
                // 多是去对 attributes 和 style 的遍历赋值
                patchObject(node, props, previous, propName, propValue);
            } else {
                // 否则就直接把这个 propName 挂到 node 对象上
                // 例如我传入 { anning : 'anning' }
                // 就会有 node.anning = 'anning'
                node[propName] = propValue
            }
        }
    }
}

/**
 * 2019-3-17
 *
 * 看基本示意，是移除 property
 * 我们在看 applyProperties 时没有 previous，所以这里也么的 previous
 * 所以直接进不到 if 循环
 * 所以直接跳过。。
 *
 * @param node
 * @param propName
 * @param propValue
 * @param previous
 */

function removeProperty(node, propName, propValue, previous) {
    if (previous) {
        var previousValue = previous[propName]

        if (!isHook(previousValue)) {
            if (propName === "attributes") {
                for (var attrName in previousValue) {
                    node.removeAttribute(attrName)
                }
            } else if (propName === "style") {
                for (var i in previousValue) {
                    node.style[i] = ""
                }
            } else if (typeof previousValue === "string") {
                node[propName] = ""
            } else {
                node[propName] = null
            }
        } else if (previousValue.unhook) {
            previousValue.unhook(node, propName, propValue)
        }
    }
}

/**
 * 当 properties 的某个属性，对应的属性值是一个对象的时候
 * 来处理对象
 * 场景就是我们想为 vnode 创建 style/attribute 的时候
 * @param node
 * @param props
 * @param previous
 * @param propName
 * @param propValue
 */
function patchObject(node, props, previous, propName, propValue) {
    var previousValue = previous ? previous[propName] : undefined

    // Set attributes
    // attributes 就是标签上带的那些属性值
    // 通过 h(
    //      'span',
    //      {
    //          attributes : {
    //              bless : 'bless'
    //          }
    //      }
    // )
    // 创建的 vnode，在进行 createElement 的时候就会进入到下面这个逻辑语句中
    if (propName === "attributes") {
        for (var attrName in propValue) {
            var attrValue = propValue[attrName]

            if (attrValue === undefined) {
                node.removeAttribute(attrName)
            } else {
                node.setAttribute(attrName, attrValue)
            }
        }

        return
    }

    if(previousValue && isObject(previousValue) &&
        getPrototype(previousValue) !== getPrototype(propValue)) {
        node[propName] = propValue
        return
    }

    if (!isObject(node[propName])) {
        node[propName] = {}
    }

    // style 也是同理
    // 通过 h(
    //      'span',
    //      {
    //          style : {
    //              color : 'red'
    //          }
    //      }
    // )
    var replacer = propName === "style" ? "" : undefined

    // for in 找出 style 属性的所有元素
    // 然后依次为 node.style['stylePropName'] 进行赋值
    for (var k in propValue) {
        var value = propValue[k]
        node[propName][k] = (value === undefined) ? replacer : value
    }
}

function getPrototype(value) {
    if (Object.getPrototypeOf) {
        return Object.getPrototypeOf(value)
    } else if (value.__proto__) {
        return value.__proto__
    } else if (value.constructor) {
        return value.constructor.prototype
    }
}
