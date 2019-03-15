var h = require("../../h.js")
var test = require("tape")


test('test h method with span#again', function (t) {
    t.plan(2)
    const ospan = h(
        'span#again'
    )

    // tagName 解析出来都是大写
    t.equal(ospan.tagName, 'SPAN')
    // 从 tagName 中解析除了 id
    // 并写入 properties 属性中
    t.deepEqual(ospan.properties, { id : 'again' })
})

test('test h method with ("span#again", { id : "amnhh" })', function (t) {
    t.plan(1)

    const ospan = h(
        'span#again',
        {
            id : 'amnhh'
        }
    )

    // 在 tagName 与 properties 中同时存在 id 的时候
    // 以后者为主
    t.deepEqual(ospan.properties, { id : 'amnhh' })
})