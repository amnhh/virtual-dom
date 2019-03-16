var version = require("./version")

module.exports = VirtualText

/**
 * VText 构造函数
 * @param text
 * @constructor
 */
function VirtualText(text) {
    // 只是简单地把 text 变量保存到实例的 text 属性中
    this.text = String(text)
}

// 并给每一个 VText 实例都给予 version 属性和 type 属性
VirtualText.prototype.version = version
VirtualText.prototype.type = "VirtualText"
