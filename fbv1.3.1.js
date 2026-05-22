// ============================================
// FastBuild v1.3.1 - 完整优化版
// 服务器建筑保存工具
// 适用于 Minecraft PE 0.14.3 - 1.1.5+
// ============================================

var FB = {};

// ============ 配置 ============
FB.config = {
    version: "1.3.1",
    fileExtension: ".fb",
    defaultPath: "/sdcard/games/com.mojang/fastbuild/",
    chunkSize: 16,
    exportBlocksPerTick: 8000,
    importBlocksPerTick: 3000,
    progressUpdateInterval: 3,
    useMultiThread: true,
    streamExport: false,
    streamFlushInterval: 5000
};

// ============ 状态 ============
FB.state = {
    isProcessing: false,
    currentTask: null,
    tickCounter: 0,
    workerThread: null
};

// ============ UI ============
FB.ui = {
    ctx: null,
    mainWindow: null,
    progressWindow: null,
    progressBar: null,
    progressText: null,
    detailText: null
};

// ============ 数据 ============
FB.data = {
    pos1: {x: 0, y: 0, z: 0},
    pos2: {x: 0, y: 0, z: 0},
    filePath: ""
};

// ============ 颜色 ============
FB.colors = {
    primary: "#1976D2",
    primaryDark: "#1565C0",
    primaryLight: "#BBDEFB",
    accent: "#FF5722",
    success: "#4CAF50",
    successLight: "#C8E6C9",
    warning: "#FF9800",
    warningLight: "#FFE0B2",
    error: "#F44336",
    card: "#FFFFFF",
    cardHover: "#F5F5F5",
    textPrimary: "#212121",
    textSecondary: "#757575",
    divider: "#E0E0E0",
    shadow: "#00000033"
};

// ============================================
// 上下文获取
// ============================================

function getContext() {
    try {
        if (FB.ui.ctx) {
            try { FB.ui.ctx.getResources(); return FB.ui.ctx; } catch (e) { FB.ui.ctx = null; }
        }
        FB.ui.ctx = com.mojang.minecraftpe.MainActivity.currentMainActivity.get();
        return FB.ui.ctx;
    } catch (e) {
        FB.ui.ctx = null;
        return null;
    }
}

// ============================================
// 完整状态重置
// ============================================

function resetAllState() {
    if (FB.state.workerThread !== null) {
        try { 
            FB.state.workerThread.interrupt(); 
        } catch (e) {}
        FB.state.workerThread = null;
    }
    
    FB.state.isProcessing = false;
    FB.state.currentTask = null;
    FB.state.tickCounter = 0;
    
    try {
        if (FB.ui.mainWindow !== null) {
            FB.ui.mainWindow.dismiss();
        }
    } catch (e) {}
    try {
        if (FB.ui.progressWindow !== null) {
            FB.ui.progressWindow.dismiss();
        }
    } catch (e) {}
    
    FB.ui.ctx = null;
    FB.ui.mainWindow = null;
    FB.ui.progressWindow = null;
    FB.ui.progressBar = null;
    FB.ui.progressText = null;
    FB.ui.detailText = null;
}

// ============================================
// 初始化
// ============================================

function newLevel() {
    resetAllState();
    
    new java.lang.Thread(new java.lang.Runnable({
        run: function() {
            try {
                java.lang.Thread.sleep(600);
                initDirectory();
                clientMessage("§b§l[FastBuild] §av" + FB.config.version + " §f已加载");
                clientMessage("§7输入 §e.fb help §7查看帮助");
            } catch (e) {}
        }
    })).start();
}

function selectLevelHook() {
    resetAllState();
}

function leaveGame() {
    closeAllWindows();
    stopWorkerThread();
    FB.state.isProcessing = false;
    FB.state.currentTask = null;
    FB.ui.ctx = null;
}

function initDirectory() {
    try {
        var dir = new java.io.File(FB.config.defaultPath);
        if (!dir.exists()) dir.mkdirs();
    } catch (e) {}
}

function stopWorkerThread() {
    FB.state.isProcessing = false;
    if (FB.state.workerThread !== null) {
        try { FB.state.workerThread.interrupt(); } catch (e) {}
        FB.state.workerThread = null;
    }
}

// ============================================
// 命令处理
// ============================================

function chatHook(str) {
    var msg = String(str).trim();
    
    if (msg === ".fb" || msg.indexOf(".fb ") === 0 ||
        msg === "。fb" || msg.indexOf("。fb ") === 0) {
        preventDefault();
        
        var cmdPart = msg.replace(/^[.。]fb\s*/, "");
        var args = cmdPart.length > 0 ? cmdPart.split(" ") : [];
        
        if (args.length === 0) {
            showMainUI();
        } else {
            var cmd = args[0].toLowerCase();
            switch (cmd) {
                case "pos1": case "p1": case "1": setPos1(); break;
                case "pos2": case "p2": case "2": setPos2(); break;
                case "cancel": case "c": cancelTask(); break;
                case "help": case "h": case "?": showHelp(); break;
                default: showMainUI();
            }
        }
    }
}

function setPos1() {
    FB.data.pos1.x = Math.floor(getPlayerX());
    FB.data.pos1.y = Math.floor(getPlayerY());
    FB.data.pos1.z = Math.floor(getPlayerZ());
    clientMessage("§a[FB] §fP1: §e" + FB.data.pos1.x + ", " + FB.data.pos1.y + ", " + FB.data.pos1.z);
}

function setPos2() {
    FB.data.pos2.x = Math.floor(getPlayerX());
    FB.data.pos2.y = Math.floor(getPlayerY());
    FB.data.pos2.z = Math.floor(getPlayerZ());
    clientMessage("§a[FB] §fP2: §e" + FB.data.pos2.x + ", " + FB.data.pos2.y + ", " + FB.data.pos2.z);
}

function cancelTask() {
    if (FB.state.isProcessing) {
        stopWorkerThread();
        FB.state.currentTask = null;
        closeProgressUI();
        clientMessage("§c[FB] 已取消");
    } else {
        clientMessage("§7[FB] 无进行中的任务");
    }
}

function showHelp() {
    clientMessage("§b§l=== FastBuild v" + FB.config.version + " ===");
    clientMessage("§e.fb §7- 打开菜单");
    clientMessage("§e.fb pos1/p1 §7- 设置位置1");
    clientMessage("§e.fb pos2/p2 §7- 设置位置2");
    clientMessage("§e.fb cancel §7- 取消任务");
}

// ============================================
// UI工具函数
// ============================================

function dip(v) {
    try {
        var ctx = getContext();
        if (ctx === null) return v;
        return Math.ceil(v * ctx.getResources().getDisplayMetrics().density);
    } catch (e) {
        return v;
    }
}

function runOnUiThread(func) {
    var ctx = getContext();
    if (!ctx) return;
    try {
        ctx.runOnUiThread(new java.lang.Runnable({
            run: function() {
                try { func(); } catch (e) { print("UI Error: " + e); }
            }
        }));
    } catch (e) {}
}

function closeAllWindows() {
    try {
        if (FB.ui.mainWindow !== null) {
            FB.ui.mainWindow.dismiss();
            FB.ui.mainWindow = null;
        }
    } catch (e) {
        FB.ui.mainWindow = null;
    }
    try {
        if (FB.ui.progressWindow !== null) {
            FB.ui.progressWindow.dismiss();
            FB.ui.progressWindow = null;
        }
    } catch (e) {
        FB.ui.progressWindow = null;
    }
}

// ============================================
// UI组件
// ============================================

function createBg(color, radius, stroke, strokeWidth) {
    try {
        var d = new android.graphics.drawable.GradientDrawable();
        d.setColor(android.graphics.Color.parseColor(color));
        d.setCornerRadius(dip(radius));
        if (stroke) d.setStroke(dip(strokeWidth || 1), android.graphics.Color.parseColor(stroke));
        return d;
    } catch (e) {
        return null;
    }
}

function createShadowBg(color, radius) {
    try {
        var d = new android.graphics.drawable.GradientDrawable();
        d.setColor(android.graphics.Color.parseColor(color));
        d.setCornerRadius(dip(radius));
        return d;
    } catch (e) {
        return null;
    }
}

function animateViewIn(view, delay) {
    try {
        view.setAlpha(0);
        view.setTranslationY(dip(20));
        view.animate()
            .alpha(1)
            .translationY(0)
            .setDuration(250)
            .setStartDelay(delay || 0)
            .setInterpolator(new android.view.animation.DecelerateInterpolator())
            .start();
    } catch (e) {}
}

function animateButtonPress(view) {
    try {
        view.animate().scaleX(0.96).scaleY(0.96).setDuration(80).start();
    } catch (e) {}
}

function animateButtonRelease(view) {
    try {
        view.animate().scaleX(1).scaleY(1).setDuration(80).start();
    } catch (e) {}
}

function createBtn(text, color, lightColor, onClick) {
    var ctx = getContext();
    if (ctx === null) return null;
    
    try {
        var btn = new android.widget.Button(ctx);
        btn.setText(text);
        btn.setTextColor(android.graphics.Color.WHITE);
        btn.setTextSize(14);
        btn.setAllCaps(false);
        btn.setBackground(createBg(color, 12));
        btn.setPadding(dip(16), dip(14), dip(16), dip(14));
        
        var p = new android.widget.LinearLayout.LayoutParams(-1, dip(50));
        p.setMargins(0, dip(8), 0, 0);
        btn.setLayoutParams(p);
        
        btn.setOnTouchListener(new android.view.View.OnTouchListener({
            onTouch: function(v, event) {
                try {
                    var action = event.getAction();
                    if (action === android.view.MotionEvent.ACTION_DOWN) {
                        animateButtonPress(v);
                        v.setBackground(createBg(lightColor || color, 12));
                    } else if (action === android.view.MotionEvent.ACTION_UP || 
                               action === android.view.MotionEvent.ACTION_CANCEL) {
                        animateButtonRelease(v);
                        v.setBackground(createBg(color, 12));
                    }
                } catch (e) {}
                return false;
            }
        }));
        
        btn.setOnClickListener(new android.view.View.OnClickListener({
            onClick: function() { 
                try { onClick(); } catch (e) {} 
            }
        }));
        
        return btn;
    } catch (e) {
        return null;
    }
}

function createOutlineBtn(text, color, onClick) {
    var ctx = getContext();
    if (ctx === null) return null;
    
    try {
        var btn = new android.widget.Button(ctx);
        btn.setText(text);
        btn.setTextColor(android.graphics.Color.parseColor(color));
        btn.setTextSize(14);
        btn.setAllCaps(false);
        btn.setBackground(createBg("#FFFFFF", 12, color, 1.5));
        btn.setPadding(dip(16), dip(14), dip(16), dip(14));
        
        var p = new android.widget.LinearLayout.LayoutParams(-1, dip(50));
        p.setMargins(0, dip(8), 0, 0);
        btn.setLayoutParams(p);
        
        btn.setOnTouchListener(new android.view.View.OnTouchListener({
            onTouch: function(v, event) {
                try {
                    var action = event.getAction();
                    if (action === android.view.MotionEvent.ACTION_DOWN) {
                        animateButtonPress(v);
                    } else if (action === android.view.MotionEvent.ACTION_UP || 
                               action === android.view.MotionEvent.ACTION_CANCEL) {
                        animateButtonRelease(v);
                    }
                } catch (e) {}
                return false;
            }
        }));
        
        btn.setOnClickListener(new android.view.View.OnClickListener({
            onClick: function() { 
                try { onClick(); } catch (e) {} 
            }
        }));
        
        return btn;
    } catch (e) {
        return null;
    }
}

function createInput(hint, val) {
    var ctx = getContext();
    if (ctx === null) return null;
    
    try {
        var input = new android.widget.EditText(ctx);
        input.setHint(hint);
        if (val !== undefined && val !== null) input.setText(String(val));
        input.setTextSize(14);
        input.setTextColor(android.graphics.Color.parseColor(FB.colors.textPrimary));
        input.setHintTextColor(android.graphics.Color.parseColor(FB.colors.textSecondary));
        input.setBackground(createBg("#FAFAFA", 10, FB.colors.divider, 1));
        input.setPadding(dip(16), dip(14), dip(16), dip(14));
        input.setSingleLine(true);
        
        var p = new android.widget.LinearLayout.LayoutParams(-1, -2);
        p.setMargins(0, dip(6), 0, 0);
        input.setLayoutParams(p);
        
        input.setOnFocusChangeListener(new android.view.View.OnFocusChangeListener({
            onFocusChange: function(v, hasFocus) {
                try {
                    if (hasFocus) {
                        v.setBackground(createBg("#FFFFFF", 10, FB.colors.primary, 2));
                    } else {
                        v.setBackground(createBg("#FAFAFA", 10, FB.colors.divider, 1));
                    }
                } catch (e) {}
            }
        }));
        
        return input;
    } catch (e) {
        return null;
    }
}

function createNumInput(hint, val) {
    var input = createInput(hint, val);
    if (input !== null) {
        try {
            input.setInputType(android.text.InputType.TYPE_CLASS_NUMBER | android.text.InputType.TYPE_NUMBER_FLAG_SIGNED);
        } catch (e) {}
    }
    return input;
}

function createLabel(text, size, color, bold) {
    var ctx = getContext();
    if (ctx === null) return null;
    
    try {
        var tv = new android.widget.TextView(ctx);
        tv.setText(text);
        tv.setTextSize(size || 14);
        tv.setTextColor(android.graphics.Color.parseColor(color || FB.colors.textPrimary));
        if (bold) tv.setTypeface(android.graphics.Typeface.DEFAULT_BOLD);
        return tv;
    } catch (e) {
        return null;
    }
}

function createDivider() {
    var ctx = getContext();
    if (ctx === null) return null;
    
    try {
        var v = new android.view.View(ctx);
        var p = new android.widget.LinearLayout.LayoutParams(-1, dip(1));
        p.setMargins(0, dip(16), 0, dip(16));
        v.setLayoutParams(p);
        v.setBackgroundColor(android.graphics.Color.parseColor(FB.colors.divider));
        return v;
    } catch (e) {
        return null;
    }
}

function createScroll(content) {
    var ctx = getContext();
    if (ctx === null) return null;
    
    try {
        var sv = new android.widget.ScrollView(ctx);
        sv.addView(content);
        sv.setVerticalScrollBarEnabled(true);
        sv.setOverScrollMode(android.view.View.OVER_SCROLL_NEVER);
        return sv;
    } catch (e) {
        return null;
    }
}

function mp(l, t, r, b) {
    try {
        var p = new android.widget.LinearLayout.LayoutParams(-2, -2);
        p.setMargins(dip(l), dip(t), dip(r), dip(b));
        return p;
    } catch (e) {
        return null;
    }
}

function mpFill(l, t, r, b) {
    try {
        var p = new android.widget.LinearLayout.LayoutParams(-1, -2);
        p.setMargins(dip(l), dip(t), dip(r), dip(b));
        return p;
    } catch (e) {
        return null;
    }
}

// ============================================
// 安全弹窗
// ============================================

function createSafePopup(content, width) {
    var ctx = getContext();
    if (ctx === null) return null;
    
    try {
        var outer = new android.widget.FrameLayout(ctx);
        outer.setLayoutParams(new android.widget.FrameLayout.LayoutParams(-1, -1));
        outer.setBackgroundColor(android.graphics.Color.argb(100, 0, 0, 0));
        
        outer.setOnClickListener(new android.view.View.OnClickListener({
            onClick: function() {}
        }));
        
        var wrapper = new android.widget.FrameLayout(ctx);
        var wp = new android.widget.FrameLayout.LayoutParams(width, -2);
        wp.gravity = android.view.Gravity.CENTER;
        wrapper.setLayoutParams(wp);
        wrapper.setOnClickListener(new android.view.View.OnClickListener({
            onClick: function() {}
        }));
        wrapper.addView(content);
        outer.addView(wrapper);
        
        var popup = new android.widget.PopupWindow(outer, -1, -1, true);
        popup.setBackgroundDrawable(new android.graphics.drawable.ColorDrawable(android.graphics.Color.TRANSPARENT));
        popup.setOutsideTouchable(false);
        popup.setTouchable(true);
        popup.setFocusable(true);
        
        return popup;
    } catch (e) {
        return null;
    }
}

function createCloseBtn(onClick) {
    var ctx = getContext();
    if (ctx === null) return null;
    
    try {
        var btn = new android.widget.TextView(ctx);
        btn.setText("✕");
        btn.setTextSize(22);
        btn.setTextColor(android.graphics.Color.parseColor(FB.colors.textSecondary));
        btn.setPadding(dip(12), dip(4), dip(4), dip(4));
        btn.setGravity(android.view.Gravity.CENTER);
        
        btn.setOnTouchListener(new android.view.View.OnTouchListener({
            onTouch: function(v, event) {
                try {
                    if (event.getAction() === android.view.MotionEvent.ACTION_DOWN) {
                        v.setTextColor(android.graphics.Color.parseColor(FB.colors.error));
                    } else if (event.getAction() === android.view.MotionEvent.ACTION_UP ||
                               event.getAction() === android.view.MotionEvent.ACTION_CANCEL) {
                        v.setTextColor(android.graphics.Color.parseColor(FB.colors.textSecondary));
                    }
                } catch (e) {}
                return false;
            }
        }));
        
        btn.setOnClickListener(new android.view.View.OnClickListener({
            onClick: function() { 
                try { onClick(); } catch (e) {} 
            }
        }));
        
        return btn;
    } catch (e) {
        return null;
    }
}

// ============================================
// 创建设置项开关
// ============================================

function createSettingSwitch(title, desc, checked, onChange) {
    var ctx = getContext();
    if (ctx === null) return null;
    
    try {
        var layout = new android.widget.LinearLayout(ctx);
        layout.setOrientation(0);
        layout.setGravity(android.view.Gravity.CENTER_VERTICAL);
        layout.setBackground(createBg("#FAFAFA", 12));
        layout.setPadding(dip(16), dip(14), dip(16), dip(14));
        layout.setLayoutParams(mpFill(0, 8, 0, 0));
        
        var info = new android.widget.LinearLayout(ctx);
        info.setOrientation(1);
        info.setLayoutParams(new android.widget.LinearLayout.LayoutParams(0, -2, 1));
        
        var titleLabel = createLabel(title, 15, FB.colors.textPrimary, true);
        if (titleLabel !== null) info.addView(titleLabel);
        
        var descLabel = createLabel(desc, 11, FB.colors.textSecondary, false);
        if (descLabel !== null) {
            descLabel.setLayoutParams(mp(0, 2, 0, 0));
            info.addView(descLabel);
        }
        layout.addView(info);
        
        var sw = new android.widget.Switch(ctx);
        sw.setChecked(checked);
        sw.setOnCheckedChangeListener(new android.widget.CompoundButton.OnCheckedChangeListener({
            onCheckedChanged: function(btn, isChecked) {
                try { onChange(isChecked); } catch (e) {}
            }
        }));
        layout.addView(sw);
        
        return layout;
    } catch (e) {
        return null;
    }
}

// ============================================
// 主界面
// ============================================

function showMainUI() {
    var ctx = getContext();
    if (ctx === null) {
        clientMessage("§e[FB] 请稍后再试");
        return;
    }
    
    runOnUiThread(function() {
        try {
            if (FB.ui.mainWindow !== null) {
                try { FB.ui.mainWindow.dismiss(); } catch (e) {}
                FB.ui.mainWindow = null;
            }
            
            var ctx = getContext();
            if (ctx === null) return;
            
            var main = new android.widget.LinearLayout(ctx);
            main.setOrientation(1);
            main.setPadding(dip(24), dip(20), dip(24), dip(24));
            main.setBackground(createShadowBg(FB.colors.card, 20));
            
            var header = new android.widget.LinearLayout(ctx);
            header.setOrientation(0);
            header.setGravity(android.view.Gravity.CENTER_VERTICAL);
            
            var logo = new android.widget.LinearLayout(ctx);
            logo.setOrientation(0);
            logo.setGravity(android.view.Gravity.CENTER_VERTICAL);
            logo.setLayoutParams(new android.widget.LinearLayout.LayoutParams(0, -2, 1));
            
            var icon = createLabel("🏗️", 26, FB.colors.primary, false);
            if (icon !== null) { icon.setPadding(0, 0, dip(8), 0); logo.addView(icon); }
            
            var titleLayout = new android.widget.LinearLayout(ctx);
            titleLayout.setOrientation(1);
            
            var title = createLabel("FastBuild", 20, FB.colors.primary, true);
            if (title !== null) titleLayout.addView(title);
            
            var ver = createLabel("v" + FB.config.version, 10, FB.colors.textSecondary, false);
            if (ver !== null) titleLayout.addView(ver);
            
            logo.addView(titleLayout);
            header.addView(logo);
            
            var closeBtn = createCloseBtn(function() {
                try { if (FB.ui.mainWindow !== null) { FB.ui.mainWindow.dismiss(); FB.ui.mainWindow = null; } } catch (e) {}
            });
            if (closeBtn !== null) header.addView(closeBtn);
            
            main.addView(header);
            
            var statusLayout = new android.widget.LinearLayout(ctx);
            statusLayout.setOrientation(0);
            statusLayout.setGravity(android.view.Gravity.CENTER_VERTICAL);
            statusLayout.setBackground(createBg(FB.config.useMultiThread ? "#E8F5E9" : "#FFF3E0", 8));
            statusLayout.setPadding(dip(12), dip(8), dip(12), dip(8));
            statusLayout.setLayoutParams(mpFill(0, 12, 0, 0));
            
            var statusIcon = createLabel(FB.config.useMultiThread ? "⚡" : "🔄", 14, null, false);
            if (statusIcon !== null) statusLayout.addView(statusIcon);
            
            var modeText = FB.config.useMultiThread ? " 多线程" : " 标准";
            if (FB.config.streamExport) modeText += " + 流式保存";
            
            var statusText = createLabel(modeText, 12, FB.config.useMultiThread ? FB.colors.success : FB.colors.warning, false);
            if (statusText !== null) statusLayout.addView(statusText);
            
            main.addView(statusLayout);
            
            var div1 = createDivider(); if (div1 !== null) main.addView(div1);
            
            var secLabel = createLabel("选择操作", 12, FB.colors.textSecondary, false);
            if (secLabel !== null) main.addView(secLabel);
            
            var btn1 = createBtn("📦  区块导出", FB.colors.success, "#66BB6A", function() {
                try { if (FB.ui.mainWindow !== null) { FB.ui.mainWindow.dismiss(); FB.ui.mainWindow = null; } showChunkExportUI(); } catch (e) {}
            });
            if (btn1 !== null) { main.addView(btn1); animateViewIn(btn1, 50); }
            
            var btn2 = createBtn("📐  坐标导出", FB.colors.primary, FB.colors.primaryDark, function() {
                try { if (FB.ui.mainWindow !== null) { FB.ui.mainWindow.dismiss(); FB.ui.mainWindow = null; } showCoordExportUI(); } catch (e) {}
            });
            if (btn2 !== null) { main.addView(btn2); animateViewIn(btn2, 100); }
            
            var btn3 = createBtn("📥  导入建筑", FB.colors.warning, "#FFA726", function() {
                try { if (FB.ui.mainWindow !== null) { FB.ui.mainWindow.dismiss(); FB.ui.mainWindow = null; } showImportUI(); } catch (e) {}
            });
            if (btn3 !== null) { main.addView(btn3); animateViewIn(btn3, 150); }
            
            var btn4 = createOutlineBtn("📁  文件管理", FB.colors.primary, function() {
                try { if (FB.ui.mainWindow !== null) { FB.ui.mainWindow.dismiss(); FB.ui.mainWindow = null; } showFileManagerUI(); } catch (e) {}
            });
            if (btn4 !== null) { main.addView(btn4); animateViewIn(btn4, 200); }
            
            var btn5 = createOutlineBtn("⚙️  设置", FB.colors.textSecondary, function() {
                try { if (FB.ui.mainWindow !== null) { FB.ui.mainWindow.dismiss(); FB.ui.mainWindow = null; } showSettingsUI(); } catch (e) {}
            });
            if (btn5 !== null) { main.addView(btn5); animateViewIn(btn5, 250); }
            
            var div2 = createDivider(); if (div2 !== null) main.addView(div2);
            
            var info = new android.widget.LinearLayout(ctx);
            info.setOrientation(1);
            info.setBackground(createBg(FB.colors.primaryLight, 12));
            info.setPadding(dip(14), dip(12), dip(14), dip(12));
            
            var posRow = new android.widget.LinearLayout(ctx);
            posRow.setOrientation(0);
            posRow.setGravity(android.view.Gravity.CENTER_VERTICAL);
            
            var posIcon = createLabel("📍 ", 14, FB.colors.primary, false);
            if (posIcon !== null) posRow.addView(posIcon);
            
            var posText = createLabel(
                Math.floor(getPlayerX()) + ", " + Math.floor(getPlayerY()) + ", " + Math.floor(getPlayerZ()),
                14, FB.colors.textPrimary, true
            );
            if (posText !== null) posRow.addView(posText);
            info.addView(posRow);
            
            var savedPos = createLabel(
                "P1: (" + FB.data.pos1.x + "," + FB.data.pos1.y + "," + FB.data.pos1.z + ")  " +
                "P2: (" + FB.data.pos2.x + "," + FB.data.pos2.y + "," + FB.data.pos2.z + ")",
                11, FB.colors.textSecondary, false
            );
            if (savedPos !== null) { savedPos.setLayoutParams(mp(0, 4, 0, 0)); info.addView(savedPos); }
            
            main.addView(info);
            animateViewIn(info, 300);
            
            var popup = createSafePopup(main, dip(300));
            if (popup === null) return;
            
            popup.showAtLocation(ctx.getWindow().getDecorView(), android.view.Gravity.CENTER, 0, 0);
            FB.ui.mainWindow = popup;
            
            main.setAlpha(0); main.setScaleX(0.9); main.setScaleY(0.9);
            main.animate().alpha(1).scaleX(1).scaleY(1).setDuration(200).setInterpolator(new android.view.animation.DecelerateInterpolator()).start();
        } catch (e) { print("showMainUI Error: " + e); }
    });
}

// ============================================
// 设置界面
// ============================================

function showSettingsUI() {
    runOnUiThread(function() {
        try {
            var ctx = getContext();
            if (ctx === null) return;
            
            var main = new android.widget.LinearLayout(ctx);
            main.setOrientation(1);
            main.setPadding(dip(24), dip(20), dip(24), dip(24));
            main.setBackground(createShadowBg(FB.colors.card, 20));
            
            var header = new android.widget.LinearLayout(ctx);
            header.setOrientation(0);
            header.setGravity(android.view.Gravity.CENTER_VERTICAL);
            
            var back = createLabel("← ", 22, FB.colors.primary, false);
            if (back !== null) {
                back.setPadding(0, 0, dip(8), 0);
                back.setOnClickListener(new android.view.View.OnClickListener({
                    onClick: function() { try { if (FB.ui.mainWindow !== null) { FB.ui.mainWindow.dismiss(); FB.ui.mainWindow = null; } showMainUI(); } catch (e) {} }
                }));
                header.addView(back);
            }
            
            var title = createLabel("设置", 20, FB.colors.primary, true);
            if (title !== null) { title.setLayoutParams(new android.widget.LinearLayout.LayoutParams(0, -2, 1)); header.addView(title); }
            
            var closeBtn = createCloseBtn(function() { try { if (FB.ui.mainWindow !== null) { FB.ui.mainWindow.dismiss(); FB.ui.mainWindow = null; } } catch (e) {} });
            if (closeBtn !== null) header.addView(closeBtn);
            
            main.addView(header);
            
            var div1 = createDivider(); if (div1 !== null) main.addView(div1);
            
            var mtSwitch = createSettingSwitch("⚡ 多线程加速", "导出时使用多线程扫描方块", FB.config.useMultiThread, function(checked) {
                FB.config.useMultiThread = checked;
                toast(checked ? "多线程已启用" : "多线程已禁用");
            });
            if (mtSwitch !== null) main.addView(mtSwitch);
            
            var streamSwitch = createSettingSwitch("💾 边导出边保存", "减少内存占用，防止大区域导出崩溃", FB.config.streamExport, function(checked) {
                FB.config.streamExport = checked;
                toast(checked ? "流式保存已启用" : "流式保存已禁用");
            });
            if (streamSwitch !== null) main.addView(streamSwitch);
            
            var div2 = createDivider(); if (div2 !== null) main.addView(div2);
            
            var expLabel = createLabel("导出速度 (方块/tick)", 13, FB.colors.textSecondary, false);
            if (expLabel !== null) main.addView(expLabel);
            
            var expInput = createNumInput("1000-50000", FB.config.exportBlocksPerTick);
            if (expInput !== null) main.addView(expInput);
            
            var impLabel = createLabel("导入速度 (方块/tick)", 13, FB.colors.textSecondary, false);
            if (impLabel !== null) { impLabel.setLayoutParams(mp(0, 12, 0, 0)); main.addView(impLabel); }
            
            var impInput = createNumInput("500-10000", FB.config.importBlocksPerTick);
            if (impInput !== null) main.addView(impInput);
            
            var div3 = createDivider(); if (div3 !== null) main.addView(div3);
            
            var saveBtn = createBtn("💾  保存设置", FB.colors.primary, FB.colors.primaryDark, function() {
                try {
                    var exp = parseInt(expInput.getText()) || 8000;
                    var imp = parseInt(impInput.getText()) || 3000;
                    FB.config.exportBlocksPerTick = Math.max(1000, Math.min(50000, exp));
                    FB.config.importBlocksPerTick = Math.max(500, Math.min(10000, imp));
                    toast("设置已保存");
                    if (FB.ui.mainWindow !== null) { FB.ui.mainWindow.dismiss(); FB.ui.mainWindow = null; }
                    showMainUI();
                } catch (e) {}
            });
            if (saveBtn !== null) main.addView(saveBtn);
            
            var cancelBtn = createOutlineBtn("取消", FB.colors.textSecondary, function() {
                try { if (FB.ui.mainWindow !== null) { FB.ui.mainWindow.dismiss(); FB.ui.mainWindow = null; } showMainUI(); } catch (e) {}
            });
            if (cancelBtn !== null) main.addView(cancelBtn);
            
            var sv = createScroll(main);
            var popup = createSafePopup(sv, dip(320));
            if (popup === null) return;
            
            popup.showAtLocation(ctx.getWindow().getDecorView(), android.view.Gravity.CENTER, 0, 0);
            FB.ui.mainWindow = popup;
            
            main.setAlpha(0); main.setTranslationX(dip(30));
            main.animate().alpha(1).translationX(0).setDuration(200).start();
        } catch (e) { print("showSettingsUI Error: " + e); }
    });
}

// ============================================
// 区块导出UI
// ============================================

function showChunkExportUI() {
    runOnUiThread(function() {
        try {
            var ctx = getContext();
            if (ctx === null) return;
            
            var main = new android.widget.LinearLayout(ctx);
            main.setOrientation(1);
            main.setPadding(dip(24), dip(20), dip(24), dip(24));
            main.setBackground(createShadowBg(FB.colors.card, 20));
            
            var header = new android.widget.LinearLayout(ctx);
            header.setOrientation(0);
            header.setGravity(android.view.Gravity.CENTER_VERTICAL);
            
            var back = createLabel("← ", 22, FB.colors.primary, false);
            if (back !== null) {
                back.setPadding(0, 0, dip(8), 0);
                back.setOnClickListener(new android.view.View.OnClickListener({
                    onClick: function() { try { if (FB.ui.mainWindow !== null) { FB.ui.mainWindow.dismiss(); FB.ui.mainWindow = null; } showMainUI(); } catch (e) {} }
                }));
                header.addView(back);
            }
            
            var title = createLabel("区块导出", 20, FB.colors.success, true);
            if (title !== null) { title.setLayoutParams(new android.widget.LinearLayout.LayoutParams(0, -2, 1)); header.addView(title); }
            
            var closeBtn = createCloseBtn(function() { try { if (FB.ui.mainWindow !== null) { FB.ui.mainWindow.dismiss(); FB.ui.mainWindow = null; } } catch (e) {} });
            if (closeBtn !== null) header.addView(closeBtn);
            
            main.addView(header);
            
            var desc = createLabel("以玩家为中心导出周围区块", 12, FB.colors.textSecondary, false);
            if (desc !== null) { desc.setLayoutParams(mp(0, 4, 0, 0)); main.addView(desc); }
            
            var div1 = createDivider(); if (div1 !== null) main.addView(div1);
            
            var nameLabel = createLabel("文件名", 13, FB.colors.textSecondary, false);
            if (nameLabel !== null) main.addView(nameLabel);
            
            var nameInput = createInput("文件名", "chunk_export");
            if (nameInput !== null) main.addView(nameInput);
            
            var rl = createLabel("区块半径 (1-16)", 13, FB.colors.textSecondary, false);
            if (rl !== null) { rl.setLayoutParams(mp(0, 12, 0, 0)); main.addView(rl); }
            
            var rangeInput = createNumInput("半径", "3");
            if (rangeInput !== null) main.addView(rangeInput);
            
            var yl = createLabel("Y轴范围", 13, FB.colors.textSecondary, false);
            if (yl !== null) { yl.setLayoutParams(mp(0, 12, 0, 0)); main.addView(yl); }
            
            var yRow = new android.widget.LinearLayout(ctx);
            yRow.setOrientation(0);
            yRow.setGravity(android.view.Gravity.CENTER_VERTICAL);
            
            var yMinInput = createNumInput("最小Y", "0");
            var yMaxInput = createNumInput("最大Y", "127");
            
            if (yMinInput !== null) { yMinInput.setLayoutParams(new android.widget.LinearLayout.LayoutParams(0, -2, 1)); yRow.addView(yMinInput); }
            var sp = createLabel("  ~  ", 14, FB.colors.textSecondary, false);
            if (sp !== null) yRow.addView(sp);
            if (yMaxInput !== null) { yMaxInput.setLayoutParams(new android.widget.LinearLayout.LayoutParams(0, -2, 1)); yRow.addView(yMaxInput); }
            
            main.addView(yRow);
            
            var airCheck = new android.widget.CheckBox(ctx);
            airCheck.setText(" 包含空气方块");
            airCheck.setTextSize(14);
            airCheck.setTextColor(android.graphics.Color.parseColor(FB.colors.textPrimary));
            airCheck.setLayoutParams(mp(0, 12, 0, 0));
            main.addView(airCheck);
            
            var div2 = createDivider(); if (div2 !== null) main.addView(div2);
            
            var exportBtn = createBtn("🚀  开始导出", FB.colors.success, "#66BB6A", function() {
                try {
                    var name = String(nameInput.getText());
                    var range = parseInt(rangeInput.getText()) || 3;
                    var yMin = parseInt(yMinInput.getText()) || 0;
                    var yMax = parseInt(yMaxInput.getText()) || 127;
                    var air = airCheck.isChecked();
                    
                    if (!name) { toast("请输入文件名"); return; }
                    
                    range = Math.max(1, Math.min(16, range));
                    yMin = Math.max(0, Math.min(255, yMin));
                    yMax = Math.max(0, Math.min(255, yMax));
                    if (yMin > yMax) { var t = yMin; yMin = yMax; yMax = t; }
                    
                    if (FB.ui.mainWindow !== null) { FB.ui.mainWindow.dismiss(); FB.ui.mainWindow = null; }
                    startChunkExport(name, range, yMin, yMax, air);
                } catch (e) {}
            });
            if (exportBtn !== null) main.addView(exportBtn);
            
            var cancelBtn = createOutlineBtn("取消", FB.colors.textSecondary, function() {
                try { if (FB.ui.mainWindow !== null) { FB.ui.mainWindow.dismiss(); FB.ui.mainWindow = null; } showMainUI(); } catch (e) {}
            });
            if (cancelBtn !== null) main.addView(cancelBtn);
            
            var sv = createScroll(main);
            var popup = createSafePopup(sv, dip(320));
            if (popup === null) return;
            
            popup.showAtLocation(ctx.getWindow().getDecorView(), android.view.Gravity.CENTER, 0, 0);
            FB.ui.mainWindow = popup;
            
            main.setAlpha(0); main.setTranslationX(dip(30));
            main.animate().alpha(1).translationX(0).setDuration(200).start();
        } catch (e) { print("showChunkExportUI Error: " + e); }
    });
}

// ============================================
// 坐标导出UI
// ============================================

function showCoordExportUI() {
    runOnUiThread(function() {
        try {
            var ctx = getContext();
            if (ctx === null) return;
            
            var main = new android.widget.LinearLayout(ctx);
            main.setOrientation(1);
            main.setPadding(dip(24), dip(20), dip(24), dip(24));
            main.setBackground(createShadowBg(FB.colors.card, 20));
            
            var header = new android.widget.LinearLayout(ctx);
            header.setOrientation(0);
            header.setGravity(android.view.Gravity.CENTER_VERTICAL);
            
            var back = createLabel("← ", 22, FB.colors.primary, false);
            if (back !== null) {
                back.setPadding(0, 0, dip(8), 0);
                back.setOnClickListener(new android.view.View.OnClickListener({
                    onClick: function() { try { if (FB.ui.mainWindow !== null) { FB.ui.mainWindow.dismiss(); FB.ui.mainWindow = null; } showMainUI(); } catch (e) {} }
                }));
                header.addView(back);
            }
            
            var title = createLabel("坐标导出", 20, FB.colors.primary, true);
            if (title !== null) { title.setLayoutParams(new android.widget.LinearLayout.LayoutParams(0, -2, 1)); header.addView(title); }
            
            var closeBtn = createCloseBtn(function() { try { if (FB.ui.mainWindow !== null) { FB.ui.mainWindow.dismiss(); FB.ui.mainWindow = null; } } catch (e) {} });
            if (closeBtn !== null) header.addView(closeBtn);
            
            main.addView(header);
            var div1 = createDivider(); if (div1 !== null) main.addView(div1);
            
            var nameLabel = createLabel("文件名", 13, FB.colors.textSecondary, false);
            if (nameLabel !== null) main.addView(nameLabel);
            
            var nameInput = createInput("文件名", "coord_export");
            if (nameInput !== null) main.addView(nameInput);
            
            var p1l = createLabel("起点坐标 (X, Y, Z)", 13, FB.colors.textSecondary, false);
            if (p1l !== null) { p1l.setLayoutParams(mp(0, 12, 0, 0)); main.addView(p1l); }
            
            var p1Row = new android.widget.LinearLayout(ctx);
            p1Row.setOrientation(0);
            var x1 = createNumInput("X", FB.data.pos1.x);
            var y1 = createNumInput("Y", FB.data.pos1.y);
            var z1 = createNumInput("Z", FB.data.pos1.z);
            if (x1 !== null) { x1.setLayoutParams(new android.widget.LinearLayout.LayoutParams(0, -2, 1)); p1Row.addView(x1); }
            if (y1 !== null) { y1.setLayoutParams(new android.widget.LinearLayout.LayoutParams(0, -2, 1)); p1Row.addView(y1); }
            if (z1 !== null) { z1.setLayoutParams(new android.widget.LinearLayout.LayoutParams(0, -2, 1)); p1Row.addView(z1); }
            main.addView(p1Row);
            
            var usePos1Btn = createOutlineBtn("📍 使用当前位置", FB.colors.primary, function() {
                try {
                    if (x1 !== null) x1.setText(String(Math.floor(getPlayerX())));
                    if (y1 !== null) y1.setText(String(Math.floor(getPlayerY())));
                    if (z1 !== null) z1.setText(String(Math.floor(getPlayerZ())));
                } catch (e) {}
            });
            if (usePos1Btn !== null) main.addView(usePos1Btn);
            
            var p2l = createLabel("终点坐标 (X, Y, Z)", 13, FB.colors.textSecondary, false);
            if (p2l !== null) { p2l.setLayoutParams(mp(0, 12, 0, 0)); main.addView(p2l); }
            
            var p2Row = new android.widget.LinearLayout(ctx);
            p2Row.setOrientation(0);
            var x2 = createNumInput("X", FB.data.pos2.x);
            var y2 = createNumInput("Y", FB.data.pos2.y);
            var z2 = createNumInput("Z", FB.data.pos2.z);
            if (x2 !== null) { x2.setLayoutParams(new android.widget.LinearLayout.LayoutParams(0, -2, 1)); p2Row.addView(x2); }
            if (y2 !== null) { y2.setLayoutParams(new android.widget.LinearLayout.LayoutParams(0, -2, 1)); p2Row.addView(y2); }
            if (z2 !== null) { z2.setLayoutParams(new android.widget.LinearLayout.LayoutParams(0, -2, 1)); p2Row.addView(z2); }
            main.addView(p2Row);
            
            var usePos2Btn = createOutlineBtn("📍 使用当前位置", FB.colors.primary, function() {
                try {
                    if (x2 !== null) x2.setText(String(Math.floor(getPlayerX())));
                    if (y2 !== null) y2.setText(String(Math.floor(getPlayerY())));
                    if (z2 !== null) z2.setText(String(Math.floor(getPlayerZ())));
                } catch (e) {}
            });
            if (usePos2Btn !== null) main.addView(usePos2Btn);
            
            var airCheck = new android.widget.CheckBox(ctx);
            airCheck.setText(" 包含空气方块");
            airCheck.setTextSize(14);
            airCheck.setTextColor(android.graphics.Color.parseColor(FB.colors.textPrimary));
            airCheck.setLayoutParams(mp(0, 12, 0, 0));
            main.addView(airCheck);
            
            var div2 = createDivider(); if (div2 !== null) main.addView(div2);
            
            var exportBtn = createBtn("🚀  开始导出", FB.colors.primary, FB.colors.primaryDark, function() {
                try {
                    var name = String(nameInput.getText());
                    if (!name) { toast("请输入文件名"); return; }
                    
                    var px1 = parseInt(x1.getText()) || 0;
                    var py1 = parseInt(y1.getText()) || 0;
                    var pz1 = parseInt(z1.getText()) || 0;
                    var px2 = parseInt(x2.getText()) || 0;
                    var py2 = parseInt(y2.getText()) || 0;
                    var pz2 = parseInt(z2.getText()) || 0;
                    var air = airCheck.isChecked();
                    
                    if (FB.ui.mainWindow !== null) { FB.ui.mainWindow.dismiss(); FB.ui.mainWindow = null; }
                    startCoordExport(name, px1, py1, pz1, px2, py2, pz2, air);
                } catch (e) {}
            });
            if (exportBtn !== null) main.addView(exportBtn);
            
            var cancelBtn = createOutlineBtn("取消", FB.colors.textSecondary, function() {
                try { if (FB.ui.mainWindow !== null) { FB.ui.mainWindow.dismiss(); FB.ui.mainWindow = null; } showMainUI(); } catch (e) {}
            });
            if (cancelBtn !== null) main.addView(cancelBtn);
            
            var sv = createScroll(main);
            var popup = createSafePopup(sv, dip(330));
            if (popup === null) return;
            
            popup.showAtLocation(ctx.getWindow().getDecorView(), android.view.Gravity.CENTER, 0, 0);
            FB.ui.mainWindow = popup;
            
            main.setAlpha(0); main.setTranslationX(dip(30));
            main.animate().alpha(1).translationX(0).setDuration(200).start();
        } catch (e) { print("showCoordExportUI Error: " + e); }
    });
}

// ============================================
// 导入UI
// ============================================

function showImportUI() {
    runOnUiThread(function() {
        try {
            var ctx = getContext();
            if (ctx === null) return;
            
            var main = new android.widget.LinearLayout(ctx);
            main.setOrientation(1);
            main.setPadding(dip(24), dip(20), dip(24), dip(24));
            main.setBackground(createShadowBg(FB.colors.card, 20));
            
            var header = new android.widget.LinearLayout(ctx);
            header.setOrientation(0);
            header.setGravity(android.view.Gravity.CENTER_VERTICAL);
            
            var back = createLabel("← ", 22, FB.colors.primary, false);
            if (back !== null) {
                back.setPadding(0, 0, dip(8), 0);
                back.setOnClickListener(new android.view.View.OnClickListener({
                    onClick: function() { try { if (FB.ui.mainWindow !== null) { FB.ui.mainWindow.dismiss(); FB.ui.mainWindow = null; } showMainUI(); } catch (e) {} }
                }));
                header.addView(back);
            }
            
            var title = createLabel("导入建筑", 20, FB.colors.warning, true);
            if (title !== null) { title.setLayoutParams(new android.widget.LinearLayout.LayoutParams(0, -2, 1)); header.addView(title); }
            
            var closeBtn = createCloseBtn(function() { try { if (FB.ui.mainWindow !== null) { FB.ui.mainWindow.dismiss(); FB.ui.mainWindow = null; } } catch (e) {} });
            if (closeBtn !== null) header.addView(closeBtn);
            
            main.addView(header);
            var div1 = createDivider(); if (div1 !== null) main.addView(div1);
            
            var pathLabel = createLabel("文件路径", 13, FB.colors.textSecondary, false);
            if (pathLabel !== null) main.addView(pathLabel);
            
            var pathInput = createInput("输入.fb文件路径", FB.data.filePath || FB.config.defaultPath);
            if (pathInput !== null) main.addView(pathInput);
            
            var selectBtn = createOutlineBtn("📁 选择文件", FB.colors.primary, function() {
                try { if (FB.ui.mainWindow !== null) { FB.ui.mainWindow.dismiss(); FB.ui.mainWindow = null; } showFileListUI(function(path) { FB.data.filePath = path; showImportUI(); }); } catch (e) {}
            });
            if (selectBtn !== null) main.addView(selectBtn);
            
            var div2 = createDivider(); if (div2 !== null) main.addView(div2);
            
            var modeLabel = createLabel("导入模式", 14, FB.colors.textPrimary, true);
            if (modeLabel !== null) main.addView(modeLabel);
            
            var modeDesc = createLabel("选择建筑放置位置的计算方式", 11, FB.colors.textSecondary, false);
            if (modeDesc !== null) { modeDesc.setLayoutParams(mp(0, 2, 0, 8)); main.addView(modeDesc); }
            
            var rg = new android.widget.RadioGroup(ctx);
            rg.setOrientation(1);
            
            var r1 = new android.widget.RadioButton(ctx);
            r1.setText(" 按原始坐标"); r1.setTextSize(14);
            r1.setTextColor(android.graphics.Color.parseColor(FB.colors.textPrimary));
            r1.setId(1); r1.setChecked(true); rg.addView(r1);
            
            var r2 = new android.widget.RadioButton(ctx);
            r2.setText(" 以玩家为中心"); r2.setTextSize(14);
            r2.setTextColor(android.graphics.Color.parseColor(FB.colors.textPrimary));
            r2.setId(2); rg.addView(r2);
            
            var r3 = new android.widget.RadioButton(ctx);
            r3.setText(" 指定坐标"); r3.setTextSize(14);
            r3.setTextColor(android.graphics.Color.parseColor(FB.colors.textPrimary));
            r3.setId(3); rg.addView(r3);
            
            main.addView(rg);
            
            var customLayout = new android.widget.LinearLayout(ctx);
            customLayout.setOrientation(1);
            customLayout.setVisibility(android.view.View.GONE);
            customLayout.setLayoutParams(mpFill(0, 8, 0, 0));
            
            var cl = createLabel("目标坐标", 12, FB.colors.textSecondary, false);
            if (cl !== null) customLayout.addView(cl);
            
            var cRow = new android.widget.LinearLayout(ctx);
            cRow.setOrientation(0);
            var cx = createNumInput("X", Math.floor(getPlayerX()));
            var cy = createNumInput("Y", Math.floor(getPlayerY()));
            var cz = createNumInput("Z", Math.floor(getPlayerZ()));
            if (cx !== null) { cx.setLayoutParams(new android.widget.LinearLayout.LayoutParams(0, -2, 1)); cRow.addView(cx); }
            if (cy !== null) { cy.setLayoutParams(new android.widget.LinearLayout.LayoutParams(0, -2, 1)); cRow.addView(cy); }
            if (cz !== null) { cz.setLayoutParams(new android.widget.LinearLayout.LayoutParams(0, -2, 1)); cRow.addView(cz); }
            customLayout.addView(cRow);
            main.addView(customLayout);
            
            rg.setOnCheckedChangeListener(new android.widget.RadioGroup.OnCheckedChangeListener({
                onCheckedChanged: function(g, id) { try { customLayout.setVisibility(id === 3 ? android.view.View.VISIBLE : android.view.View.GONE); } catch (e) {} }
            }));
            
            var div3 = createDivider(); if (div3 !== null) main.addView(div3);
            
            var importBtn = createBtn("📥  开始导入", FB.colors.warning, "#FFA726", function() {
                try {
                    var path = String(pathInput.getText());
                    var mode = rg.getCheckedRadioButtonId();
                    if (!path) { toast("请输入文件路径"); return; }
                    
                    var tx = null, ty = null, tz = null;
                    if (mode === 2) { tx = Math.floor(getPlayerX()); ty = Math.floor(getPlayerY()); tz = Math.floor(getPlayerZ()); }
                    else if (mode === 3) { tx = parseInt(cx.getText()) || 0; ty = parseInt(cy.getText()) || 0; tz = parseInt(cz.getText()) || 0; }
                    
                    if (FB.ui.mainWindow !== null) { FB.ui.mainWindow.dismiss(); FB.ui.mainWindow = null; }
                    startImport(path, mode, tx, ty, tz);
                } catch (e) {}
            });
            if (importBtn !== null) main.addView(importBtn);
            
            var cancelBtn = createOutlineBtn("取消", FB.colors.textSecondary, function() { try { if (FB.ui.mainWindow !== null) { FB.ui.mainWindow.dismiss(); FB.ui.mainWindow = null; } showMainUI(); } catch (e) {} });
            if (cancelBtn !== null) main.addView(cancelBtn);
            
            var sv = createScroll(main);
            var popup = createSafePopup(sv, dip(340));
            if (popup === null) return;
            
            popup.showAtLocation(ctx.getWindow().getDecorView(), android.view.Gravity.CENTER, 0, 0);
            FB.ui.mainWindow = popup;
            main.setAlpha(0); main.setTranslationX(dip(30)); main.animate().alpha(1).translationX(0).setDuration(200).start();
        } catch (e) { print("showImportUI Error: " + e); }
    });
}

// ============================================
// 文件列表UI
// ============================================

function showFileListUI(callback) {
    runOnUiThread(function() {
        try {
            var ctx = getContext();
            if (ctx === null) return;
            
            var main = new android.widget.LinearLayout(ctx);
            main.setOrientation(1);
            main.setPadding(dip(24), dip(20), dip(24), dip(24));
            main.setBackground(createShadowBg(FB.colors.card, 20));
            
            var header = new android.widget.LinearLayout(ctx);
            header.setOrientation(0);
            header.setGravity(android.view.Gravity.CENTER_VERTICAL);
            
            var back = createLabel("← ", 22, FB.colors.primary, false);
            if (back !== null) {
                back.setPadding(0, 0, dip(8), 0);
                back.setOnClickListener(new android.view.View.OnClickListener({
                    onClick: function() { try { if (FB.ui.mainWindow !== null) { FB.ui.mainWindow.dismiss(); FB.ui.mainWindow = null; } showImportUI(); } catch (e) {} }
                }));
                header.addView(back);
            }
            
            var title = createLabel("选择文件", 20, FB.colors.primary, true);
            if (title !== null) { title.setLayoutParams(new android.widget.LinearLayout.LayoutParams(0, -2, 1)); header.addView(title); }
            
            var closeBtn = createCloseBtn(function() { try { if (FB.ui.mainWindow !== null) { FB.ui.mainWindow.dismiss(); FB.ui.mainWindow = null; } } catch (e) {} });
            if (closeBtn !== null) header.addView(closeBtn);
            
            main.addView(header);
            var div1 = createDivider(); if (div1 !== null) main.addView(div1);
            
            var list = new android.widget.LinearLayout(ctx);
            list.setOrientation(1);
            
            try {
                var dir = new java.io.File(FB.config.defaultPath);
                var files = dir.listFiles();
                var hasFiles = false;
                
                if (files !== null) {
                    for (var i = 0; i < files.length; i++) {
                        var f = files[i];
                        var fn = String(f.getName());
                        if (fn.endsWith(FB.config.fileExtension)) {
                            hasFiles = true;
                            (function(file, name) {
                                var item = new android.widget.LinearLayout(ctx);
                                item.setOrientation(0);
                                item.setGravity(android.view.Gravity.CENTER_VERTICAL);
                                item.setPadding(dip(14), dip(12), dip(14), dip(12));
                                item.setBackground(createBg("#F8F9FA", 10));
                                item.setLayoutParams(mpFill(0, 6, 0, 0));
                                
                                var icon = createLabel("📄", 18, null, false);
                                if (icon !== null) { icon.setPadding(0, 0, dip(12), 0); item.addView(icon); }
                                
                                var info = new android.widget.LinearLayout(ctx);
                                info.setOrientation(1);
                                info.setLayoutParams(new android.widget.LinearLayout.LayoutParams(0, -2, 1));
                                var nameLabel = createLabel(name, 14, FB.colors.textPrimary, false);
                                if (nameLabel !== null) info.addView(nameLabel);
                                var sizeLabel = createLabel(formatSize(file.length()), 11, FB.colors.textSecondary, false);
                                if (sizeLabel !== null) info.addView(sizeLabel);
                                item.addView(info);
                                
                                item.setOnClickListener(new android.view.View.OnClickListener({
                                    onClick: function() { try { if (FB.ui.mainWindow !== null) { FB.ui.mainWindow.dismiss(); FB.ui.mainWindow = null; } callback(String(file.getAbsolutePath())); } catch (e) {} }
                                }));
                                
                                list.addView(item);
                            })(f, fn);
                        }
                    }
                }
                
                if (!hasFiles) {
                    var empty = createLabel("没有找到 .fb 文件", 14, FB.colors.textSecondary, false);
                    if (empty !== null) { empty.setGravity(android.view.Gravity.CENTER); empty.setPadding(0, dip(40), 0, dip(40)); list.addView(empty); }
                }
            } catch (e) {}
            
            var sv = createScroll(list);
            if (sv !== null) { sv.setLayoutParams(new android.widget.LinearLayout.LayoutParams(-1, dip(300))); main.addView(sv); }
            
            var div2 = createDivider(); if (div2 !== null) main.addView(div2);
            var pathLabel = createLabel("📁 " + FB.config.defaultPath, 10, FB.colors.textSecondary, false);
            if (pathLabel !== null) main.addView(pathLabel);
            
            var cancelBtn = createOutlineBtn("取消", FB.colors.textSecondary, function() { try { if (FB.ui.mainWindow !== null) { FB.ui.mainWindow.dismiss(); FB.ui.mainWindow = null; } showImportUI(); } catch (e) {} });
            if (cancelBtn !== null) main.addView(cancelBtn);
            
            var popup = createSafePopup(main, dip(340));
            if (popup === null) return;
            popup.showAtLocation(ctx.getWindow().getDecorView(), android.view.Gravity.CENTER, 0, 0);
            FB.ui.mainWindow = popup;
            main.setAlpha(0); main.setTranslationX(dip(30)); main.animate().alpha(1).translationX(0).setDuration(200).start();
        } catch (e) { print("showFileListUI Error: " + e); }
    });
}

// ============================================
// 文件管理UI
// ============================================

function showFileManagerUI() {
    runOnUiThread(function() {
        try {
            var ctx = getContext();
            if (ctx === null) return;
            
            var main = new android.widget.LinearLayout(ctx);
            main.setOrientation(1);
            main.setPadding(dip(24), dip(20), dip(24), dip(24));
            main.setBackground(createShadowBg(FB.colors.card, 20));
            
            var header = new android.widget.LinearLayout(ctx);
            header.setOrientation(0);
            header.setGravity(android.view.Gravity.CENTER_VERTICAL);
            
            var back = createLabel("← ", 22, FB.colors.primary, false);
            if (back !== null) {
                back.setPadding(0, 0, dip(8), 0);
                back.setOnClickListener(new android.view.View.OnClickListener({
                    onClick: function() { try { if (FB.ui.mainWindow !== null) { FB.ui.mainWindow.dismiss(); FB.ui.mainWindow = null; } showMainUI(); } catch (e) {} }
                }));
                header.addView(back);
            }
            
            var title = createLabel("文件管理", 20, FB.colors.primary, true);
            if (title !== null) { title.setLayoutParams(new android.widget.LinearLayout.LayoutParams(0, -2, 1)); header.addView(title); }
            
            var closeBtn = createCloseBtn(function() { try { if (FB.ui.mainWindow !== null) { FB.ui.mainWindow.dismiss(); FB.ui.mainWindow = null; } } catch (e) {} });
            if (closeBtn !== null) header.addView(closeBtn);
            
            main.addView(header);
            var div1 = createDivider(); if (div1 !== null) main.addView(div1);
            
            var count = 0, size = 0;
            try {
                var dir = new java.io.File(FB.config.defaultPath);
                var files = dir.listFiles();
                if (files !== null) {
                    for (var i = 0; i < files.length; i++) {
                        if (String(files[i].getName()).endsWith(FB.config.fileExtension)) { count++; size += files[i].length(); }
                    }
                }
            } catch (e) {}
            
            var stats = new android.widget.LinearLayout(ctx);
            stats.setOrientation(0);
            stats.setGravity(android.view.Gravity.CENTER_VERTICAL);
            stats.setBackground(createBg(FB.colors.successLight, 10));
            stats.setPadding(dip(14), dip(10), dip(14), dip(10));
            var statsIcon = createLabel("📊 ", 16, FB.colors.success, false); if (statsIcon !== null) stats.addView(statsIcon);
            var statsText = createLabel(count + " 个文件，共 " + formatSize(size), 13, FB.colors.success, false); if (statsText !== null) stats.addView(statsText);
            main.addView(stats);
            
            var list = new android.widget.LinearLayout(ctx);
            list.setOrientation(1);
            
            try {
                var dir = new java.io.File(FB.config.defaultPath);
                var files = dir.listFiles();
                if (files !== null) {
                    for (var i = 0; i < files.length; i++) {
                        var f = files[i];
                        var fn = String(f.getName());
                        if (fn.endsWith(FB.config.fileExtension)) {
                            (function(file, name) {
                                var item = new android.widget.LinearLayout(ctx);
                                item.setOrientation(0);
                                item.setGravity(android.view.Gravity.CENTER_VERTICAL);
                                item.setPadding(dip(14), dip(10), dip(10), dip(10));
                                item.setBackground(createBg("#FAFAFA", 10, FB.colors.divider, 1));
                                item.setLayoutParams(mpFill(0, 6, 0, 0));
                                
                                var info = new android.widget.LinearLayout(ctx);
                                info.setOrientation(1);
                                info.setLayoutParams(new android.widget.LinearLayout.LayoutParams(0, -2, 1));
                                var nameLabel = createLabel("📄 " + name, 13, FB.colors.textPrimary, false); if (nameLabel !== null) info.addView(nameLabel);
                                var detailLabel = createLabel(formatSize(file.length()) + " | " + formatDate(file.lastModified()), 10, FB.colors.textSecondary, false); if (detailLabel !== null) info.addView(detailLabel);
                                item.addView(info);
                                
                                var del = createLabel("🗑️", 18, FB.colors.error, false);
                                if (del !== null) {
                                    del.setPadding(dip(12), dip(12), dip(12), dip(12));
                                    del.setOnClickListener(new android.view.View.OnClickListener({
                                        onClick: function() { try { file["delete"](); toast("已删除"); if (FB.ui.mainWindow !== null) { FB.ui.mainWindow.dismiss(); FB.ui.mainWindow = null; } showFileManagerUI(); } catch (e) { toast("删除失败"); } }
                                    }));
                                    item.addView(del);
                                }
                                list.addView(item);
                            })(f, fn);
                        }
                    }
                }
                if (count === 0) {
                    var empty = createLabel("暂无保存的文件", 14, FB.colors.textSecondary, false);
                    if (empty !== null) { empty.setGravity(android.view.Gravity.CENTER); empty.setPadding(0, dip(40), 0, dip(40)); list.addView(empty); }
                }
            } catch (e) {}
            
            var sv = createScroll(list);
            if (sv !== null) { sv.setLayoutParams(new android.widget.LinearLayout.LayoutParams(-1, dip(280))); main.addView(sv); }
            
            var div2 = createDivider(); if (div2 !== null) main.addView(div2);
            var backBtn = createOutlineBtn("返回", FB.colors.primary, function() { try { if (FB.ui.mainWindow !== null) { FB.ui.mainWindow.dismiss(); FB.ui.mainWindow = null; } showMainUI(); } catch (e) {} });
            if (backBtn !== null) main.addView(backBtn);
            
            var popup = createSafePopup(main, dip(360));
            if (popup === null) return;
            popup.showAtLocation(ctx.getWindow().getDecorView(), android.view.Gravity.CENTER, 0, 0);
            FB.ui.mainWindow = popup;
            main.setAlpha(0); main.setTranslationX(dip(30)); main.animate().alpha(1).translationX(0).setDuration(200).start();
        } catch (e) { print("showFileManagerUI Error: " + e); }
    });
}

// ============================================
// 进度UI
// ============================================

function showProgressUI(title, subtitle) {
    runOnUiThread(function() {
        try {
            var ctx = getContext();
            if (ctx === null) return;
            
            if (FB.ui.progressWindow !== null) { try { FB.ui.progressWindow.dismiss(); } catch (e) {} FB.ui.progressWindow = null; }
            
            var main = new android.widget.LinearLayout(ctx);
            main.setOrientation(1);
            main.setPadding(dip(28), dip(26), dip(28), dip(26));
            main.setBackground(createShadowBg(FB.colors.card, 20));
            main.setGravity(android.view.Gravity.CENTER);
            
            var iconText = createLabel("⏳", 36, null, false);
            if (iconText !== null) { iconText.setGravity(android.view.Gravity.CENTER); main.addView(iconText); }
            
            var t = createLabel(title, 20, FB.colors.primary, true);
            if (t !== null) { t.setGravity(android.view.Gravity.CENTER); t.setLayoutParams(mp(0, 12, 0, 0)); main.addView(t); }
            
            var st = createLabel(subtitle || "请稍候...", 12, FB.colors.textSecondary, false);
            if (st !== null) { st.setGravity(android.view.Gravity.CENTER); st.setLayoutParams(mp(0, 4, 0, 16)); main.addView(st); }
            
            var pb = new android.widget.ProgressBar(ctx, null, android.R.attr.progressBarStyleHorizontal);
            pb.setMax(100); pb.setProgress(0);
            pb.setLayoutParams(new android.widget.LinearLayout.LayoutParams(-1, dip(10)));
            main.addView(pb);
            
            var pt = createLabel("0%", 20, FB.colors.primary, true);
            if (pt !== null) { pt.setGravity(android.view.Gravity.CENTER); pt.setLayoutParams(mp(0, 12, 0, 0)); main.addView(pt); }
            
            var dt = createLabel("准备中...", 12, FB.colors.textSecondary, false);
            if (dt !== null) { dt.setGravity(android.view.Gravity.CENTER); dt.setLayoutParams(mp(0, 6, 0, 20)); main.addView(dt); }
            
            var cancelBtn = createOutlineBtn("取消", FB.colors.error, function() { cancelTask(); });
            if (cancelBtn !== null) main.addView(cancelBtn);
            
            var popup = createSafePopup(main, dip(300));
            if (popup === null) return;
            popup.showAtLocation(ctx.getWindow().getDecorView(), android.view.Gravity.CENTER, 0, 0);
            
            FB.ui.progressWindow = popup;
            FB.ui.progressBar = pb;
            FB.ui.progressText = pt;
            FB.ui.detailText = dt;
            
            main.setAlpha(0); main.setScaleX(0.9); main.setScaleY(0.9);
            main.animate().alpha(1).scaleX(1).scaleY(1).setDuration(200).start();
        } catch (e) { print("showProgressUI Error: " + e); }
    });
}

function updateProgress(pct, detail) {
    runOnUiThread(function() {
        try {
            if (FB.ui.progressBar !== null) FB.ui.progressBar.setProgress(Math.floor(pct));
            if (FB.ui.progressText !== null) FB.ui.progressText.setText(Math.floor(pct) + "%");
            if (FB.ui.detailText !== null && detail) FB.ui.detailText.setText(detail);
        } catch (e) {}
    });
}

function closeProgressUI() {
    runOnUiThread(function() {
        try {
            if (FB.ui.progressWindow !== null) { FB.ui.progressWindow.dismiss(); FB.ui.progressWindow = null; }
            FB.ui.progressBar = null; FB.ui.progressText = null; FB.ui.detailText = null;
        } catch (e) {}
    });
}

// ============================================
// 工具函数
// ============================================

function toast(msg) {
    runOnUiThread(function() {
        try { var ctx = getContext(); if (ctx !== null) { android.widget.Toast.makeText(ctx, msg, android.widget.Toast.LENGTH_SHORT).show(); } } catch (e) {}
    });
}

function formatSize(bytes) {
    if (bytes < 1024) return bytes + " B";
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + " KB";
    return (bytes / (1024 * 1024)).toFixed(2) + " MB";
}

function formatDate(ts) {
    try { var d = new java.util.Date(ts); var f = new java.text.SimpleDateFormat("MM-dd HH:mm"); return String(f.format(d)); } catch (e) { return ""; }
}

// ============================================
// 导出入口
// ============================================

function startChunkExport(fileName, range, yMin, yMax, includeAir) {
    if (FB.state.isProcessing) { toast("有任务进行中"); return; }
    
    var px = Math.floor(getPlayerX());
    var pz = Math.floor(getPlayerZ());
    var cx = Math.floor(px / 16);
    var cz = Math.floor(pz / 16);
    
    var x1 = (cx - range) * 16;
    var z1 = (cz - range) * 16;
    var x2 = (cx + range + 1) * 16 - 1;
    var z2 = (cz + range + 1) * 16 - 1;
    
    var modeText = FB.config.useMultiThread ? "多线程" : "标准";
    if (FB.config.streamExport) modeText += "+流式";
    clientMessage("§b[FB] §f" + modeText + "导出...");
    
    showProgressUI("区块导出", "扫描方块中...");
    executeExport(fileName, x1, yMin, z1, x2, yMax, z2, includeAir);
}

function startCoordExport(fileName, x1, y1, z1, x2, y2, z2, includeAir) {
    if (FB.state.isProcessing) { toast("有任务进行中"); return; }
    
    var minX = Math.min(x1, x2), maxX = Math.max(x1, x2);
    var minY = Math.max(0, Math.min(y1, y2)), maxY = Math.min(255, Math.max(y1, y2));
    var minZ = Math.min(z1, z2), maxZ = Math.max(z1, z2);
    
    var modeText = FB.config.useMultiThread ? "多线程" : "标准";
    if (FB.config.streamExport) modeText += "+流式";
    clientMessage("§b[FB] §f" + modeText + "导出...");
    
    showProgressUI("坐标导出", "扫描方块中...");
    executeExport(fileName, minX, minY, minZ, maxX, maxY, maxZ, includeAir);
}

// ============================================
// 统一导出函数 - 流式模式使用临时文件，最终输出统一格式
// ============================================

function executeExport(fileName, x1, y1, z1, x2, y2, z2, includeAir) {
    FB.state.isProcessing = true;

    var sizeX = x2 - x1 + 1;
    var sizeY = y2 - y1 + 1;
    var sizeZ = z2 - z1 + 1;
    var totalBlocks = sizeX * sizeY * sizeZ;

    var filePath = FB.config.defaultPath + fileName + FB.config.fileExtension;

    FB.state.workerThread = new java.lang.Thread(new java.lang.Runnable({
        run: function() {
            var writer = null;
            try {
                var created = new Date().getTime();
                var blockCount = 0;
                var processedBlocks = 0;
                var lastUpdate = java.lang.System.currentTimeMillis();

                if (FB.config.streamExport) {
                    // === 流式：直接写入最终 .fb，且最终格式仍为 FBUILD1+JSON ===
                    writer = new java.io.BufferedWriter(
                        new java.io.OutputStreamWriter(
                            new java.io.FileOutputStream(new java.io.File(filePath)),
                            "UTF-8"
                        )
                    );

                    // 写入 FBUILD1 + JSON 头（保证结构齐全）
                    writer.write("FBUILD1");
                    writer.write("{");
                    writer.write("\"version\":" + JSON.stringify(FB.config.version) + ",");
                    writer.write("\"name\":" + JSON.stringify(String(fileName)) + ",");
                    writer.write("\"created\":" + created + ",");
                    writer.write("\"origin\":{\"x\":" + x1 + ",\"y\":" + y1 + ",\"z\":" + z1 + "},");
                    writer.write("\"size\":{\"x\":" + sizeX + ",\"y\":" + sizeY + ",\"z\":" + sizeZ + "},");
                    writer.write("\"blocks\":[");

                    var first = true;

                    for (var y = y1; y <= y2 && FB.state.isProcessing; y++) {
                        for (var z = z1; z <= z2 && FB.state.isProcessing; z++) {
                            for (var x = x1; x <= x2 && FB.state.isProcessing; x++) {
                                var blockId = 0, blockData = 0;
                                try {
                                    blockId = getTile(x, y, z);
                                    blockData = Level.getData(x, y, z);
                                } catch (e) {}

                                if (blockId !== 0 || includeAir) {
                                    var bx = x - x1;
                                    var by = y - y1;
                                    var bz = z - z1;

                                    if (!first) writer.write(",");
                                    first = false;

                                    writer.write("{\"x\":" + bx + ",\"y\":" + by + ",\"z\":" + bz +
                                                 ",\"id\":" + blockId + ",\"data\":" + blockData + "}");
                                    blockCount++;

                                    if (FB.config.streamFlushInterval > 0 &&
                                        (blockCount % FB.config.streamFlushInterval) === 0) {
                                        try { writer.flush(); } catch (e) {}
                                    }
                                }

                                processedBlocks++;

                                var now = java.lang.System.currentTimeMillis();
                                if (now - lastUpdate > 100) {
                                    lastUpdate = now;
                                    var pct = (processedBlocks / totalBlocks) * 100;
                                    if (pct > 99) pct = 99;
                                    updateProgress(pct, "扫描: " + processedBlocks + "/" + totalBlocks + "\n保存: " + blockCount + " 方块");
                                }
                            }
                        }
                    }

                    // 如果中途取消：关闭 writer，并尽量删除半成品文件（避免留下不可用 .fb）
                    if (!FB.state.isProcessing) {
                        try { writer.close(); } catch (e) {}
                        writer = null;
                        try { new java.io.File(filePath)["delete"](); } catch (e) {}
                        FB.state.workerThread = null;
                        return;
                    }

                    updateProgress(100, "正在保存...");

                    // 结束 JSON（补齐 blockCount）
                    writer.write("],\"blockCount\":" + blockCount + "}");
                    writer.flush();
                    writer.close();
                    writer = null;

                } else {
                    // === 普通：保持原逻辑（内存 blocks + JSON.stringify） ===
                    var blocks = [];

                    for (var yy = y1; yy <= y2 && FB.state.isProcessing; yy++) {
                        for (var zz = z1; zz <= z2 && FB.state.isProcessing; zz++) {
                            for (var xx = x1; xx <= x2 && FB.state.isProcessing; xx++) {
                                var id0 = 0, data0 = 0;
                                try {
                                    id0 = getTile(xx, yy, zz);
                                    data0 = Level.getData(xx, yy, zz);
                                } catch (e) {}

                                if (id0 !== 0 || includeAir) {
                                    blocks.push({x: xx - x1, y: yy - y1, z: zz - z1, id: id0, data: data0});
                                    blockCount++;
                                }

                                processedBlocks++;

                                var now2 = java.lang.System.currentTimeMillis();
                                if (now2 - lastUpdate > 100) {
                                    lastUpdate = now2;
                                    var pct2 = (processedBlocks / totalBlocks) * 100;
                                    if (pct2 > 99) pct2 = 99;
                                    updateProgress(pct2, "扫描: " + processedBlocks + "/" + totalBlocks + "\n保存: " + blockCount + " 方块");
                                }
                            }
                        }
                    }

                    if (!FB.state.isProcessing) {
                        FB.state.workerThread = null;
                        return;
                    }

                    updateProgress(100, "正在保存...");

                    var dataObj = {
                        version: FB.config.version,
                        name: fileName,
                        created: created,
                        origin: {x: x1, y: y1, z: z1},
                        size: {x: sizeX, y: sizeY, z: sizeZ},
                        blocks: blocks,
                        blockCount: blockCount
                    };

                    var json = JSON.stringify(dataObj);
                    var content = "FBUILD1" + json;

                    var fos = new java.io.FileOutputStream(new java.io.File(filePath));
                    var bytes = new java.lang.String(content).getBytes("UTF-8");
                    fos.write(bytes);
                    fos.flush();
                    fos.close();
                }

                var fileSize = 0;
                try { fileSize = new java.io.File(filePath).length(); } catch (e) {}

                FB.state.isProcessing = false;
                FB.state.currentTask = null;
                FB.state.workerThread = null;

                closeProgressUI();

                clientMessage("§a[FB] §f导出完成!");
                clientMessage("§7文件: §e" + fileName + FB.config.fileExtension);
                clientMessage("§7方块: §e" + blockCount + " §7| 尺寸: §e" + sizeX + "x" + sizeY + "x" + sizeZ);
                clientMessage("§7大小: §e" + formatSize(fileSize));

                toast("导出成功!");

            } catch (e) {
                try { if (writer) writer.close(); } catch (ex) {}

                FB.state.isProcessing = false;
                FB.state.currentTask = null;
                FB.state.workerThread = null;

                closeProgressUI();
                clientMessage("§c[FB] 导出错误: " + e);
            }
        }
    }));

    FB.state.workerThread.start();
}

// ============================================
// 导入 - 统一格式读取
// ============================================

function startImport(filePath, mode, targetX, targetY, targetZ) {
    if (FB.state.isProcessing) { toast("有任务进行中"); return; }
    
    new java.lang.Thread(new java.lang.Runnable({
        run: function() {
            try {
                var file = new java.io.File(filePath);
                if (!file.exists()) { clientMessage("§c[FB] 文件不存在"); return; }
                
                clientMessage("§7[FB] 读取文件中...");
                
                var fis = new java.io.FileInputStream(file);
                var reader = new java.io.BufferedReader(new java.io.InputStreamReader(fis, "UTF-8"));
                var sb = new java.lang.StringBuilder();
                var line;
                while ((line = reader.readLine()) !== null) { sb.append(line); }
                reader.close();
                
                var content = String(sb.toString());
                
                if (content.indexOf("FBUILD1") !== 0) { 
                    clientMessage("§c[FB] 无效的文件格式"); 
                    return; 
                }
                
                var data = JSON.parse(content.substring(7));
                
                if (!data.blocks || data.blocks.length === 0) { 
                    clientMessage("§c[FB] 文件为空"); 
                    return; 
                }
                
                var offsetX, offsetY, offsetZ;
                if (mode === 1) {
                    offsetX = data.origin.x; 
                    offsetY = data.origin.y; 
                    offsetZ = data.origin.z;
                } else {
                    var halfX = Math.floor(data.size.x / 2);
                    var halfZ = Math.floor(data.size.z / 2);
                    offsetX = targetX - halfX; 
                    offsetY = targetY; 
                    offsetZ = targetZ - halfZ;
                }
                
                clientMessage("§b[FB] §f开始导入...");
                clientMessage("§7名称: §e" + data.name + " §7| 方块: §e" + data.blocks.length);
                clientMessage("§7尺寸: §e" + data.size.x + "x" + data.size.y + "x" + data.size.z);
                
                showProgressUI("导入建筑", "放置方块中...");
                
                FB.state.isProcessing = true;
                FB.state.currentTask = {
                    type: "import",
                    blocks: data.blocks,
                    offsetX: offsetX, 
                    offsetY: offsetY, 
                    offsetZ: offsetZ,
                    currentIndex: 0,
                    total: data.blocks.length,
                    placed: 0
                };
                
            } catch (e) { 
                clientMessage("§c[FB] 读取失败: " + e); 
            }
        }
    })).start();
}

// ============================================
// modTick
// ============================================

function modTick() {
    FB.state.tickCounter++;
    
    if (!FB.state.isProcessing || FB.state.currentTask === null) return;
    
    var task = FB.state.currentTask;
    if (task.type !== "import") return;
    
    try {
        var count = 0;
        var max = FB.config.importBlocksPerTick;
        var blocks = task.blocks;
        
        while (count < max && task.currentIndex < blocks.length && FB.state.isProcessing) {
            var block = blocks[task.currentIndex];
            if (block !== null && block !== undefined) {
                var x = task.offsetX + block.x;
                var y = task.offsetY + block.y;
                var z = task.offsetZ + block.z;
                if (y >= 0 && y <= 255) {
                    try { setTile(x, y, z, block.id, block.data); task.placed++; } catch (e) {}
                }
            }
            task.currentIndex++;
            count++;
        }
        
        if (FB.state.tickCounter % FB.config.progressUpdateInterval === 0) {
            var pct = (task.currentIndex / task.total) * 100;
            updateProgress(pct, "放置: " + task.placed + "/" + task.total);
        }
        
        if (task.currentIndex >= blocks.length) {
            var placed = task.placed;
            FB.state.isProcessing = false;
            FB.state.currentTask = null;
            closeProgressUI();
            clientMessage("§a[FB] §f导入完成! 放置: §e" + placed + " §7个方块");
            toast("导入成功!");
        }
    } catch (e) {
        FB.state.isProcessing = false;
        FB.state.currentTask = null;
        closeProgressUI();
        clientMessage("§c[FB] 错误: " + e);
    }
}

// ============================================
print("[FastBuild v" + FB.config.version + "] 已加载");