var isArray = require("x-is-array")

var VPatch = require("../vnode/vpatch")
var isVNode = require("../vnode/is-vnode")
var isVText = require("../vnode/is-vtext")
var isWidget = require("../vnode/is-widget")
var isThunk = require("../vnode/is-thunk")
var handleThunk = require("../vnode/handle-thunk")

var diffProps = require("./diff-props")

module.exports = diff

/**
 * 主要 method 就是这个 diff
 * 其他的几百行代码全都在给这个 walk 函数服务。。
 * @param a
 * @param b
 * @returns {{a : *}}
 *
 * 这里我们以文档中的， diff(tree, newTree) 来看
 */
function diff(a, b) {
    // 这里把 tree 处理成 patch = { a : tree } 的形式
    // 感觉这个 patch 变量，是用来存储 diff 的结果的
    // 然后 diff 结果不会污染 a 和 b ，只会体现在这个 patch 中
    var patch = { a: a }
    // index 参数直接成 0
    // 带着 patch 引用传入 walk 函数，在 walk 函数中修改 patch 的内容
    walk(a, b, patch, 0)
    return patch
}

/**
 * diff 的主要方法
 * @param a
 * @param b
 * @param patch
 * @param index
 */
function walk(a, b, patch, index) {
    // 如果 a 和 b 两个引用都完全相同
    // 直接啥都不做
    // 对 patch 也啥都不做，直接终结
    if (a === b) {
        return
    }

    var apply = patch[index]
    var applyClear = false

    // 由于我们入参是 tree 和 newTree
    // 都是 h 函数直接返回的 VNode
    // 所以直接跳过 isThunk 还有 b == null 的环节
    if (isThunk(a) || isThunk(b)) {
        thunks(a, b, patch, index)
    } else if (b == null) {

        // If a is a widget we will add a remove patch for it
        // Otherwise any child widgets/hooks must be destroyed.
        // This prevents adding two remove patches for a widget.
        if (!isWidget(a)) {
            clearState(a, patch, index)
            apply = patch[index]
        }

        apply = appendPatch(apply, new VPatch(VPatch.REMOVE, a, b))
        // 如果说 b 是一个 VNode
    } else if (isVNode(b)) {
        // 直接进入到 a, b 都是 VNode 的环节
        if (isVNode(a)) {
            // 如果是相同标签，相同 namespace，相同 key
            // 这特么也太严格了...
            // 感觉上应该是一种提升性能的体现
            // 直接调用 appendPatch 应该也是 ok 的
            // 但是如果说都满足的话，可以大量的节省时间
            // emmm... 这暂时只是个猜想
            if (
                a.tagName === b.tagName
                && a.namespace === b.namespace
                && a.key === b.key
            ) {
                // tagName，namespace，key都相同的话，说明可以认为是一个元素
                // 则我们不会去增减这个元素，只需要 diff props 看看是否需要更改就完事了
                // 对 properties 这个对象进行 diff
                // 以 test example1 为例的话
                // 这里就会返回： { style : { lineHeight : '101px', width: '101px', height: '101px' } }
                var propsPatch = diffProps(a.properties, b.properties)
                if (propsPatch) {
                    // 这里我们只修改了 props
                    // 所以 apply 被赋值为了一个 VPatch 的实例
                    // 这个 VPatch实例中，
                    // type 参数传入的是 VPatch.PROPS, 也就是只是修改了属性 props
                    // vNode 参数传入的是 a, 也就是我们老的那个 DOM 对象，即要发生改变的那个 DOM
                    // patch 参数传入的是 propsDiff 的结果，这里就是 { style : { lineHeight : '101px', width: '101px', height: '101px' } }
                    // 此时 apply 其实就是我们 appendPatch 里说的，patch1
                    // 这时候 apply 就被赋值成了 {type : 4, vNode : a, patch : {style : { lineHeight : '101px', width: '101px', height: '101px' }}}
                    apply = appendPatch(apply,
                        new VPatch(VPatch.PROPS, a, propsPatch))
                }
                // 接下来就进入到 children 的 diff
                // 我们的两个 div 同时拥有着一个 VText 节点
                apply = diffChildren(a, b, patch, apply, index)
            } else {
                apply = appendPatch(apply, new VPatch(VPatch.VNODE, a, b))
                applyClear = true
            }
        } else {
            apply = appendPatch(apply, new VPatch(VPatch.VNODE, a, b))
            applyClear = true
        }
    } else if (isVText(b)) {
        if (!isVText(a)) {
            apply = appendPatch(apply, new VPatch(VPatch.VTEXT, a, b))
            applyClear = true
        } else if (a.text !== b.text) {
            apply = appendPatch(apply, new VPatch(VPatch.VTEXT, a, b))
        }
    } else if (isWidget(b)) {
        if (!isWidget(a)) {
            applyClear = true
        }

        apply = appendPatch(apply, new VPatch(VPatch.WIDGET, a, b))
    }

    if (apply) {
        patch[index] = apply
    }

    if (applyClear) {
        clearState(a, patch, index)
    }
}

function diffChildren(a, b, patch, apply, index) {
    var aChildren = a.children
    var orderedSet = reorder(aChildren, b.children)
    // 这里 aChildren还是 aChildren
    // bChildren 已经变成了将 aChildren,bChildren 两个一级 diff 之后的结果
    var bChildren = orderedSet.children

    var aLen = aChildren.length
    var bLen = bChildren.length
    // 按多的来。。
    var len = aLen > bLen ? aLen : bLen

    for (var i = 0; i < len; i++) {
        var leftNode = aChildren[i]
        var rightNode = bChildren[i]
        index += 1

        if (!leftNode) {
            // 如果 leftNode 不村子啊
            // 就全都是新添加 rightNode 了
            if (rightNode) {
                // Excess nodes in b need to be added
                apply = appendPatch(apply,
                    new VPatch(VPatch.INSERT, null, rightNode))
            }
        } else {
            walk(leftNode, rightNode, patch, index)
        }

        if (isVNode(leftNode) && leftNode.count) {
            index += leftNode.count
        }
    }

    if (orderedSet.moves) {
        // Reorder nodes last
        apply = appendPatch(apply, new VPatch(
            VPatch.ORDER,
            a,
            orderedSet.moves
        ))
    }

    return apply
}

function clearState(vNode, patch, index) {
    // TODO: Make this a single walk, not two
    unhook(vNode, patch, index)
    destroyWidgets(vNode, patch, index)
}

// Patch records for all destroyed widgets must be added because we need
// a DOM node reference for the destroy function
function destroyWidgets(vNode, patch, index) {
    if (isWidget(vNode)) {
        if (typeof vNode.destroy === "function") {
            patch[index] = appendPatch(
                patch[index],
                new VPatch(VPatch.REMOVE, vNode, null)
            )
        }
    } else if (isVNode(vNode) && (vNode.hasWidgets || vNode.hasThunks)) {
        var children = vNode.children
        var len = children.length
        for (var i = 0; i < len; i++) {
            var child = children[i]
            index += 1

            destroyWidgets(child, patch, index)

            if (isVNode(child) && child.count) {
                index += child.count
            }
        }
    } else if (isThunk(vNode)) {
        thunks(vNode, null, patch, index)
    }
}

// Create a sub-patch for thunks
function thunks(a, b, patch, index) {
    var nodes = handleThunk(a, b)
    var thunkPatch = diff(nodes.a, nodes.b)
    if (hasPatches(thunkPatch)) {
        patch[index] = new VPatch(VPatch.THUNK, null, thunkPatch)
    }
}

function hasPatches(patch) {
    for (var index in patch) {
        if (index !== "a") {
            return true
        }
    }

    return false
}

// Execute hooks when two nodes are identical
function unhook(vNode, patch, index) {
    if (isVNode(vNode)) {
        if (vNode.hooks) {
            patch[index] = appendPatch(
                patch[index],
                new VPatch(
                    VPatch.PROPS,
                    vNode,
                    undefinedKeys(vNode.hooks)
                )
            )
        }

        if (vNode.descendantHooks || vNode.hasThunks) {
            var children = vNode.children
            var len = children.length
            for (var i = 0; i < len; i++) {
                var child = children[i]
                index += 1

                unhook(child, patch, index)

                if (isVNode(child) && child.count) {
                    index += child.count
                }
            }
        }
    } else if (isThunk(vNode)) {
        thunks(vNode, null, patch, index)
    }
}

function undefinedKeys(obj) {
    var result = {}

    for (var key in obj) {
        result[key] = undefined
    }

    return result
}

// List diff, naive left to right reordering
/**
 * 重新排序
 * @param aChildren
 * @param bChildren
 * @returns {*}
 */
function reorder(aChildren, bChildren) {
    // O(M) time, O(M) memory
    var bChildIndex = keyIndex(bChildren)
    var bKeys = bChildIndex.keys
    var bFree = bChildIndex.free

    // 如果说 bChildren 里面，全都是没有 key 标示的节点的话
    // 则直接返回 { children : bChildren, moves : null }
    if (bFree.length === bChildren.length) {
        return {
            children: bChildren,
            moves: null
        }
    }

    // O(N) time, O(N) memory
    var aChildIndex = keyIndex(aChildren)
    var aKeys = aChildIndex.keys
    var aFree = aChildIndex.free

    // 如果说 a 节点里，也全都是没有 key 标示的节点的话
    // 直接返回 { children : bChildren, moves : null }
    // a 或者 b 任何一方的子节点里，没有 key 的话
    // 在这里都会直接返回 { children : bChildren, moves : null }, 摒弃 a 的，而只留下 b 的
    if (aFree.length === aChildren.length) {
        return {
            children: bChildren,
            moves: null
        }
    }

    // O(MAX(N, M)) memory
    var newChildren = []

    var freeIndex = 0
    // b的 children 里面，没有 key 值的节点的个数赋值为 freeCount
    var freeCount = bFree.length
    // 删除掉的节点的个数
    var deletedItems = 0

    // 想要看下面的这些，我们的 test example1 就不得行了
    // 将端点打在 test example2 上
    // 这个 for 循环中，会处理完全部的 a 中的元素
    // 1.
    // 如果说 a 中的元素，存在 key，则会匹配 b 元素的 key 的 key 列表里面是否有同名的 key
    // 如果说有同名的 key，则会将两者匹配，并且将 b 中的同名 key 元素，push 到 newChildren 中
    // 如果说没有同名的 key，则会丢弃 a 中的这个元素，并且向 newChildren 中 push null 占位
    // 2.
    // 如果说 a 中的元素没有存在 key，当前的 a.children 的这个元素被称为 free item
    // 这时候这个 a 中的 free item 无论如何都不会被 push 到 newChildren 中，会被完全舍弃掉
    // 填补他空位的是 b 中的 free item
    //      1> 如果说此时 b 中的 freeItem 还没有完全 push 到 newChildren 中，就会从 b 的 freeitem 的列表中，取出来一个，push 到 newChildren 数组中
    //      2> 如果说当前 newChildren 中的 freeItem 的个数已经超过了 b.children 中的 freeItem 的个数，则 a 里的 freeItem 会被舍弃
    //      3> 规则其实就是 newChildren 中的 freeItem 的个数永远不会超过 bFree 的长度
    // Iterate through a and match a node in b
    // O(N) time,
    for (var i = 0 ; i < aChildren.length; i++) {
        var aItem = aChildren[i]
        var itemIndex

        // 如果说这里 aItem 有 key 的话
        if (aItem.key) {
            // 并且 bKeys 也含有相同的 key
            // 则匹配以前旧的那个 keys
            if (bKeys.hasOwnProperty(aItem.key)) {
                // Match up the old keys
                // 将这个两者都有的 key 的 idx 取出来
                // 这时候这个 itemIndex 就是 b 的 children 里面
                // 拥有这个 key 的元素的索引
                itemIndex = bKeys[aItem.key]
                // 新的子节点的列表中 push 进去拥有这个 key 的元素
                // 这里 bChildren[itemIndex] 访问到的，就是 b 子节点列表中含有相同 key 的元素
                newChildren.push(bChildren[itemIndex])
            } else {
                // 但是如果说 b 里面，没有相同 key 的元素的话
                // 删除这个节点
                // 向新的子节点数组 newChildren 中 push null
                // 这里的 null 应该是个占位的....
                // Remove old keyed items
                itemIndex = i - deletedItems++
                newChildren.push(null)
            }
            // 如果说 aItem 没有 key 属性的话
            // 则这个 aItem 是一个 free item
        } else {
            // Match the item in a with the next free item in b
            if (freeIndex < freeCount) {
                // 则这个节点会匹配到在 b.children 中
                // 第 freeIndex 个 free item
                // 这里的限制就是，freeIndex 必须不能 >= freeCount
                // 也就是说 newChildren 中的 free item 个数，不能超过原有的 b.children 中的 freeItem 个数
                // 通过维护 freeIndex 这个顺序
                // 来依次的去读取 b.children 里面的每个 free item
                // 然后向 newChildren 中 push
                itemIndex = bFree[freeIndex++]
                newChildren.push(bChildren[itemIndex])
            } else {
                // There are no free items in b to match with
                // the free items in a, so the extra free nodes
                // are deleted.
                // 如果说这时候 b 中所有的 free item 名额都被用了
                // 则其他的 free item 会被删除掉
                itemIndex = i - deletedItems++
                // 以 null 占个坑位
                newChildren.push(null)
            }
        }
    }

    // 确定 lastFreeIndex
    // 1.
    // 如果说此时 freeIndex >= bFree.length
    // 说此时 newChildren 中的 freeItem 个数超过了 b.children 中的 freeItem 的个数
    // 就将 lastFreeIndex 设置为 bChildren.length
    // 2.
    // 如果说此时 freeIndex < bFree.length
    // 则说明此时遍历完了 a.children 之后，b 中还存在着 freeItem
    // 就通过 bFree[freeIndex] 来找到当前的 b 中排序最靠前的、还没有被 push 到 newChildren 中的那个 freeItem 的 index
    // 赋值给 lastFreeIndex
    var lastFreeIndex = freeIndex >= bFree.length ?
        bChildren.length :
        bFree[freeIndex]

    // Iterate through b and append any new keys
    // O(M) time
    // 到现在为止，b.children 是一点都没有被 remove 的
    // 也就是说，我们虽然往 newChildren 中 push 过 b 的 freeItem，或者是 b 与 a 同 key 的 item
    // 但是我们其实是没有 remove 过 bChildren 的元素的
    // 所以这里还是会执行 M 次，也就是上面作者注释的 O(M) time
    for (var j = 0; j < bChildren.length; j++) {
        var newItem = bChildren[j]

        // 现在我们遍历 b 中的元素
        // 如果说 b 中的这个元素，含有 key 属性
        if (newItem.key) {
            // 且这个 key 在 a 中不存在同名的 key 的话
            // 就把这个元素 push 到 newChildren 中
            // 因为刚刚同名 key 的那个 item。。已经被 push 进去了的。。
            if (!aKeys.hasOwnProperty(newItem.key)) {
                // Add any new keyed items
                // We are adding new items to the end and then sorting them
                // in place. In future we should insert new items in place.
                newChildren.push(newItem)
            }
            // 否则的话则 b 的当前元素，是一个 freeItem
            // 如果说这个 freeItem 还没有被 push 到 newChildren 数组中的话
            // 就 push 进去
        } else if (j >= lastFreeIndex) {
            // Add any leftover non-keyed items
            newChildren.push(newItem)
        }
    }
    // 截止到这一步，我们 newChildren 中包含的元素，是：
    // 1. a, b 中含有同名 key 的 b.children 的元素，
    //      比如 a.children = [ {key : 'span', name : 'aItem1'} ], b.children = [ { key : 'span', name : "bItem1'} ]
    //      此时 newChildren 中会包含 [{ key : 'span', name : "bItem1'}]
    // 2. aFree.length 个 b.children 中的 freeItem
    //      因为a 中的 freeItem 会被全部丢弃，但是丢弃一个，就会向 newChildren 中 push 一个 b 的 freeItem
    // 3. bItem 中，含有 key 的，并且还没有在 newChildren 中的元素
    // 4. 如果说此时 newChildren 中的 freeItem 个数 <= b.children 中的 freeItem 的个数，则会补足 bFree 中的其他的 freeItem
    //      就是说如果说 newChildren 现在拥有 [..., bFreeItem1, bFreeItem2, ...]
    //      而 bFree 中含有 [bFreeItem1, bFreeItem2, bFreeItem3, bFreeItem4]
    //      则会把 bFreeItem3, bFreeItem4 依次 push 到 newChildren 中

    // 浅拷贝一个 newChildren
    // 相当于 var simulate = [...newChildren]
    var simulate = newChildren.slice()
    var simulateIndex = 0
    var removes = []
    var inserts = []
    var simulateItem

    for (var k = 0; k < bChildren.length;) {
        var wantedItem = bChildren[k]
        simulateItem = simulate[simulateIndex]

        // remove items
        // 删除 simulate 前面的 null 元素
        // 类似将 simulate [null, null, null, simulateItem1, simulateItem2] 处理成 [simulateItem1, simulateItem2]
        // 删除靠前的 null
        // removes 记录了为 null 的 index， remove 元素现在长这样： { from : index, key : null }
        while (simulateItem === null && simulate.length) {
            removes.push(remove(simulate, simulateIndex, null))
            simulateItem = simulate[simulateIndex]
        }

        // 如果说当前 simulateItem 是 null => 这就说明 simulate 全是 null，刚才的 newChildren 里面全是 null
        // 或这 simulateItem 的 key 不等于 b[i].key
        if (!simulateItem || simulateItem.key !== wantedItem.key) {
            // if we need a key in this position...
            // 如果说 b[i] 这个 item 有 key
            if (wantedItem.key) {
                // 如果说这个 simulateItem 也有 key, 并且两者的 key 不相同
                if (simulateItem && simulateItem.key) {
                    // if an insert doesn't put this key in place, it needs to move
                    // 如果说 wantedItem.key 和 simulateItem.key 都有值，且不相等
                    // 而且 simulateItem.key 不排在 wantedItem.key 的后面
                    // 也就是说用简单的 insert 解决不了问题，就需要移动
                    if (bKeys[simulateItem.key] !== k + 1) {
                        removes.push(remove(simulate, simulateIndex, simulateItem.key))
                        simulateItem = simulate[simulateIndex]
                        // if the remove didn't put the wanted item in place, we need to insert it
                        // 如果说 remove 掉这个simulateItem还是不能够让顺序相同
                        // 则我们需要 insert
                        if (!simulateItem || simulateItem.key !== wantedItem.key) {
                            inserts.push({key: wantedItem.key, to: k})
                        }
                        // items are matching, so skip ahead
                        else {
                            simulateIndex++
                        }
                    }
                    else {
                        // 就往 inserts 里面 push { key : wantedItem.key, to : key }
                        // 按 key 和 to 的语义上来讲，应该是说
                        // insert 中 push 的，在第 k 个位置上的元素，放置 key 为 wantedItem.key
                        // 和下边的一样
                        inserts.push({key: wantedItem.key, to: k})
                    }
                }
                // 如果说这个 simulateItem 没有 key
                else {
                    // 就往 inserts 里面 push { key : wantedItem.key, to : key }
                    // 按 key 和 to 的语义上来讲，应该是说
                    // insert 中 push 的，在第 k 个位置上的元素，放置 key 为 wantedItem.key
                    //
                    inserts.push({key: wantedItem.key, to: k})
                }
                k++
            }
            // a key in simulate has no matching wanted key, remove it
            else if (simulateItem && simulateItem.key) {
                removes.push(remove(simulate, simulateIndex, simulateItem.key))
            }
        }
        else {
            simulateIndex++
            k++
        }
    }

    // remove all the remaining nodes from simulate
    while(simulateIndex < simulate.length) {
        simulateItem = simulate[simulateIndex]
        removes.push(remove(simulate, simulateIndex, simulateItem && simulateItem.key))
    }

    // If the only moves we have are deletes then we can just
    // let the delete patch remove these items.
    if (removes.length === deletedItems && !inserts.length) {
        return {
            children: newChildren,
            moves: null
        }
    }

    return {
        children: newChildren,
        moves: {
            removes: removes,
            inserts: inserts
        }
    }
}

/**
 * 删除数组的元素，并且返回 { from : 删除位置, key : key }
 * @param arr
 * @param index
 * @param key
 * @returns {{from : *, key : *}}
 */
function remove(arr, index, key) {
    arr.splice(index, 1)

    return {
        from: index,
        key: key
    }
}

function keyIndex(children) {
    // keys 为 children 中所有含有 key 的节点的索引的集合
    // 是一个对象
    // 以 dom 节点的 key 属性为keys对象的 key，dom 对象位于当前 children 数组的 index 为 keys 对象的value
    var keys = {}
    // free 为 children 中所有没有含有 key 的节点的索引的集合
    // 需要注意的是，这里的都是索引
    // 没有把真实的 dom 对象放入到 keys 或者说放入 free
    var free = []
    var length = children.length

    for (var i = 0; i < length; i++) {
        var child = children[i]

        // 以节点是否含有 key 来区分
        // 有 key 的就往 keys 里放
        // 没 key 的就往 free 里push
        if (child.key) {
            keys[child.key] = i
        } else {
            free.push(i)
        }
    }

    // 最后返回这两个集合
    // keys 里保存的一个哈希表，{ [key name] : index }
    // free 里保存着一个数组，[unkeyed item1, unkeyed item2, unkeyed item3]
    return {
        keys: keys,     // A hash of key name to index
        free: free      // An array of unkeyed item indices
    }
}

/**
 * 生成一个 patch 的栈
 * 第一次调用 apply 为 undefined，patch 为 patch1
 * 如果说 apply 当前为空的话，则直接返回 patch
 * 在函数调用外侧会用 apply 接收
 *
 * 在第二次调用的时候，apply 为 patch1， patch 为 patch2
 * 此时进入到了 if (apply) { if xxx else {  } } 的 else 逻辑中，直接被返回成了 [patch1, patch2]
 *
 * 第三次调用的时候，apply 为 [patch1, patch2], patch 为 patch3
 * 此时直接执行到了 if (apply) { if (isArray) {} } 这个 if 中，外部赋值的 apply 就变成了 [patch1, patch2, patch3]
 *
 * @param apply
 * @param patch
 * @returns {*}
 */
function appendPatch(apply, patch) {
    if (apply) {
        if (isArray(apply)) {
            apply.push(patch)
        } else {
            apply = [apply, patch]
        }

        return apply
    } else {
        return patch
    }
}
