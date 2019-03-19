var h = require("../../h.js")
var createElement = require("../../create-element.js")
var test = require("tape")


test('create-element method with ev-test property', function (t) {
    const ospan = h(
        'span#again',
        {
            'ev-test' : function () {
                alert('ev-test')
            },
            anning : 'anning',
            attributes : {
                bless : 'bless'
            }
        }
    )
    createElement(ospan)
    console.log(ospan)
})