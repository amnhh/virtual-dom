'use strict';

var isArray = require('x-is-array');

var VNode = require('../vnode/vnode.js');
var VText = require('../vnode/vtext.js');
var isVNode = require('../vnode/is-vnode');
var isVText = require('../vnode/is-vtext');
var isWidget = require('../vnode/is-widget');
var isHook = require('../vnode/is-vhook');
var isVThunk = require('../vnode/is-thunk');

var parseTag = require('./parse-tag.js');
var softSetHook = require('./hooks/soft-set-hook.js');
var evHook = require('./hooks/ev-hook.js');

module.exports = h;

/**
 * 创建虚拟dom节点
 * @param tagName
 * @param properties
 * @param children
 * @returns {VirtualNode}
 */
function h(tagName, properties, children) {
    var childNodes = [];
    var tag, props, key, namespace;

    // 兼容 h(tagName, children) 的调用方式
    if (!children && isChildren(properties)) {
        children = properties;
        props = {};
    }

    // 初始化 props
    props = props || properties || {};


    // 把 tag 解析出来
    // props 这个参数，如果说我们没在 h 函数中输入预设 props

    // 1.
    // h 函数中只是单纯的传入 h('span#again')
    // 这里的 parseTag 函数就会输入 (span#again, {})
    // 在完成解析后，tag 变量中保存的会是 span
    // 又因为 props 的对象引用地址被传入了 parseTag 中
    // parseTag 中的改变会直接反映在 props 这个对象中
    // 这时候 props 由一个空对象，进而变成了 { id : 'again' } 这个对象

    // 2.
    // 如果说 h 函数中传入两个相冲的，例如：h('span#again', { id : 'amnhh' })
    // 会以 props 里的为主
    // 只要知道这里是解析出 tag，填充 props 其实就可以了...
    tag = parseTag(tagName, props);


    // 支持 key， namespace 这两个 vnode 函数的特有属性

    // This `key` is not a normal DOM property but is a virtual-dom optimization hint
    // 这个 key 属性并不是一个常规的 dom 属性，但是却是一个虚拟 dom 的检索索引

    // namespace 也不是一个常规的 dom 属性，但是会使 vdom 创建一个带有 namespace 的 vnode

    // support keys
    if (props.hasOwnProperty('key')) {
        // 给 key 赋值，并且将 props 对象中的 key 置空
        // 因为我们设置 key 的本意，并不是为 dom 元素设置一个常规属性 key
        // 而是为了给 dom 元素增加索引，所以 key 属性并不应该出现在 props 这个对象中
        key = props.key;
        props.key = undefined;
    }

    // support namespace
    if (props.hasOwnProperty('namespace')) {
        namespace = props.namespace;
        props.namespace = undefined;
    }

    // 为了兼容与修复的，暂时不看
    // fix cursor bug
    if (tag === 'INPUT' &&
        !namespace &&
        props.hasOwnProperty('value') &&
        props.value !== undefined &&
        !isHook(props.value)
    ) {
        if (props.value !== null && typeof props.value !== 'string') {
            throw UnsupportedValueType({
                expected: 'String',
                received: typeof props.value,
                Vnode: {
                    tagName: tag,
                    properties: props
                }
            });
        }
        props.value = softSetHook(props.value);
    }

    // 主要用来处理 ev- 属性
    // 也就是事件绑定来着
    transformProperties(props);

    // 处理第三个参数 children
    // 修改会直接反应到 childNodes 这个数组中
    // 能 push 进来的，一定是 Vxxxx
    if (children !== undefined && children !== null) {
        addChild(children, childNodes, tag, props);
    }

    // 所以 h 函数只是一个 VNode 的语法糖咯。。。
    // 帮着你调用了一下 VNode 构造函数
    return new VNode(tag, props, childNodes, key, namespace);
}

function addChild(c, childNodes, tag, props) {
    // 会直接改变 childNodes 这个参数所包含的数据
    // 文本与数字直接push VText 进去，因为展示他们就只需要一个 VText
    if (typeof c === 'string') {
        childNodes.push(new VText(c));
    } else if (typeof c === 'number') {
        childNodes.push(new VText(String(c)));
        // 如果说已经是一个 isVNode(x) || isVText(x) || isWidget(x) || isVThunk(x) 的话
        // 则直接 push 到 childNodes 中
        // 因为本身就可以解析了
    } else if (isChild(c)) {
        childNodes.push(c);
    } else if (isArray(c)) {
        // 如果 child 还是一个数组的话，则继续调用 addChild
        for (var i = 0; i < c.length; i++) {
            addChild(c[i], childNodes, tag, props);
        }
    } else if (c === null || c === undefined) {
        return;
    } else {
        // 所有正常的逻辑语句都进不去，那就一定是不正常的了，就抛出一个内部封装的 Error 对象
        throw UnexpectedVirtualElement({
            foreignObject: c,
            parentVnode: {
                tagName: tag,
                properties: props
            }
        });
    }
}

/**
 * 转换 props
 * @param props
 */

function transformProperties(props) {
    // for in + hasOwnProperty, 只检测自有属性
    for (var propName in props) {
        if (props.hasOwnProperty(propName)) {
            var value = props[propName];

            // 如果是 hook，则啥都不做
            if (isHook(value)) {
                continue;
            }

            // 如果是 ev- 开头的属性，则通过 evHook 注册
            if (propName.substr(0, 3) === 'ev-') {
                // add ev-foo support
                props[propName] = evHook(value);
            }
        }
    }
}

/**
 * 检验是否是虚拟 dom 节点
 * @param x
 * @returns {*}
 */

function isChild(x) {

    // isVNode(x) => 直接就已经是一个虚拟dom节点
    // isVText(x) => 直接是一个虚拟的文本节点
    return isVNode(x) || isVText(x) || isWidget(x) || isVThunk(x);
}

/**
 * 校验是否是 h() 中的 children 参数
 * @param x
 * @returns {boolean|*}
 */
function isChildren(x) {
    // x === 'string' => 这个节点就是文本的节点
    // isArray(x) => 一个子节点数组
    // isChild(x) => 一个节点
    return typeof x === 'string' || isArray(x) || isChild(x);
}

/**
 * 一个内部的错误类型
 * 对 error 的 type 以及 message 做了封装
 * @param data
 * @returns {Error}
 * @constructor
 */
function UnexpectedVirtualElement(data) {
    var err = new Error();

    err.type = 'virtual-hyperscript.unexpected.virtual-element';
    err.message = 'Unexpected virtual child passed to h().\n' +
        'Expected a VNode / Vthunk / VWidget / string but:\n' +
        'got:\n' +
        errorString(data.foreignObject) +
        '.\n' +
        'The parent vnode is:\n' +
        errorString(data.parentVnode)
        '\n' +
        'Suggested fix: change your `h(..., [ ... ])` callsite.';
    err.foreignObject = data.foreignObject;
    err.parentVnode = data.parentVnode;

    return err;
}

function UnsupportedValueType(data) {
    var err = new Error();

    err.type = 'virtual-hyperscript.unsupported.value-type';
    err.message = 'Unexpected value type for input passed to h().\n' +
        'Expected a ' +
        errorString(data.expected) +
        ' but got:\n' +
        errorString(data.received) +
        '.\n' +
        'The vnode is:\n' +
        errorString(data.Vnode)
        '\n' +
        'Suggested fix: Cast the value passed to h() to a string using String(value).';
    err.Vnode = data.Vnode;

    return err;
}

function errorString(obj) {
    try {
        return JSON.stringify(obj, null, '    ');
    } catch (e) {
        return String(obj);
    }
}
