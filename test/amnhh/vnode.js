var h = require("../../h.js")
var test = require("tape")


test('vnode constructor', function (t) {
    t.plan(3)

    const ospan = h(
        'span#bar',
        {
            className : 'foo',
            'ev-test' : function () {
                console.log(this)
            }
        },
        [
            h(
                'span',
                'anning1'
            ),
            h(
                'p',
                'anning2'
            )
        ]
    )

    // 先看 count 属性
    // <span class="foo" id="bar">
    //      <span>
    //          anning1
    //      </span>
    //      <p>
    //          anning2
    //      </p>
    // </span>
    // 按我之前看的源码可以看得出， span#bar 的 children 个数为 2
    // span anning1 的 children 个数为1
    // span anning2 的 children 个数为1
    // anning1 这个 TextNode 不为 VNode，所以 descendant 为 0
    // anning2 这个 TextNode 不为 VNode，所以 descendant 为 0
    // 所以 count 为 1
    t.equal(ospan.count, 4)

    // 在看 hooks 属性
    // 我们在 h 函数中可以知道， ev- 属性被注册成了 hooks ，并在原型链中存在 hook 与 unhook 属性
    // ev-test 传入的 value 值，这里也就是回调函数，被存储在了 EvHook 实例的 value 属性中
    // hook() 就会执行 EvStore 实例 hash[property] 的绑定
    // unhook() 则取消绑定
    t.equal(ospan.hooks.hasOwnProperty('ev-test'), true)
    t.equal('hook' in ospan.hooks['ev-test'], true)
})