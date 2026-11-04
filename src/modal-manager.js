// ═════════════════════════════════════════════════════════════════════════
// OrangeVerse UI & Modal Orchestrator (集中弹窗与交互状态调度器)
// ═════════════════════════════════════════════════════════════════════════

class ModalManager {
  constructor() {
    this.modals = new Map();
    this.stack = [];
    this.events = new Map();

    // 1. 全局监听 ESC 键，精准从栈顶逐层收起活跃弹窗
    window.addEventListener("keydown", (e) => {
      if (e.key === "Escape" && this.stack.length > 0) {
        e.preventDefault();
        this.closeTop();
      }
    });

    // 2. 全局声明式属性委托：支持 [data-open-modal="xxx"] 和 [data-close-modal="xxx"]
    document.addEventListener("click", (e) => {
      const openTrigger = e.target.closest("[data-open-modal]");
      if (openTrigger) {
        const modalName = openTrigger.getAttribute("data-open-modal");
        if (modalName) this.open(modalName);
        return;
      }
      const closeTrigger = e.target.closest("[data-close-modal]");
      if (closeTrigger) {
        const modalName = closeTrigger.getAttribute("data-close-modal");
        if (modalName) this.close(modalName);
        return;
      }
    });
  }

  /**
   * 注册一个弹窗或面板
   * @param {string} name 唯一标识符 (例如 'resume', 'fox', 'articles', 'help', 'work', 'evidence')
   * @param {Object} options 配置项
   * @param {HTMLElement|string} options.element 弹窗容器元素或选择器
   * @param {HTMLElement|string|Array} [options.trigger] 触发按钮选择器或节点
   * @param {HTMLElement|string|Array} [options.closeBtn] 关闭按钮选择器或节点
   * @param {HTMLElement|string} [options.backdrop] 背景遮罩选择器或节点
   * @param {boolean} [options.isDialog=false] 是否为原生 <dialog> 元素
   * @param {boolean} [options.exclusive=true] 是否与其他大弹窗互斥
   * @param {Function} [options.onOpen] 打开回调
   * @param {Function} [options.onClose] 关闭回调
   */
  register(name, options = {}) {
    const el = typeof options.element === "string" ? document.querySelector(options.element) : options.element;
    if (!el) return;

    const modalData = {
      name,
      element: el,
      isDialog: options.isDialog || el.tagName.toLowerCase() === "dialog",
      exclusive: options.exclusive !== false,
      onOpen: options.onOpen,
      onClose: options.onClose,
    };

    // 绑定触发按钮
    if (options.trigger) {
      const triggers = typeof options.trigger === "string" 
        ? Array.from(document.querySelectorAll(options.trigger))
        : (Array.isArray(options.trigger) ? options.trigger : [options.trigger]);
      triggers.forEach(t => {
        if (t) t.addEventListener("click", () => this.open(name));
      });
    }

    // 绑定关闭按钮
    if (options.closeBtn) {
      const closeBtns = typeof options.closeBtn === "string"
        ? Array.from(document.querySelectorAll(options.closeBtn))
        : (Array.isArray(options.closeBtn) ? options.closeBtn : [options.closeBtn]);
      closeBtns.forEach(b => {
        if (b) b.addEventListener("click", (e) => {
          e.stopPropagation();
          this.close(name);
        });
      });
    }

    // 绑定遮罩点击关闭
    if (options.backdrop) {
      const bd = typeof options.backdrop === "string" ? document.querySelector(options.backdrop) : options.backdrop;
      if (bd) {
        bd.addEventListener("click", (e) => {
          if (e.target === bd) this.close(name);
        });
      }
    } else if (modalData.isDialog) {
      // 原生 <dialog> 边缘点击关闭判定
      el.addEventListener("click", (e) => {
        if (e.target === el) {
          const r = el.getBoundingClientRect();
          if (e.clientX < r.left || e.clientX > r.right || e.clientY < r.top || e.clientY > r.bottom) {
            this.close(name);
          }
        }
      });
    }

    this.modals.set(name, modalData);
  }

  /**
   * 打开指定弹窗
   */
  open(name, payload = null) {
    const m = this.modals.get(name);
    if (!m) return;

    // 若已经是栈顶，直接返回
    if (this.stack[this.stack.length - 1] === name) return;

    // 互斥处理：全屏互斥弹窗打开前，自动平滑收起同级别其他大弹窗
    if (m.exclusive) {
      const prevModals = [...this.stack];
      prevModals.forEach(otherName => {
        const other = this.modals.get(otherName);
        if (other && other.exclusive && otherName !== name) {
          this.close(otherName, false);
        }
      });
    }

    // 显示目标元素
    if (m.isDialog) {
      if (!m.element.open) m.element.showModal();
    } else {
      m.element.hidden = false;
    }

    // 压入状态栈
    if (!this.stack.includes(name)) {
      this.stack.push(name);
    }

    this._updateBodyLock();
    if (m.onOpen) m.onOpen(payload);
    this.emit("change", { name, action: "open", payload, stack: [...this.stack] });
  }

  /**
   * 关闭指定弹窗
   */
  close(name, updateStack = true) {
    const m = this.modals.get(name);
    if (!m) return;

    // 隐藏目标元素
    if (m.isDialog) {
      if (m.element.open) m.element.close();
    } else {
      m.element.hidden = true;
    }

    if (updateStack) {
      this.stack = this.stack.filter(item => item !== name);
    }

    this._updateBodyLock();
    if (m.onClose) m.onClose();
    this.emit("change", { name, action: "close", stack: [...this.stack] });
  }

  /**
   * 关闭栈顶弹窗 (ESC 或返回上一层)
   */
  closeTop() {
    if (this.stack.length === 0) return null;
    const topName = this.stack.pop();
    this.close(topName, false);
    return topName;
  }

  /**
   * 关闭所有弹窗
   */
  closeAll() {
    const names = [...this.stack];
    names.forEach(name => this.close(name));
    this.stack = [];
    this._updateBodyLock();
  }

  /**
   * 检查某个弹窗是否处于打开状态
   */
  isOpen(name) {
    return this.stack.includes(name);
  }

  /**
   * 切换开闭状态
   */
  toggle(name, payload = null) {
    if (this.isOpen(name)) this.close(name);
    else this.open(name, payload);
  }

  /**
   * 动态管理 body 锁定，防止弹窗打开时背景 3D 小岛发生误触碰或拖动
   */
  _updateBodyLock() {
    const hasActiveModal = this.stack.length > 0;
    document.body.classList.toggle("modal-active", hasActiveModal);
  }

  // 简易事件总线支持
  on(event, handler) {
    if (!this.events.has(event)) this.events.set(event, []);
    this.events.get(event).push(handler);
  }

  emit(event, data) {
    const handlers = this.events.get(event);
    if (handlers) handlers.forEach(fn => fn(data));
  }
}

export const modalManager = new ModalManager();
