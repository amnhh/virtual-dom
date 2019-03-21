var isObject = require("is-object")
var isHook = require("../vnode/is-vhook")

module.exports = diffProps

function diffProps(a, b) {
    // test/amnhh/diff.js example1
    // 以当前 a,b 的 props 有差异的地方其实就是 height, line-height 以及 width
    // a.style : {
    //      border : '1ps solid red',
    //      height : '100px'
    //      lineHeight : '100px'
    //      width : '100px'
    // }
    // b.style : {
    //      border : '1px solid red',
    //      height : '101px',
    //      lineHeight : '101px',
    //      width : 101px
    // }
    var diff

    for (var aKey in a) {
        // test/amnhh/diff.js example1
        // 此时进来的是 style 属性
        // 如果说当前遍历的属性，b里压根就没有
        // 则 diff 初始化为一个空对象
        // 然后 diff ['style'] 赋值为 undefined
        if (!(aKey in b)) {
            diff = diff || {}
            diff[aKey] = undefined
        }

        // 单独取出来 a[aKey] 和 b[aKey]
        var aValue = a[aKey]
        var bValue = b[aKey]

        // aValue 和 bValue 如果都是普通类型，不是 style ：object 这种对象的话
        // 全等代表一定相等
        // 是对象的话，全等代表引用都相同
        // 所以也不需要什么了，直接跳出这次 for in 循环了

        // 现在diff两者的 style 内容
        // diff 到 border 属性的时候，会进入到这个 if
        // 说明 aValue 和 bValue 完全相同，则啥也不做，也不会往 diff 数组中有任何体现
        if (aValue === bValue) {
            continue
        } else if (isObject(aValue) && isObject(bValue)) {
            // 如果 aValue 和 bValue 的构造函数原型不相同的话
            // 则不需要继续比下去了，这俩完全都不是一个东西
            // 直接把 diff[aKey] 赋值为 bValue
            // 意思就是，diff 的结果是，这个 props ，aKey 属性最终 diff 结束后，目标值是 bValue
            // example 1 的话，都是相同的，aValue 和 bValue 都指向的是 Objet.prototype
            if (getPrototype(bValue) !== getPrototype(aValue)) {
                diff = diff || {}
                diff[aKey] = bValue
                // 如果说 bValue 是 hook
                // 则直接设置最终的 diff 结果为 bValue
            } else if (isHook(bValue)) {
                 diff = diff || {}
                 diff[aKey] = bValue
                // 否则就是两个相同构造函数的 object 之间 diff
            } else {
                // 因为 aValue 和 bValue 都是 object
                // 所以这里我们调用自身 diffProps 去 diff 这两个 object
                // 对每个 key diff，然后总和起来的 diff 结果赋值为 objectDiff
                var objectDiff = diffProps(aValue, bValue)
                if (objectDiff) {
                    diff = diff || {}
                    // objectDiff 存储到 diff[aKey] 中
                    // 将 style 里的全部通过 diffProps diff完成后
                    // 存储到 diff['style'] 中
                    // 此时找到的 objectDiff 就是 { lineHeight : '101px', width: '101px', height: '101px' }
                    diff[aKey] = objectDiff
                }
            }
        } else {
            // 如果说是简单值
            // 或者 aValue 是简单类型，bValue是对象的这种
            // 直接以 bValue 为准
            // 将 bValue 存储到 diff 对象中
            diff = diff || {}
            diff[aKey] = bValue
        }
    }

    for (var bKey in b) {
        if (!(bKey in a)) {
            diff = diff || {}
            diff[bKey] = b[bKey]
        }
    }

    return diff
}

// 获取构造函数的原型
// 各种方法获取23333
function getPrototype(value) {
  if (Object.getPrototypeOf) {
    return Object.getPrototypeOf(value)
  } else if (value.__proto__) {
    return value.__proto__
  } else if (value.constructor) {
    return value.constructor.prototype
  }
}
