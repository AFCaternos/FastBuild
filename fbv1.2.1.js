// ============================================
// FastBuild v1.2.1 - 导入修复版
// 服务器建筑保存工具
// 适用于 Minecraft PE 0.14.3 - 1.1.5+
// ES5 语法
// ============================================

var FB = {};

// ============ 配置 ============
FB.config = {
    version: "1.2.1",
    fileExtension: ".fb",
    defaultPath: "/sdcard/games/com.mojang/fastbuild/",
    chunkSize: 16,
    // 每tick处理的方块数 - 大幅提高
    exportBlocksPerTick: 10000,
    importBlocksPerTick: 5000,
    // 进度更新间隔(tick)
    progressUpdateInterval: 5
};

// ============ 状态 ============
FB.state = {
    isProcessing: false,
    currentTask: null,
    tickCounter: 0
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
    success: "#4CAF50",
    warning: "#FF9800",
    error: "#F44336",
    card: "#FFFFFF",
    textPrimary: "#212121",
    textSecondary: "#757575",
    divider: "#BDBDBD"
};

// ============================================
// 上下文获取
// ============================================

function getContext() {
    try {
        if (FB.ui.ctx) return FB.ui.ctx;
        FB.ui.ctx = com.mojang.minecraftpe.MainActivity.currentMainActivity.get();
        return FB.ui.ctx;
    } catch (e) {
        return null;
    }
}

// ============================================
// 初始化
// ============================================

function newLevel() {
    new java.lang.Thread(new java.lang.Runnable({
        run: function() {
            try {
                java.lang.Thread.sleep(500);
                initDirectory();
                clientMessage("§b§l[FastBuild] §av" + FB.config.version + " §f已加载");
                clientMessage("§7命令: §e.fb");
            } catch (e) {}
        }
    })).start();
}

function selectLevelHook() {
    FB.ui.ctx = null;
}

function leaveGame() {
    closeAllWindows();
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
            if (cmd === "pos1" || cmd === "p1" || cmd === "1") {
                setPos1();
            } else if (cmd === "pos2" || cmd === "p2" || cmd === "2") {
                setPos2();
            } else if (cmd === "cancel" || cmd === "c") {
                cancelTask();
            } else if (cmd === "help" || cmd === "h") {
                showHelp();
            } else {
                showMainUI();
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
        FB.state.isProcessing = false;
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
    clientMessage("§e.fb pos1 §7- 设置位置1");
    clientMessage("§e.fb pos2 §7- 设置位置2");
    clientMessage("§e.fb cancel §7- 取消任务");
}

// ============================================
// UI工具
// ============================================

function dip(v) {
    try {
        var ctx = getContext();
        if (!ctx) return v;
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
                try { func(); } catch (e) {}
            }
        }));
    } catch (e) {}
}

function closeAllWindows() {
    runOnUiThread(function() {
        try { if (FB.ui.mainWindow) { FB.ui.mainWindow.dismiss(); FB.ui.mainWindow = null; } } catch (e) {}
        try { if (FB.ui.progressWindow) { FB.ui.progressWindow.dismiss(); FB.ui.progressWindow = null; } } catch (e) {}
    });
}

function createBg(color, radius, stroke, strokeWidth) {
    var d = new android.graphics.drawable.GradientDrawable();
    d.setColor(android.graphics.Color.parseColor(color));
    d.setCornerRadius(dip(radius));
    if (stroke) d.setStroke(dip(strokeWidth || 1), android.graphics.Color.parseColor(stroke));
    return d;
}

function createBtn(text, color, onClick) {
    var ctx = getContext();
    var btn = new android.widget.Button(ctx);
    btn.setText(text);
    btn.setTextColor(android.graphics.Color.WHITE);
    btn.setTextSize(14);
    btn.setAllCaps(false);
    btn.setBackground(createBg(color, 8));
    var p = new android.widget.LinearLayout.LayoutParams(-1, dip(46));
    p.setMargins(0, dip(6), 0, 0);
    btn.setLayoutParams(p);
    btn.setOnClickListener(new android.view.View.OnClickListener({
        onClick: function() { onClick(); }
    }));
    return btn;
}

function createOutlineBtn(text, color, onClick) {
    var ctx = getContext();
    var btn = new android.widget.Button(ctx);
    btn.setText(text);
    btn.setTextColor(android.graphics.Color.parseColor(color));
    btn.setTextSize(14);
    btn.setAllCaps(false);
    btn.setBackground(createBg("#FFFFFF", 8, color, 2));
    var p = new android.widget.LinearLayout.LayoutParams(-1, dip(46));
    p.setMargins(0, dip(6), 0, 0);
    btn.setLayoutParams(p);
    btn.setOnClickListener(new android.view.View.OnClickListener({
        onClick: function() { onClick(); }
    }));
    return btn;
}

function createInput(hint, val) {
    var ctx = getContext();
    var input = new android.widget.EditText(ctx);
    input.setHint(hint);
    if (val !== undefined) input.setText(String(val));
    input.setTextSize(14);
    input.setTextColor(android.graphics.Color.parseColor(FB.colors.textPrimary));
    input.setHintTextColor(android.graphics.Color.parseColor(FB.colors.textSecondary));
    input.setBackground(createBg("#F5F5F5", 8, FB.colors.divider, 1));
    input.setPadding(dip(14), dip(10), dip(14), dip(10));
    input.setSingleLine(true);
    var p = new android.widget.LinearLayout.LayoutParams(-1, -2);
    p.setMargins(0, dip(6), 0, 0);
    input.setLayoutParams(p);
    return input;
}

function createNumInput(hint, val) {
    var input = createInput(hint, val);
    input.setInputType(android.text.InputType.TYPE_CLASS_NUMBER | android.text.InputType.TYPE_NUMBER_FLAG_SIGNED);
    return input;
}

function createLabel(text, size, color, bold) {
    var ctx = getContext();
    var tv = new android.widget.TextView(ctx);
    tv.setText(text);
    tv.setTextSize(size || 14);
    tv.setTextColor(android.graphics.Color.parseColor(color || FB.colors.textPrimary));
    if (bold) tv.setTypeface(android.graphics.Typeface.DEFAULT_BOLD);
    return tv;
}

function createDivider() {
    var ctx = getContext();
    var v = new android.view.View(ctx);
    var p = new android.widget.LinearLayout.LayoutParams(-1, dip(1));
    p.setMargins(0, dip(14), 0, dip(14));
    v.setLayoutParams(p);
    v.setBackgroundColor(android.graphics.Color.parseColor(FB.colors.divider));
    return v;
}

function createScroll(content) {
    var ctx = getContext();
    var sv = new android.widget.ScrollView(ctx);
    sv.addView(content);
    return sv;
}

function mp(l, t, r, b) {
    var p = new android.widget.LinearLayout.LayoutParams(-2, -2);
    p.setMargins(dip(l), dip(t), dip(r), dip(b));
    return p;
}

// ============================================
// 安全弹窗 - 防止误触关闭
// ============================================

function createSafePopup(content, width) {
    var ctx = getContext();
    
    var outer = new android.widget.FrameLayout(ctx);
    outer.setLayoutParams(new android.widget.FrameLayout.LayoutParams(-1, -1));
    outer.setBackgroundColor(android.graphics.Color.argb(100, 0, 0, 0));
    
    // 拦截外部点击
    outer.setOnClickListener(new android.view.View.OnClickListener({
        onClick: function() { /* 不做任何事 */ }
    }));
    
    var wrapper = new android.widget.FrameLayout(ctx);
    var wp = new android.widget.FrameLayout.LayoutParams(width, -2);
    wp.gravity = android.view.Gravity.CENTER;
    wrapper.setLayoutParams(wp);
    wrapper.setOnClickListener(new android.view.View.OnClickListener({
        onClick: function() { /* 拦截 */ }
    }));
    wrapper.addView(content);
    outer.addView(wrapper);
    
    var popup = new android.widget.PopupWindow(outer, -1, -1, true);
    popup.setBackgroundDrawable(new android.graphics.drawable.ColorDrawable(android.graphics.Color.TRANSPARENT));
    popup.setOutsideTouchable(false);
    popup.setTouchable(true);
    popup.setFocusable(true);
    
    return popup;
}

function createCloseBtn(onClick) {
    var ctx = getContext();
    var btn = new android.widget.TextView(ctx);
    btn.setText("✕");
    btn.setTextSize(20);
    btn.setTextColor(android.graphics.Color.parseColor(FB.colors.textSecondary));
    btn.setPadding(dip(14), dip(6), dip(6), dip(6));
    btn.setOnClickListener(new android.view.View.OnClickListener({
        onClick: function() { onClick(); }
    }));
    return btn;
}

// ============================================
// 主界面
// ============================================

function showMainUI() {
    var ctx = getContext();
    if (!ctx) {
        clientMessage("§e[FB] 请稍后再试");
        return;
    }
    
    runOnUiThread(function() {
        if (FB.ui.mainWindow) {
            try { FB.ui.mainWindow.dismiss(); } catch (e) {}
        }
        
        var ctx = getContext();
        var main = new android.widget.LinearLayout(ctx);
        main.setOrientation(1);
        main.setPadding(dip(22), dip(18), dip(22), dip(22));
        main.setBackground(createBg(FB.colors.card, 16));
        
        // 标题栏
        var header = new android.widget.LinearLayout(ctx);
        header.setOrientation(0);
        header.setGravity(android.view.Gravity.CENTER_VERTICAL);
        
        var logo = new android.widget.LinearLayout(ctx);
        logo.setOrientation(0);
        logo.setLayoutParams(new android.widget.LinearLayout.LayoutParams(0, -2, 1));
        
        var icon = createLabel("🏗️ ", 20, FB.colors.primary, false);
        logo.addView(icon);
        var title = createLabel("FastBuild", 18, FB.colors.primary, true);
        logo.addView(title);
        header.addView(logo);
        
        header.addView(createCloseBtn(function() {
            FB.ui.mainWindow.dismiss();
            FB.ui.mainWindow = null;
        }));
        
        main.addView(header);
        
        var ver = createLabel("v" + FB.config.version + " | 高速建筑工具", 10, FB.colors.textSecondary, false);
        main.addView(ver);
        
        main.addView(createDivider());
        
        main.addView(createBtn("📦 区块导出", FB.colors.success, function() {
            FB.ui.mainWindow.dismiss();
            FB.ui.mainWindow = null;
            showChunkExportUI();
        }));
        
        main.addView(createBtn("📐 坐标导出", FB.colors.primary, function() {
            FB.ui.mainWindow.dismiss();
            FB.ui.mainWindow = null;
            showCoordExportUI();
        }));
        
        main.addView(createBtn("📥 导入建筑", FB.colors.warning, function() {
            FB.ui.mainWindow.dismiss();
            FB.ui.mainWindow = null;
            showImportUI();
        }));
        
        main.addView(createOutlineBtn("📁 文件管理", FB.colors.primary, function() {
            FB.ui.mainWindow.dismiss();
            FB.ui.mainWindow = null;
            showFileManagerUI();
        }));
        
        main.addView(createDivider());
        
        // 坐标信息
        var info = new android.widget.LinearLayout(ctx);
        info.setOrientation(1);
        info.setBackground(createBg("#E3F2FD", 8));
        info.setPadding(dip(12), dip(10), dip(12), dip(10));
        
        info.addView(createLabel("📍 " + Math.floor(getPlayerX()) + ", " + Math.floor(getPlayerY()) + ", " + Math.floor(getPlayerZ()), 12, FB.colors.textPrimary, false));
        info.addView(createLabel("P1:(" + FB.data.pos1.x + "," + FB.data.pos1.y + "," + FB.data.pos1.z + ") P2:(" + FB.data.pos2.x + "," + FB.data.pos2.y + "," + FB.data.pos2.z + ")", 10, FB.colors.textSecondary, false));
        
        main.addView(info);
        
        var popup = createSafePopup(main, dip(290));
        popup.showAtLocation(ctx.getWindow().getDecorView(), android.view.Gravity.CENTER, 0, 0);
        FB.ui.mainWindow = popup;
    });
}

// ============================================
// 区块导出UI
// ============================================

function showChunkExportUI() {
    runOnUiThread(function() {
        var ctx = getContext();
        var main = new android.widget.LinearLayout(ctx);
        main.setOrientation(1);
        main.setPadding(dip(22), dip(18), dip(22), dip(22));
        main.setBackground(createBg(FB.colors.card, 16));
        
        // 标题
        var header = new android.widget.LinearLayout(ctx);
        header.setOrientation(0);
        header.setGravity(android.view.Gravity.CENTER_VERTICAL);
        
        var back = createLabel("← ", 20, FB.colors.primary, false);
        back.setOnClickListener(new android.view.View.OnClickListener({
            onClick: function() {
                FB.ui.mainWindow.dismiss();
                FB.ui.mainWindow = null;
                showMainUI();
            }
        }));
        header.addView(back);
        
        var title = createLabel("区块导出", 18, FB.colors.primary, true);
        title.setLayoutParams(new android.widget.LinearLayout.LayoutParams(0, -2, 1));
        header.addView(title);
        
        header.addView(createCloseBtn(function() {
            FB.ui.mainWindow.dismiss();
            FB.ui.mainWindow = null;
        }));
        
        main.addView(header);
        main.addView(createDivider());
        
        main.addView(createLabel("文件名", 12, FB.colors.textSecondary, false));
        var nameInput = createInput("文件名", "chunk_export");
        main.addView(nameInput);
        
        var rl = createLabel("区块半径 (1-16)", 12, FB.colors.textSecondary, false);
        rl.setLayoutParams(mp(0, 10, 0, 0));
        main.addView(rl);
        var rangeInput = createNumInput("半径", "3");
        main.addView(rangeInput);
        
        var yl = createLabel("Y轴范围", 12, FB.colors.textSecondary, false);
        yl.setLayoutParams(mp(0, 10, 0, 0));
        main.addView(yl);
        
        var yRow = new android.widget.LinearLayout(ctx);
        yRow.setOrientation(0);
        var yMinInput = createNumInput("最小Y", "0");
        var yMaxInput = createNumInput("最大Y", "127");
        yMinInput.setLayoutParams(new android.widget.LinearLayout.LayoutParams(0, -2, 1));
        yMaxInput.setLayoutParams(new android.widget.LinearLayout.LayoutParams(0, -2, 1));
        yRow.addView(yMinInput);
        var sp = createLabel(" ~ ", 14, FB.colors.textSecondary, false);
        sp.setGravity(android.view.Gravity.CENTER);
        yRow.addView(sp);
        yRow.addView(yMaxInput);
        main.addView(yRow);
        
        var airCheck = new android.widget.CheckBox(ctx);
        airCheck.setText("包含空气方块");
        airCheck.setTextSize(14);
        airCheck.setTextColor(android.graphics.Color.parseColor(FB.colors.textPrimary));
        airCheck.setLayoutParams(mp(0, 10, 0, 0));
        main.addView(airCheck);
        
        main.addView(createDivider());
        
        main.addView(createBtn("🚀 开始导出", FB.colors.success, function() {
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
            
            FB.ui.mainWindow.dismiss();
            FB.ui.mainWindow = null;
            startChunkExport(name, range, yMin, yMax, air);
        }));
        
        main.addView(createOutlineBtn("取消", FB.colors.textSecondary, function() {
            FB.ui.mainWindow.dismiss();
            FB.ui.mainWindow = null;
            showMainUI();
        }));
        
        var sv = createScroll(main);
        var popup = createSafePopup(sv, dip(310));
        popup.showAtLocation(ctx.getWindow().getDecorView(), android.view.Gravity.CENTER, 0, 0);
        FB.ui.mainWindow = popup;
    });
}

// ============================================
// 坐标导出UI
// ============================================

function showCoordExportUI() {
    runOnUiThread(function() {
        var ctx = getContext();
        var main = new android.widget.LinearLayout(ctx);
        main.setOrientation(1);
        main.setPadding(dip(22), dip(18), dip(22), dip(22));
        main.setBackground(createBg(FB.colors.card, 16));
        
        var header = new android.widget.LinearLayout(ctx);
        header.setOrientation(0);
        header.setGravity(android.view.Gravity.CENTER_VERTICAL);
        
        var back = createLabel("← ", 20, FB.colors.primary, false);
        back.setOnClickListener(new android.view.View.OnClickListener({
            onClick: function() {
                FB.ui.mainWindow.dismiss();
                FB.ui.mainWindow = null;
                showMainUI();
            }
        }));
        header.addView(back);
        
        var title = createLabel("坐标导出", 18, FB.colors.primary, true);
        title.setLayoutParams(new android.widget.LinearLayout.LayoutParams(0, -2, 1));
        header.addView(title);
        
        header.addView(createCloseBtn(function() {
            FB.ui.mainWindow.dismiss();
            FB.ui.mainWindow = null;
        }));
        
        main.addView(header);
        main.addView(createDivider());
        
        main.addView(createLabel("文件名", 12, FB.colors.textSecondary, false));
        var nameInput = createInput("文件名", "coord_export");
        main.addView(nameInput);
        
        var p1l = createLabel("起点 (X, Y, Z)", 12, FB.colors.textSecondary, false);
        p1l.setLayoutParams(mp(0, 10, 0, 0));
        main.addView(p1l);
        
        var p1Row = new android.widget.LinearLayout(ctx);
        p1Row.setOrientation(0);
        var x1 = createNumInput("X", FB.data.pos1.x);
        var y1 = createNumInput("Y", FB.data.pos1.y);
        var z1 = createNumInput("Z", FB.data.pos1.z);
        x1.setLayoutParams(new android.widget.LinearLayout.LayoutParams(0, -2, 1));
        y1.setLayoutParams(new android.widget.LinearLayout.LayoutParams(0, -2, 1));
        z1.setLayoutParams(new android.widget.LinearLayout.LayoutParams(0, -2, 1));
        p1Row.addView(x1); p1Row.addView(y1); p1Row.addView(z1);
        main.addView(p1Row);
        
        main.addView(createOutlineBtn("📍 使用当前位置", FB.colors.primary, function() {
            x1.setText(String(Math.floor(getPlayerX())));
            y1.setText(String(Math.floor(getPlayerY())));
            z1.setText(String(Math.floor(getPlayerZ())));
        }));
        
        var p2l = createLabel("终点 (X, Y, Z)", 12, FB.colors.textSecondary, false);
        p2l.setLayoutParams(mp(0, 10, 0, 0));
        main.addView(p2l);
        
        var p2Row = new android.widget.LinearLayout(ctx);
        p2Row.setOrientation(0);
        var x2 = createNumInput("X", FB.data.pos2.x);
        var y2 = createNumInput("Y", FB.data.pos2.y);
        var z2 = createNumInput("Z", FB.data.pos2.z);
        x2.setLayoutParams(new android.widget.LinearLayout.LayoutParams(0, -2, 1));
        y2.setLayoutParams(new android.widget.LinearLayout.LayoutParams(0, -2, 1));
        z2.setLayoutParams(new android.widget.LinearLayout.LayoutParams(0, -2, 1));
        p2Row.addView(x2); p2Row.addView(y2); p2Row.addView(z2);
        main.addView(p2Row);
        
        main.addView(createOutlineBtn("📍 使用当前位置", FB.colors.primary, function() {
            x2.setText(String(Math.floor(getPlayerX())));
            y2.setText(String(Math.floor(getPlayerY())));
            z2.setText(String(Math.floor(getPlayerZ())));
        }));
        
        var airCheck = new android.widget.CheckBox(ctx);
        airCheck.setText("包含空气方块");
        airCheck.setTextSize(14);
        airCheck.setTextColor(android.graphics.Color.parseColor(FB.colors.textPrimary));
        airCheck.setLayoutParams(mp(0, 10, 0, 0));
        main.addView(airCheck);
        
        main.addView(createDivider());
        
        main.addView(createBtn("🚀 开始导出", FB.colors.success, function() {
            var name = String(nameInput.getText());
            if (!name) { toast("请输入文件名"); return; }
            
            var px1 = parseInt(x1.getText()) || 0;
            var py1 = parseInt(y1.getText()) || 0;
            var pz1 = parseInt(z1.getText()) || 0;
            var px2 = parseInt(x2.getText()) || 0;
            var py2 = parseInt(y2.getText()) || 0;
            var pz2 = parseInt(z2.getText()) || 0;
            var air = airCheck.isChecked();
            
            FB.ui.mainWindow.dismiss();
            FB.ui.mainWindow = null;
            startCoordExport(name, px1, py1, pz1, px2, py2, pz2, air);
        }));
        
        main.addView(createOutlineBtn("取消", FB.colors.textSecondary, function() {
            FB.ui.mainWindow.dismiss();
            FB.ui.mainWindow = null;
            showMainUI();
        }));
        
        var sv = createScroll(main);
        var popup = createSafePopup(sv, dip(320));
        popup.showAtLocation(ctx.getWindow().getDecorView(), android.view.Gravity.CENTER, 0, 0);
        FB.ui.mainWindow = popup;
    });
}

// ============================================
// 导入UI
// ============================================

function showImportUI() {
    runOnUiThread(function() {
        var ctx = getContext();
        var main = new android.widget.LinearLayout(ctx);
        main.setOrientation(1);
        main.setPadding(dip(22), dip(18), dip(22), dip(22));
        main.setBackground(createBg(FB.colors.card, 16));
        
        var header = new android.widget.LinearLayout(ctx);
        header.setOrientation(0);
        header.setGravity(android.view.Gravity.CENTER_VERTICAL);
        
        var back = createLabel("← ", 20, FB.colors.primary, false);
        back.setOnClickListener(new android.view.View.OnClickListener({
            onClick: function() {
                FB.ui.mainWindow.dismiss();
                FB.ui.mainWindow = null;
                showMainUI();
            }
        }));
        header.addView(back);
        
        var title = createLabel("导入建筑", 18, FB.colors.warning, true);
        title.setLayoutParams(new android.widget.LinearLayout.LayoutParams(0, -2, 1));
        header.addView(title);
        
        header.addView(createCloseBtn(function() {
            FB.ui.mainWindow.dismiss();
            FB.ui.mainWindow = null;
        }));
        
        main.addView(header);
        main.addView(createDivider());
        
        main.addView(createLabel("文件路径", 12, FB.colors.textSecondary, false));
        var pathInput = createInput("输入.fb文件路径", FB.data.filePath || FB.config.defaultPath);
        main.addView(pathInput);
        
        main.addView(createOutlineBtn("📁 选择文件", FB.colors.primary, function() {
            FB.ui.mainWindow.dismiss();
            FB.ui.mainWindow = null;
            showFileListUI(function(path) {
                FB.data.filePath = path;
                showImportUI();
            });
        }));
        
        main.addView(createDivider());
        
        main.addView(createLabel("导入模式", 13, FB.colors.textPrimary, true));
        
        var rg = new android.widget.RadioGroup(ctx);
        rg.setOrientation(1);
        
        var r1 = new android.widget.RadioButton(ctx);
        r1.setText("按原始坐标");
        r1.setTextSize(14);
        r1.setTextColor(android.graphics.Color.parseColor(FB.colors.textPrimary));
        r1.setId(1);
        r1.setChecked(true);
        rg.addView(r1);
        
        var r2 = new android.widget.RadioButton(ctx);
        r2.setText("以玩家位置为基准");
        r2.setTextSize(14);
        r2.setTextColor(android.graphics.Color.parseColor(FB.colors.textPrimary));
        r2.setId(2);
        rg.addView(r2);
        
        var r3 = new android.widget.RadioButton(ctx);
        r3.setText("指定位置");
        r3.setTextSize(14);
        r3.setTextColor(android.graphics.Color.parseColor(FB.colors.textPrimary));
        r3.setId(3);
        rg.addView(r3);
        
        main.addView(rg);
        
        // 自定义位置
        var customLayout = new android.widget.LinearLayout(ctx);
        customLayout.setOrientation(1);
        customLayout.setVisibility(android.view.View.GONE);
        
        var cl = createLabel("目标位置 (X, Y, Z)", 12, FB.colors.textSecondary, false);
        cl.setLayoutParams(mp(0, 8, 0, 0));
        customLayout.addView(cl);
        
        var cRow = new android.widget.LinearLayout(ctx);
        cRow.setOrientation(0);
        var cx = createNumInput("X", Math.floor(getPlayerX()));
        var cy = createNumInput("Y", Math.floor(getPlayerY()));
        var cz = createNumInput("Z", Math.floor(getPlayerZ()));
        cx.setLayoutParams(new android.widget.LinearLayout.LayoutParams(0, -2, 1));
        cy.setLayoutParams(new android.widget.LinearLayout.LayoutParams(0, -2, 1));
        cz.setLayoutParams(new android.widget.LinearLayout.LayoutParams(0, -2, 1));
        cRow.addView(cx); cRow.addView(cy); cRow.addView(cz);
        customLayout.addView(cRow);
        
        main.addView(customLayout);
        
        rg.setOnCheckedChangeListener(new android.widget.RadioGroup.OnCheckedChangeListener({
            onCheckedChanged: function(g, id) {
                customLayout.setVisibility(id === 3 ? android.view.View.VISIBLE : android.view.View.GONE);
            }
        }));
        
        main.addView(createDivider());
        
        main.addView(createBtn("📥 开始导入", FB.colors.warning, function() {
            var path = String(pathInput.getText());
            var mode = rg.getCheckedRadioButtonId();
            
            if (!path) { toast("请输入文件路径"); return; }
            
            var tx = null, ty = null, tz = null;
            if (mode === 2) {
                tx = Math.floor(getPlayerX());
                ty = Math.floor(getPlayerY());
                tz = Math.floor(getPlayerZ());
            } else if (mode === 3) {
                tx = parseInt(cx.getText()) || 0;
                ty = parseInt(cy.getText()) || 0;
                tz = parseInt(cz.getText()) || 0;
            }
            
            FB.ui.mainWindow.dismiss();
            FB.ui.mainWindow = null;
            startImport(path, mode, tx, ty, tz);
        }));
        
        main.addView(createOutlineBtn("取消", FB.colors.textSecondary, function() {
            FB.ui.mainWindow.dismiss();
            FB.ui.mainWindow = null;
            showMainUI();
        }));
        
        var sv = createScroll(main);
        var popup = createSafePopup(sv, dip(320));
        popup.showAtLocation(ctx.getWindow().getDecorView(), android.view.Gravity.CENTER, 0, 0);
        FB.ui.mainWindow = popup;
    });
}

// ============================================
// 文件列表UI
// ============================================

function showFileListUI(callback) {
    runOnUiThread(function() {
        var ctx = getContext();
        var main = new android.widget.LinearLayout(ctx);
        main.setOrientation(1);
        main.setPadding(dip(22), dip(18), dip(22), dip(22));
        main.setBackground(createBg(FB.colors.card, 16));
        
        var header = new android.widget.LinearLayout(ctx);
        header.setOrientation(0);
        header.setGravity(android.view.Gravity.CENTER_VERTICAL);
        
        var back = createLabel("← ", 20, FB.colors.primary, false);
        back.setOnClickListener(new android.view.View.OnClickListener({
            onClick: function() {
                FB.ui.mainWindow.dismiss();
                FB.ui.mainWindow = null;
                showImportUI();
            }
        }));
        header.addView(back);
        
        var title = createLabel("选择文件", 18, FB.colors.primary, true);
        title.setLayoutParams(new android.widget.LinearLayout.LayoutParams(0, -2, 1));
        header.addView(title);
        
        header.addView(createCloseBtn(function() {
            FB.ui.mainWindow.dismiss();
            FB.ui.mainWindow = null;
        }));
        
        main.addView(header);
        main.addView(createDivider());
        
        var list = new android.widget.LinearLayout(ctx);
        list.setOrientation(1);
        
        try {
            var dir = new java.io.File(FB.config.defaultPath);
            var files = dir.listFiles();
            var hasFiles = false;
            
            if (files) {
                for (var i = 0; i < files.length; i++) {
                    var f = files[i];
                    var fn = String(f.getName());
                    if (fn.endsWith(FB.config.fileExtension)) {
                        hasFiles = true;
                        (function(file, name) {
                            var item = new android.widget.LinearLayout(ctx);
                            item.setOrientation(0);
                            item.setGravity(android.view.Gravity.CENTER_VERTICAL);
                            item.setPadding(dip(12), dip(10), dip(12), dip(10));
                            item.setBackground(createBg("#F5F5F5", 8));
                            item.setLayoutParams(mp(0, 5, 0, 0));
                            
                            var info = new android.widget.LinearLayout(ctx);
                            info.setOrientation(1);
                            info.setLayoutParams(new android.widget.LinearLayout.LayoutParams(0, -2, 1));
                            info.addView(createLabel("📄 " + name, 13, FB.colors.textPrimary, false));
                            info.addView(createLabel(formatSize(file.length()), 10, FB.colors.textSecondary, false));
                            item.addView(info);
                            
                            item.setOnClickListener(new android.view.View.OnClickListener({
                                onClick: function() {
                                    FB.ui.mainWindow.dismiss();
                                    FB.ui.mainWindow = null;
                                    callback(String(file.getAbsolutePath()));
                                }
                            }));
                            
                            list.addView(item);
                        })(f, fn);
                    }
                }
            }
            
            if (!hasFiles) {
                var empty = createLabel("没有.fb文件", 14, FB.colors.textSecondary, false);
                empty.setGravity(android.view.Gravity.CENTER);
                empty.setPadding(0, dip(30), 0, dip(30));
                list.addView(empty);
            }
        } catch (e) {
            list.addView(createLabel("读取失败", 14, FB.colors.error, false));
        }
        
        var sv = createScroll(list);
        sv.setLayoutParams(new android.widget.LinearLayout.LayoutParams(-1, dip(280)));
        main.addView(sv);
        
        main.addView(createDivider());
        main.addView(createLabel("📁 " + FB.config.defaultPath, 9, FB.colors.textSecondary, false));
        
        main.addView(createOutlineBtn("取消", FB.colors.textSecondary, function() {
            FB.ui.mainWindow.dismiss();
            FB.ui.mainWindow = null;
            showImportUI();
        }));
        
        var popup = createSafePopup(main, dip(320));
        popup.showAtLocation(ctx.getWindow().getDecorView(), android.view.Gravity.CENTER, 0, 0);
        FB.ui.mainWindow = popup;
    });
}

// ============================================
// 文件管理UI
// ============================================

function showFileManagerUI() {
    runOnUiThread(function() {
        var ctx = getContext();
        var main = new android.widget.LinearLayout(ctx);
        main.setOrientation(1);
        main.setPadding(dip(22), dip(18), dip(22), dip(22));
        main.setBackground(createBg(FB.colors.card, 16));
        
        var header = new android.widget.LinearLayout(ctx);
        header.setOrientation(0);
        header.setGravity(android.view.Gravity.CENTER_VERTICAL);
        
        var back = createLabel("← ", 20, FB.colors.primary, false);
        back.setOnClickListener(new android.view.View.OnClickListener({
            onClick: function() {
                FB.ui.mainWindow.dismiss();
                FB.ui.mainWindow = null;
                showMainUI();
            }
        }));
        header.addView(back);
        
        var title = createLabel("文件管理", 18, FB.colors.primary, true);
        title.setLayoutParams(new android.widget.LinearLayout.LayoutParams(0, -2, 1));
        header.addView(title);
        
        header.addView(createCloseBtn(function() {
            FB.ui.mainWindow.dismiss();
            FB.ui.mainWindow = null;
        }));
        
        main.addView(header);
        main.addView(createDivider());
        
        // 统计
        var count = 0, size = 0;
        try {
            var dir = new java.io.File(FB.config.defaultPath);
            var files = dir.listFiles();
            if (files) {
                for (var i = 0; i < files.length; i++) {
                    if (String(files[i].getName()).endsWith(FB.config.fileExtension)) {
                        count++;
                        size += files[i].length();
                    }
                }
            }
        } catch (e) {}
        
        var stats = new android.widget.LinearLayout(ctx);
        stats.setBackground(createBg("#E8F5E9", 8));
        stats.setPadding(dip(12), dip(8), dip(12), dip(8));
        stats.addView(createLabel("📊 " + count + "个文件, " + formatSize(size), 12, FB.colors.success, false));
        main.addView(stats);
        
        var list = new android.widget.LinearLayout(ctx);
        list.setOrientation(1);
        
        try {
            var dir = new java.io.File(FB.config.defaultPath);
            var files = dir.listFiles();
            
            if (files) {
                for (var i = 0; i < files.length; i++) {
                    var f = files[i];
                    var fn = String(f.getName());
                    if (fn.endsWith(FB.config.fileExtension)) {
                        (function(file, name) {
                            var item = new android.widget.LinearLayout(ctx);
                            item.setOrientation(0);
                            item.setGravity(android.view.Gravity.CENTER_VERTICAL);
                            item.setPadding(dip(12), dip(8), dip(8), dip(8));
                            item.setBackground(createBg("#FAFAFA", 8, FB.colors.divider, 1));
                            item.setLayoutParams(mp(0, 5, 0, 0));
                            
                            var info = new android.widget.LinearLayout(ctx);
                            info.setOrientation(1);
                            info.setLayoutParams(new android.widget.LinearLayout.LayoutParams(0, -2, 1));
                            info.addView(createLabel("📄 " + name, 12, FB.colors.textPrimary, false));
                            info.addView(createLabel(formatSize(file.length()) + " | " + formatDate(file.lastModified()), 10, FB.colors.textSecondary, false));
                            item.addView(info);
                            
                            var del = createLabel("🗑️", 16, FB.colors.error, false);
                            del.setPadding(dip(10), dip(10), dip(10), dip(10));
                            del.setOnClickListener(new android.view.View.OnClickListener({
                                onClick: function() {
                                    try {
                                        file["delete"]();
                                        toast("已删除");
                                        FB.ui.mainWindow.dismiss();
                                        FB.ui.mainWindow = null;
                                        showFileManagerUI();
                                    } catch (e) {
                                        toast("删除失败");
                                    }
                                }
                            }));
                            item.addView(del);
                            
                            list.addView(item);
                        })(f, fn);
                    }
                }
            }
            
            if (count === 0) {
                var empty = createLabel("暂无文件", 14, FB.colors.textSecondary, false);
                empty.setGravity(android.view.Gravity.CENTER);
                empty.setPadding(0, dip(30), 0, dip(30));
                list.addView(empty);
            }
        } catch (e) {}
        
        var sv = createScroll(list);
        sv.setLayoutParams(new android.widget.LinearLayout.LayoutParams(-1, dip(260)));
        main.addView(sv);
        
        main.addView(createDivider());
        
        main.addView(createOutlineBtn("返回", FB.colors.primary, function() {
            FB.ui.mainWindow.dismiss();
            FB.ui.mainWindow = null;
            showMainUI();
        }));
        
        var popup = createSafePopup(main, dip(340));
        popup.showAtLocation(ctx.getWindow().getDecorView(), android.view.Gravity.CENTER, 0, 0);
        FB.ui.mainWindow = popup;
    });
}

// ============================================
// 进度UI
// ============================================

function showProgressUI(title, subtitle) {
    runOnUiThread(function() {
        var ctx = getContext();
        if (!ctx) return;
        
        if (FB.ui.progressWindow) {
            try { FB.ui.progressWindow.dismiss(); } catch (e) {}
        }
        
        var main = new android.widget.LinearLayout(ctx);
        main.setOrientation(1);
        main.setPadding(dip(24), dip(22), dip(24), dip(22));
        main.setBackground(createBg(FB.colors.card, 16));
        main.setGravity(android.view.Gravity.CENTER);
        
        var t = createLabel(title, 18, FB.colors.primary, true);
        t.setGravity(android.view.Gravity.CENTER);
        main.addView(t);
        
        var st = createLabel(subtitle || "请稍候...", 12, FB.colors.textSecondary, false);
        st.setGravity(android.view.Gravity.CENTER);
        st.setLayoutParams(mp(0, 4, 0, 14));
        main.addView(st);
        
        var pb = new android.widget.ProgressBar(ctx, null, android.R.attr.progressBarStyleHorizontal);
        pb.setMax(100);
        pb.setProgress(0);
        pb.setLayoutParams(new android.widget.LinearLayout.LayoutParams(-1, dip(8)));
        main.addView(pb);
        
        var pt = createLabel("0%", 16, FB.colors.textPrimary, true);
        pt.setGravity(android.view.Gravity.CENTER);
        pt.setLayoutParams(mp(0, 8, 0, 0));
        main.addView(pt);
        
        var dt = createLabel("准备中...", 11, FB.colors.textSecondary, false);
        dt.setGravity(android.view.Gravity.CENTER);
        dt.setLayoutParams(mp(0, 6, 0, 14));
        main.addView(dt);
        
        main.addView(createOutlineBtn("取消", FB.colors.error, function() {
            cancelTask();
        }));
        
        var popup = createSafePopup(main, dip(280));
        popup.showAtLocation(ctx.getWindow().getDecorView(), android.view.Gravity.CENTER, 0, 0);
        
        FB.ui.progressWindow = popup;
        FB.ui.progressBar = pb;
        FB.ui.progressText = pt;
        FB.ui.detailText = dt;
    });
}

function updateProgress(pct, detail) {
    runOnUiThread(function() {
        try {
            if (FB.ui.progressBar) FB.ui.progressBar.setProgress(Math.floor(pct));
            if (FB.ui.progressText) FB.ui.progressText.setText(Math.floor(pct) + "%");
            if (FB.ui.detailText && detail) FB.ui.detailText.setText(detail);
        } catch (e) {}
    });
}

function closeProgressUI() {
    runOnUiThread(function() {
        try {
            if (FB.ui.progressWindow) {
                FB.ui.progressWindow.dismiss();
                FB.ui.progressWindow = null;
            }
        } catch (e) {}
    });
}

// ============================================
// 工具函数
// ============================================

function toast(msg) {
    runOnUiThread(function() {
        try {
            android.widget.Toast.makeText(getContext(), msg, android.widget.Toast.LENGTH_SHORT).show();
        } catch (e) {}
    });
}

function formatSize(bytes) {
    if (bytes < 1024) return bytes + " B";
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + " KB";
    return (bytes / (1024 * 1024)).toFixed(2) + " MB";
}

function formatDate(ts) {
    try {
        var d = new java.util.Date(ts);
        var f = new java.text.SimpleDateFormat("MM-dd HH:mm");
        return String(f.format(d));
    } catch (e) {
        return "";
    }
}

// ============================================
// 导出 - 区块模式
// ============================================

function startChunkExport(fileName, range, yMin, yMax, includeAir) {
    if (FB.state.isProcessing) {
        toast("有任务进行中");
        return;
    }
    
    var px = Math.floor(getPlayerX());
    var pz = Math.floor(getPlayerZ());
    var cx = Math.floor(px / 16);
    var cz = Math.floor(pz / 16);
    
    var x1 = (cx - range) * 16;
    var z1 = (cz - range) * 16;
    var x2 = (cx + range + 1) * 16 - 1;
    var z2 = (cz + range + 1) * 16 - 1;
    
    clientMessage("§b[FB] §f开始导出...");
    clientMessage("§7范围: §e(" + x1 + "," + yMin + "," + z1 + ") - (" + x2 + "," + yMax + "," + z2 + ")");
    
    showProgressUI("区块导出", "扫描方块中...");
    
    startExportTask(fileName, x1, yMin, z1, x2, yMax, z2, includeAir);
}

// ============================================
// 导出 - 坐标模式
// ============================================

function startCoordExport(fileName, x1, y1, z1, x2, y2, z2, includeAir) {
    if (FB.state.isProcessing) {
        toast("有任务进行中");
        return;
    }
    
    var minX = Math.min(x1, x2), maxX = Math.max(x1, x2);
    var minY = Math.max(0, Math.min(y1, y2)), maxY = Math.min(255, Math.max(y1, y2));
    var minZ = Math.min(z1, z2), maxZ = Math.max(z1, z2);
    
    clientMessage("§b[FB] §f开始导出...");
    clientMessage("§7范围: §e(" + minX + "," + minY + "," + minZ + ") - (" + maxX + "," + maxY + "," + maxZ + ")");
    
    showProgressUI("坐标导出", "扫描方块中...");
    
    startExportTask(fileName, minX, minY, minZ, maxX, maxY, maxZ, includeAir);
}

// ============================================
// 导出任务（在modTick中执行）
// ============================================

function startExportTask(fileName, x1, y1, z1, x2, y2, z2, includeAir) {
    FB.state.isProcessing = true;
    
    var data = {
        version: FB.config.version,
        name: fileName,
        created: new Date().getTime(),
        origin: {x: x1, y: y1, z: z1},
        size: {x: x2 - x1 + 1, y: y2 - y1 + 1, z: z2 - z1 + 1},
        blocks: [],
        blockCount: 0
    };
    
    var total = data.size.x * data.size.y * data.size.z;
    
    FB.state.currentTask = {
        type: "export",
        fileName: fileName,
        data: data,
        x1: x1, y1: y1, z1: z1,
        x2: x2, y2: y2, z2: z2,
        curX: x1, curY: y1, curZ: z1,
        includeAir: includeAir,
        total: total,
        processed: 0
    };
}

// ============================================
// 导入任务
// ============================================

function startImport(filePath, mode, targetX, targetY, targetZ) {
    if (FB.state.isProcessing) {
        toast("有任务进行中");
        return;
    }
    
    // 在单独线程中读取文件
    new java.lang.Thread(new java.lang.Runnable({
        run: function() {
            try {
                var file = new java.io.File(filePath);
                if (!file.exists()) {
                    clientMessage("§c[FB] 文件不存在");
                    return;
                }
                
                clientMessage("§7[FB] 读取文件中...");
                
                var reader = new java.io.BufferedReader(new java.io.FileReader(file));
                var content = "";
                var line;
                while ((line = reader.readLine()) !== null) {
                    content += line;
                }
                reader.close();
                
                if (content.indexOf("FBUILD1") !== 0) {
                    clientMessage("§c[FB] 无效的文件格式");
                    return;
                }
                
                var data = JSON.parse(content.substring(7));
                
                if (!data.blocks || data.blocks.length === 0) {
                    clientMessage("§c[FB] 文件为空");
                    return;
                }
                
                // 计算偏移
                var offsetX, offsetY, offsetZ;
                var useOriginal = (mode === 1);
                
                if (useOriginal) {
                    offsetX = data.origin.x;
                    offsetY = data.origin.y;
                    offsetZ = data.origin.z;
                } else {
                    offsetX = targetX;
                    offsetY = targetY;
                    offsetZ = targetZ;
                }
                
                clientMessage("§b[FB] §f开始导入...");
                clientMessage("§7名称: §e" + data.name + " §7| 方块: §e" + data.blocks.length);
                clientMessage("§7目标: §e(" + offsetX + "," + offsetY + "," + offsetZ + ")");
                
                showProgressUI("导入建筑", "放置方块中...");
                
                // 设置导入任务
                FB.state.isProcessing = true;
                FB.state.currentTask = {
                    type: "import",
                    data: data,
                    blocks: data.blocks,
                    offsetX: offsetX,
                    offsetY: offsetY,
                    offsetZ: offsetZ,
                    useOriginal: useOriginal,
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
// modTick - 核心处理循环
// ============================================

function modTick() {
    FB.state.tickCounter++;
    
    if (!FB.state.isProcessing || !FB.state.currentTask) {
        return;
    }
    
    var task = FB.state.currentTask;
    
    try {
        if (task.type === "export") {
            processExportTick();
        } else if (task.type === "import") {
            processImportTick();
        }
    } catch (e) {
        clientMessage("§c[FB] 错误: " + e);
        FB.state.isProcessing = false;
        FB.state.currentTask = null;
        closeProgressUI();
    }
}

// ============================================
// 导出处理 - 每tick处理大量方块
// ============================================

function processExportTick() {
    var task = FB.state.currentTask;
    var blocksPerTick = FB.config.exportBlocksPerTick;
    var count = 0;
    
    while (count < blocksPerTick && FB.state.isProcessing) {
        // 检查完成
        if (task.curY > task.y2) {
            finishExport();
            return;
        }
        
        // 获取方块
        var blockId = 0;
        var blockData = 0;
        
        try {
            blockId = getTile(task.curX, task.curY, task.curZ);
            blockData = Level.getData(task.curX, task.curY, task.curZ);
        } catch (e) {}
        
        // 保存
        if (blockId !== 0 || task.includeAir) {
            task.data.blocks.push({
                x: task.curX - task.x1,
                y: task.curY - task.y1,
                z: task.curZ - task.z1,
                id: blockId,
                data: blockData
            });
            task.data.blockCount++;
        }
        
        task.processed++;
        count++;
        
        // 移动
        task.curX++;
        if (task.curX > task.x2) {
            task.curX = task.x1;
            task.curZ++;
            if (task.curZ > task.z2) {
                task.curZ = task.z1;
                task.curY++;
            }
        }
    }
    
    // 更新进度
    if (FB.state.tickCounter % FB.config.progressUpdateInterval === 0) {
        var pct = (task.processed / task.total) * 100;
        updateProgress(pct, "扫描: " + task.processed + "/" + task.total + "\n保存: " + task.data.blockCount + " 方块");
    }
}

function finishExport() {
    var task = FB.state.currentTask;
    var data = task.data;
    var fileName = task.fileName;
    
    FB.state.isProcessing = false;
    FB.state.currentTask = null;
    
    // 在线程中保存文件
    new java.lang.Thread(new java.lang.Runnable({
        run: function() {
            try {
                var filePath = FB.config.defaultPath + fileName + FB.config.fileExtension;
                var json = JSON.stringify(data);
                var content = "FBUILD1" + json;
                
                var file = new java.io.File(filePath);
                var writer = new java.io.FileWriter(file);
                writer.write(content);
                writer.close();
                
                closeProgressUI();
                
                clientMessage("§a[FB] §f导出完成!");
                clientMessage("§7文件: §e" + fileName + FB.config.fileExtension);
                clientMessage("§7方块: §e" + data.blockCount + " §7| 尺寸: §e" + data.size.x + "x" + data.size.y + "x" + data.size.z);
                clientMessage("§7大小: §e" + formatSize(file.length()));
                
                toast("导出成功!");
                
            } catch (e) {
                closeProgressUI();
                clientMessage("§c[FB] 保存失败: " + e);
            }
        }
    })).start();
}

// ============================================
// 导入处理 - 每tick处理大量方块
// ============================================

function processImportTick() {
    var task = FB.state.currentTask;
    if (!task || !task.blocks) {
        FB.state.isProcessing = false;
        FB.state.currentTask = null;
        return;
    }
    
    var blocksPerTick = FB.config.importBlocksPerTick;
    var count = 0;
    var blocks = task.blocks;
    
    while (count < blocksPerTick && task.currentIndex < blocks.length && FB.state.isProcessing) {
        var block = blocks[task.currentIndex];
        
        if (block) {
            var x, y, z;
            
            if (task.useOriginal) {
                x = task.data.origin.x + block.x;
                y = task.data.origin.y + block.y;
                z = task.data.origin.z + block.z;
            } else {
                x = task.offsetX + block.x;
                y = task.offsetY + block.y;
                z = task.offsetZ + block.z;
            }
            
            // 确保Y在有效范围
            if (y >= 0 && y <= 255) {
                try {
                    setTile(x, y, z, block.id, block.data);
                    task.placed++;
                } catch (e) {}
            }
        }
        
        task.currentIndex++;
        count++;
    }
    
    // 更新进度
    if (FB.state.tickCounter % FB.config.progressUpdateInterval === 0) {
        var pct = (task.currentIndex / task.total) * 100;
        updateProgress(pct, "处理: " + task.currentIndex + "/" + task.total + "\n放置: " + task.placed + " 方块");
    }
    
    // 检查完成
    if (task.currentIndex >= blocks.length) {
        finishImport();
    }
}

function finishImport() {
    var task = FB.state.currentTask;
    var placed = task ? task.placed : 0;
    
    FB.state.isProcessing = false;
    FB.state.currentTask = null;
    
    closeProgressUI();
    
    clientMessage("§a[FB] §f导入完成!");
    clientMessage("§7放置: §e" + placed + " §7个方块");
    
    toast("导入成功!");
}

// ============================================
// 加载提示
// ============================================

print("[FastBuild v" + FB.config.version + "] 已加载");