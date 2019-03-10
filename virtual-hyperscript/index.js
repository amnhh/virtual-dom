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
    tag = parseTag(tagName, props);

    // support keys
    if (props.hasOwnProperty('key')) {
        key = props.key;
        props.key = undefined;
    }

    // support namespace
    if (props.hasOwnProperty('namespace')) {
        namespace = props.namespace;
        props.namespace = undefined;
    }

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

    transformProperties(props);

    if (children !== undefined && children !== null) {
        addChild(children, childNodes, tag, props);
    }


    return new VNode(tag, props, childNodes, key, namespace);
}

function addChild(c, childNodes, tag, props) {
    if (typeof c === 'string') {
        childNodes.push(new VText(c));
    } else if (typeof c === 'number') {
        childNodes.push(new VText(String(c)));
    } else if (isChild(c)) {
        childNodes.push(c);
    } else if (isArray(c)) {
        for (var i = 0; i < c.length; i++) {
            addChild(c[i], childNodes, tag, props);
        }
    } else if (c === null || c === undefined) {
        return;
    } else {
        throw UnexpectedVirtualElement({
            foreignObject: c,
            parentVnode: {
                tagName: tag,
                properties: props
            }
        });
    }
}

function transformProperties(props) {
    for (var propName in props) {
        if (props.hasOwnProperty(propName)) {
            var value = props[propName];

            if (isHook(value)) {
                continue;
            }

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
