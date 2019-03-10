var h = require("../../h.js")
var test = require("tape")


test('test h method with span#again', function (t) {
    t.plan(2)
    const ospan = h(
        'span#again'
    )

    t.equal(ospan.tagName, 'SPAN')
    t.deepEqual(ospan.properties, { id : 'again' })
})

test('test h method with ("span#again", { id : "amnhh" })', function (t) {

})