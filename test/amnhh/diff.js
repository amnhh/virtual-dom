var h = require('./../../h');
var diff = require('./../../diff');
var patch = require('./../../patch');
var createElement = require('./../../create-element');

var test = require("tape")


// test('test diff method with main document example', function (t) {
//     function render(count)  {
//         return h('div', {
//             style: {
//                 textAlign: 'center',
//                 lineHeight: (100 + count) + 'px',
//                 border: '1px solid red',
//                 width: (100 + count) + 'px',
//                 height: (100 + count) + 'px'
//             }
//         }, [String(count)]);
//     }
//
//     var count = 0;      // We need some app data. Here we just store a count.
//
//     var tree = render(count);               // We need an initial tree
//     var rootNode = createElement(tree);     // Create an initial root DOM node ...
//     // document.body.appendChild(rootNode);    // ... and it should be in the document
//
//     count++;
//
//     var newTree = render(count);
//     var patches = diff(tree, newTree);
//     rootNode = patch(rootNode, patches);
//     tree = newTree;
//
//     t.end()
// })


test('test diff method with main document example', function (t) {
    const odiv1 = h(
        'div',
        {
            style : {
                width : '100px',
                height : '100px'
            }
        },
        [
            // h(
            //     'div',
            //     {
            //         key : 'anningdiv'
            //     },
            //     '安宁 div'
            // ),
            // h(
            //     'span',
            //     {
            //         key : 'span1'
            //     },
            //     '安宁1'
            // ),
            // h(
            //     'p',
            //     {
            //         key : 'anningp'
            //     },
            //     '安宁 p 标签'
            // )
            h(
                'div',
                {
                    key : 'a'
                },
                'A'
            ),
            h(
                'div',
                {
                    key : 'b'
                },
                'B'
            ),
            h(
                'div',
                {
                    key : 'c'
                },
                'C'
            ),
            h(
                'div',
                {
                    key : 'd'
                },
                'D'
            )
        ]
    )
    const odiv2 = h(
        'div',
        {
            style : {
                width : '200px',
                height : '200px'
            }
        },
        [
            // h(
            //     'p',
            //     {
            //         key : 'anningp'
            //     },
            //     '安宁 p 标签1'
            // ),
            // h(
            //     'span',
            //     {
            //         key : 'span2'
            //     },
            //     '安宁2'
            // ),
            // h(
            //     'div',
            //     {
            //         key : 'anningdiv'
            //     },
            //     '安宁 div'
            // ),
            // h(
            //     'b',
            //     {
            //         key : 'anningb'
            //     },
            //     '安宁 b',
            // )
            h(
                'div',
                {
                    key : 'b'
                },
                'B'
            ),
            h(
                'div',
                {
                    key : 'a'
                },
                'A'
            ),
            h(
                'div',
                {
                    key : 'd'
                },
                'D'
            ),
            h(
                'div',
                {
                    key : 'c'
                },
                'C'
            )
        ]
    )

    const odiv1Node = createElement(odiv1)
    // const odiv2Node = createElement(odiv2)


    const patches = diff(odiv1, odiv2)
    console.log(patches)
})