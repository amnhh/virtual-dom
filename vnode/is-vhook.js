module.exports = isHook

function isHook(hook) {
    return hook &&
        // 所以 hook 和 unhook 应该都是在原型链上，hook 应该是一个构造函数的实例
      (
          // hook 属性是 function
          typeof hook.hook === "function"
          // hook并不是自有属性
          && !hook.hasOwnProperty("hook")
          // 或者 unhook 属性是 function
          || typeof hook.unhook === "function"
          // 并且 unhook 并不是自有属性
          && !hook.hasOwnProperty("unhook")
      )
}
