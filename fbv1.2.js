// ============================================
// FastBuild v1.2.0 - 性能优化版
// 服务器建筑保存工具
// 适用于 Minecraft PE 0.14.3 - 1.1.5+
// ES5 语法 + 多线程加速
// ============================================

var FB = {};

// ============ 配置 ============
FB.config = {
    version: "1.2.0",
    fileExtension: ".fb",
    defaultPath: "/sdcard/games/com.mojang/fastbuild/",
    chunkSize: 16,
    maxBlocksPerTick: 200,
    // 多线程配置
    useMultiThread: true,
    threadBatchSize: 5000, // 每批处理的方块数
    threadSleepMs: 1 // 线程休眠时间(ms)
};

// ============ 状态 ============
FB.state = {
    isProcessing: false,
    currentTask: null,
    progress: 0,
    totalBlocks: 0,
    processedBlocks: 0,
    tickCounter: 0,
    workerThread: null
};

// ============ UI ============
FB.ui = {
    ctx: null,
    mainWindow: null,
    progressWindow: null,
    currentDialog: null,
    progressBar: null,
    progressText: null,
    detailText: null
};

// ============ 数据 ============
FB.data = {
    pos1: {x: 0, y: 0, z: 0},
    pos2: {x: 0, y: 0, z: 0},
    targetPos: {x: 0, y: 0, z: 0},
    importMode: 0,
    filePath: "",
    fileName: "building",
    exportSpeed: 200
};

// ============ 颜色主题 ============
FB.colors = {
    primary: "#1976D2",
    primaryDark: "#1565C0",
    accent: "#FF5722",
    success: "#4CAF50",
    warning: "#FF9800",
    error: "#F44336",
    background: "#FAFAFA",
    card: "#FFFFFF",
    textPrimary: "#212121",
    textSecondary: "#757575",
    divider: "#BDBDBD"
};

// ============================================
// 上下文获取 - 无检测限制
// ============================================

function getContext() {
    try {
        if (FB.ui.ctx !== null && FB.ui.ctx !== undefined) {
            return FB.ui.ctx;
        }
        FB.ui.ctx = com.mojang.minecraftpe.MainActivity.currentMainActivity.get();
        return FB.ui.ctx;
    } catch (e) {
        try {
            FB.ui.ctx = com.mojang.minecraftpe.MainActivity.currentMainActivity.get();
            return FB.ui.ctx;
        } catch (e2) {
            return null;
        }
    }
}

// ============================================
// 初始化函数
// ============================================

function newLevel() {
    new java.lang.Thread(new java.lang.Runnable({
        run: function() {
            try {
                java.lang.Thread.sleep(800);
                initializeFB();
            } catch (e) {}
        }
    })).start();
}

function initializeFB() {
    try {
        initDirectory();
        clientMessage("§b§l[FastBuild] §av" + FB.config.version + " §f已加载");
        clientMessage("§7命令: §e.fb §7| §e.fb help");
    } catch (e) {
        clientMessage("§e[FastBuild] 初始化中...");
    }
}

function selectLevelHook() {
    FB.ui.ctx = null;
    stopWorkerThread();
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
        if (!dir.exists()) {
            dir.mkdirs();
        }
    } catch (e) {}
}

// ============================================
// 停止工作线程
// ============================================

function stopWorkerThread() {
    FB.state.isProcessing = false;
    if (FB.state.workerThread) {
        try {
            FB.state.workerThread.interrupt();
        } catch (e) {}
        FB.state.workerThread = null;
    }
}

// ============================================
// 命令处理 - 使用chatHook
// ============================================

function chatHook(str) {
    var msg = String(str).trim();
    
    // 支持多种前缀
    if (msg === ".fb" || msg.indexOf(".fb ") === 0 ||
        msg === "。fb" || msg.indexOf("。fb ") === 0) {
        preventDefault();
        
        var cmdPart = msg.replace(/^[.。]fb\s*/, "");
        var args = cmdPart.length > 0 ? cmdPart.split(" ") : [];
        
        handleCommand(args);
    }
}

function handleCommand(args) {
    // 确保上下文可用
    var ctx = getContext();
    if (!ctx) {
        // 尝试延迟执行
        new java.lang.Thread(new java.lang.Runnable({
            run: function() {
                try {
                    java.lang.Thread.sleep(300);
                    handleCommandDelayed(args);
                } catch (e) {}
            }
        })).start();
        return;
    }
    
    executeCommand(args);
}

function handleCommandDelayed(args) {
    var ctx = getContext();
    if (ctx) {
        executeCommand(args);
    } else {
        clientMessage("§e[FastBuild] 正在初始化，请稍后再试...");
    }
}

function executeCommand(args) {
    if (args.length === 0) {
        showMainUI();
        return;
    }
    
    var subCmd = args[0].toLowerCase();
    
    switch (subCmd) {
        case "help":
        case "?":
        case "h":
            showHelp();
            break;
        case "pos1":
        case "p1":
        case "1":
            setPos1();
            break;
        case "pos2":
        case "p2":
        case "2":
            setPos2();
            break;
        case "menu":
        case "m":
            showMainUI();
            break;
        case "cancel":
        case "c":
            cancelTask();
            break;
        default:
            clientMessage("§c未知命令: " + subCmd);
            clientMessage("§7输入 §e.fb help §7查看帮助");
    }
}

function setPos1() {
    FB.data.pos1.x = Math.floor(getPlayerX());
    FB.data.pos1.y = Math.floor(getPlayerY());
    FB.data.pos1.z = Math.floor(getPlayerZ());
    clientMessage("§a[FB] §f位置1: §e" + FB.data.pos1.x + ", " + FB.data.pos1.y + ", " + FB.data.pos1.z);
}

function setPos2() {
    FB.data.pos2.x = Math.floor(getPlayerX());
    FB.data.pos2.y = Math.floor(getPlayerY());
    FB.data.pos2.z = Math.floor(getPlayerZ());
    clientMessage("§a[FB] §f位置2: §e" + FB.data.pos2.x + ", " + FB.data.pos2.y + ", " + FB.data.pos2.z);
}

function cancelTask() {
    if (FB.state.isProcessing) {
        stopWorkerThread();
        closeProgressUI();
        clientMessage("§c[FastBuild] 任务已取消");
    } else {
        clientMessage("§7[FastBuild] 当前没有进行中的任务");
    }
}

function showHelp() {
    clientMessage("§b§l=== FastBuild v" + FB.config.version + " ===");
    clientMessage("§e.fb §7- 打开主菜单");
    clientMessage("§e.fb pos1/p1 §7- 设置位置1");
    clientMessage("§e.fb pos2/p2 §7- 设置位置2");
    clientMessage("§e.fb cancel §7- 取消当前任务");
    clientMessage("§e.fb help §7- 显示帮助");
    clientMessage("§7路径: §f" + FB.config.defaultPath);
}

// ============================================
// UI 工具函数
// ============================================

function dip(value) {
    try {
        var ctx = getContext();
        if (!ctx) return value;
        return Math.ceil(value * ctx.getResources().getDisplayMetrics().density);
    } catch (e) {
        return value;
    }
}

function runOnUiThread(func) {
    var ctx = getContext();
    if (!ctx) {
        return false;
    }
    
    try {
        ctx.runOnUiThread(new java.lang.Runnable({
            run: function() {
                try {
                    func();
                } catch (e) {
                    print("UI Error: " + e);
                }
            }
        }));
        return true;
    } catch (e) {
        return false;
    }
}

function closeAllWindows() {
    runOnUiThread(function() {
        try {
            if (FB.ui.mainWindow) {
                FB.ui.mainWindow.dismiss();
                FB.ui.mainWindow = null;
            }
        } catch (e) {}
        try {
            if (FB.ui.progressWindow) {
                FB.ui.progressWindow.dismiss();
                FB.ui.progressWindow = null;
            }
        } catch (e) {}
    });
}

// ============================================
// UI 组件创建
// ============================================

function createRoundedBackground(color, radius, strokeColor, strokeWidth) {
    var drawable = new android.graphics.drawable.GradientDrawable();
    drawable.setColor(android.graphics.Color.parseColor(color));
    drawable.setCornerRadius(dip(radius));
    if (strokeColor && strokeWidth) {
        drawable.setStroke(dip(strokeWidth), android.graphics.Color.parseColor(strokeColor));
    }
    return drawable;
}

function createCloseButton(onClick) {
    var ctx = getContext();
    var btn = new android.widget.TextView(ctx);
    btn.setText("✕");
    btn.setTextSize(20);
    btn.setTextColor(android.graphics.Color.parseColor(FB.colors.textSecondary));
    btn.setPadding(dip(16), dip(8), dip(8), dip(8));
    btn.setGravity(android.view.Gravity.CENTER);
    
    btn.setOnClickListener(new android.view.View.OnClickListener({
        onClick: function(v) {
            onClick();
        }
    }));
    
    return btn;
}

function createMaterialButton(text, color, onClick) {
    var ctx = getContext();
    var btn = new android.widget.Button(ctx);
    btn.setText(text);
    btn.setTextColor(android.graphics.Color.WHITE);
    btn.setTextSize(14);
    btn.setAllCaps(false);
    btn.setBackground(createRoundedBackground(color, 8, null, 0));
    
    var params = new android.widget.LinearLayout.LayoutParams(-1, dip(48));
    params.setMargins(0, dip(8), 0, 0);
    btn.setLayoutParams(params);
    btn.setPadding(dip(16), 0, dip(16), 0);
    
    btn.setOnClickListener(new android.view.View.OnClickListener({
        onClick: function(v) {
            onClick();
        }
    }));
    
    return btn;
}

function createOutlineButton(text, color, onClick) {
    var ctx = getContext();
    var btn = new android.widget.Button(ctx);
    btn.setText(text);
    btn.setTextColor(android.graphics.Color.parseColor(color));
    btn.setTextSize(14);
    btn.setAllCaps(false);
    btn.setBackground(createRoundedBackground("#FFFFFF", 8, color, 2));
    
    var params = new android.widget.LinearLayout.LayoutParams(-1, dip(48));
    params.setMargins(0, dip(8), 0, 0);
    btn.setLayoutParams(params);
    btn.setPadding(dip(16), 0, dip(16), 0);
    
    btn.setOnClickListener(new android.view.View.OnClickListener({
        onClick: function(v) {
            onClick();
        }
    }));
    
    return btn;
}

function createInputField(hint, defaultValue) {
    var ctx = getContext();
    var input = new android.widget.EditText(ctx);
    input.setHint(hint);
    if (defaultValue !== undefined && defaultValue !== null) {
        input.setText(String(defaultValue));
    }
    input.setTextSize(14);
    input.setTextColor(android.graphics.Color.parseColor(FB.colors.textPrimary));
    input.setHintTextColor(android.graphics.Color.parseColor(FB.colors.textSecondary));
    input.setBackground(createRoundedBackground("#F5F5F5", 8, FB.colors.divider, 1));
    input.setPadding(dip(16), dip(12), dip(16), dip(12));
    input.setSingleLine(true);
    
    var params = new android.widget.LinearLayout.LayoutParams(-1, -2);
    params.setMargins(0, dip(8), 0, 0);
    input.setLayoutParams(params);
    
    return input;
}

function createNumberInput(hint, defaultValue) {
    var input = createInputField(hint, defaultValue);
    input.setInputType(android.text.InputType.TYPE_CLASS_NUMBER | 
                       android.text.InputType.TYPE_NUMBER_FLAG_SIGNED);
    return input;
}

function createLabel(text, size, color, bold) {
    var ctx = getContext();
    var label = new android.widget.TextView(ctx);
    label.setText(text);
    label.setTextSize(size || 14);
    label.setTextColor(android.graphics.Color.parseColor(color || FB.colors.textPrimary));
    if (bold) {
        label.setTypeface(android.graphics.Typeface.DEFAULT_BOLD);
    }
    return label;
}

function createDivider() {
    var ctx = getContext();
    var divider = new android.view.View(ctx);
    var params = new android.widget.LinearLayout.LayoutParams(-1, dip(1));
    params.setMargins(0, dip(16), 0, dip(16));
    divider.setLayoutParams(params);
    divider.setBackgroundColor(android.graphics.Color.parseColor(FB.colors.divider));
    return divider;
}

function createScrollView(content) {
    var ctx = getContext();
    var scroll = new android.widget.ScrollView(ctx);
    scroll.addView(content);
    scroll.setVerticalScrollBarEnabled(true);
    return scroll;
}

// ============================================
// 创建防误触的PopupWindow
// ============================================

function createSafePopup(content, width, height) {
    var ctx = getContext();
    
    // 创建外层容器，用于拦截外部点击
    var outerLayout = new android.widget.FrameLayout(ctx);
    outerLayout.setLayoutParams(new android.widget.FrameLayout.LayoutParams(-1, -1));
    
    // 设置半透明背景
    outerLayout.setBackgroundColor(android.graphics.Color.argb(120, 0, 0, 0));
    
    // 外层容器点击不做任何事（拦截点击但不关闭）
    outerLayout.setOnClickListener(new android.view.View.OnClickListener({
        onClick: function(v) {
            // 不做任何事，仅拦截点击
        }
    }));
    
    // 内容容器
    var contentWrapper = new android.widget.FrameLayout(ctx);
    var wrapperParams = new android.widget.FrameLayout.LayoutParams(width, -2);
    wrapperParams.gravity = android.view.Gravity.CENTER;
    contentWrapper.setLayoutParams(wrapperParams);
    
    // 阻止内容区域的点击传递到外层
    contentWrapper.setOnClickListener(new android.view.View.OnClickListener({
        onClick: function(v) {
            // 拦截，不传递
        }
    }));
    
    contentWrapper.addView(content);
    outerLayout.addView(contentWrapper);
    
    // 创建全屏PopupWindow
    var popup = new android.widget.PopupWindow(
        outerLayout,
        android.widget.LinearLayout.LayoutParams.MATCH_PARENT,
        android.widget.LinearLayout.LayoutParams.MATCH_PARENT,
        true
    );
    
    popup.setBackgroundDrawable(new android.graphics.drawable.ColorDrawable(android.graphics.Color.TRANSPARENT));
    popup.setOutsideTouchable(false);
    popup.setTouchable(true);
    popup.setFocusable(true);
    
    // 禁用返回键关闭（可选）
    popup.setOnDismissListener(null);
    
    return popup;
}

// ============================================
// 主界面
// ============================================

function showMainUI() {
    var ctx = getContext();
    if (!ctx) {
        clientMessage("§e[FastBuild] UI初始化中，请稍后再试");
        return;
    }
    
    runOnUiThread(function() {
        if (FB.ui.mainWindow) {
            try {
                FB.ui.mainWindow.dismiss();
            } catch (e) {}
        }
        
        var ctx = getContext();
        
        // 主容器
        var mainLayout = new android.widget.LinearLayout(ctx);
        mainLayout.setOrientation(android.widget.LinearLayout.VERTICAL);
        mainLayout.setGravity(android.view.Gravity.CENTER_HORIZONTAL);
        mainLayout.setPadding(dip(24), dip(20), dip(24), dip(24));
        mainLayout.setBackground(createRoundedBackground(FB.colors.card, 16, null, 0));
        
        // 标题栏
        var headerLayout = new android.widget.LinearLayout(ctx);
        headerLayout.setOrientation(android.widget.LinearLayout.HORIZONTAL);
        headerLayout.setGravity(android.view.Gravity.CENTER_VERTICAL);
        headerLayout.setLayoutParams(new android.widget.LinearLayout.LayoutParams(-1, -2));
        
        // Logo
        var logoLayout = new android.widget.LinearLayout(ctx);
        logoLayout.setOrientation(android.widget.LinearLayout.HORIZONTAL);
        logoLayout.setGravity(android.view.Gravity.CENTER_VERTICAL);
        logoLayout.setLayoutParams(new android.widget.LinearLayout.LayoutParams(0, -2, 1));
        
        var iconText = new android.widget.TextView(ctx);
        iconText.setText("🏗️ ");
        iconText.setTextSize(22);
        logoLayout.addView(iconText);
        
        var titleText = createLabel("FastBuild", 20, FB.colors.primary, true);
        logoLayout.addView(titleText);
        
        headerLayout.addView(logoLayout);
        
        // 关闭按钮
        var closeBtn = createCloseButton(function() {
            if (FB.ui.mainWindow) {
                FB.ui.mainWindow.dismiss();
                FB.ui.mainWindow = null;
            }
        });
        headerLayout.addView(closeBtn);
        
        mainLayout.addView(headerLayout);
        
        // 版本信息
        var versionText = createLabel("v" + FB.config.version + " | 多线程加速", 11, FB.colors.textSecondary, false);
        versionText.setGravity(android.view.Gravity.CENTER);
        mainLayout.addView(versionText);
        
        mainLayout.addView(createDivider());
        
        // 功能按钮
        var sectionLabel = createLabel("选择操作", 12, FB.colors.textSecondary, false);
        mainLayout.addView(sectionLabel);
        
        // 导出 - 区块模式
        mainLayout.addView(createMaterialButton("📦 区块导出", FB.colors.success, function() {
            FB.ui.mainWindow.dismiss();
            FB.ui.mainWindow = null;
            showChunkExportUI();
        }));
        
        // 导出 - 坐标模式
        mainLayout.addView(createMaterialButton("📐 坐标导出", FB.colors.primary, function() {
            FB.ui.mainWindow.dismiss();
            FB.ui.mainWindow = null;
            showCoordExportUI();
        }));
        
        // 导入
        mainLayout.addView(createMaterialButton("📥 导入建筑", FB.colors.warning, function() {
            FB.ui.mainWindow.dismiss();
            FB.ui.mainWindow = null;
            showImportUI();
        }));
        
        // 文件管理
        mainLayout.addView(createOutlineButton("📁 文件管理", FB.colors.primary, function() {
            FB.ui.mainWindow.dismiss();
            FB.ui.mainWindow = null;
            showFileManagerUI();
        }));
        
        mainLayout.addView(createDivider());
        
        // 坐标信息
        var infoLayout = new android.widget.LinearLayout(ctx);
        infoLayout.setOrientation(android.widget.LinearLayout.VERTICAL);
        infoLayout.setBackground(createRoundedBackground("#E3F2FD", 8, null, 0));
        infoLayout.setPadding(dip(12), dip(10), dip(12), dip(10));
        infoLayout.setLayoutParams(new android.widget.LinearLayout.LayoutParams(-1, -2));
        
        var posText = createLabel(
            "📍 当前: " + Math.floor(getPlayerX()) + ", " + Math.floor(getPlayerY()) + ", " + Math.floor(getPlayerZ()),
            12, FB.colors.textPrimary, false
        );
        infoLayout.addView(posText);
        
        var savedPosLabel = createLabel(
            "P1: (" + FB.data.pos1.x + "," + FB.data.pos1.y + "," + FB.data.pos1.z + ")  " +
            "P2: (" + FB.data.pos2.x + "," + FB.data.pos2.y + "," + FB.data.pos2.z + ")",
            10, FB.colors.textSecondary, false
        );
        infoLayout.addView(savedPosLabel);
        
        mainLayout.addView(infoLayout);
        
        // 创建安全的弹窗
        var popup = createSafePopup(mainLayout, dip(300), -2);
        popup.showAtLocation(ctx.getWindow().getDecorView(), android.view.Gravity.CENTER, 0, 0);
        
        FB.ui.mainWindow = popup;
    });
}

// ============================================
// 区块导出界面
// ============================================

function showChunkExportUI() {
    runOnUiThread(function() {
        var ctx = getContext();
        
        var mainLayout = new android.widget.LinearLayout(ctx);
        mainLayout.setOrientation(android.widget.LinearLayout.VERTICAL);
        mainLayout.setPadding(dip(24), dip(20), dip(24), dip(24));
        mainLayout.setBackground(createRoundedBackground(FB.colors.card, 16, null, 0));
        
        // 标题栏
        var headerLayout = new android.widget.LinearLayout(ctx);
        headerLayout.setOrientation(android.widget.LinearLayout.HORIZONTAL);
        headerLayout.setGravity(android.view.Gravity.CENTER_VERTICAL);
        headerLayout.setLayoutParams(new android.widget.LinearLayout.LayoutParams(-1, -2));
        
        var backBtn = new android.widget.TextView(ctx);
        backBtn.setText("← ");
        backBtn.setTextSize(20);
        backBtn.setTextColor(android.graphics.Color.parseColor(FB.colors.primary));
        backBtn.setOnClickListener(new android.view.View.OnClickListener({
            onClick: function(v) {
                FB.ui.mainWindow.dismiss();
                FB.ui.mainWindow = null;
                showMainUI();
            }
        }));
        headerLayout.addView(backBtn);
        
        var title = createLabel("区块导出", 18, FB.colors.primary, true);
        title.setLayoutParams(new android.widget.LinearLayout.LayoutParams(0, -2, 1));
        headerLayout.addView(title);
        
        var closeBtn = createCloseButton(function() {
            FB.ui.mainWindow.dismiss();
            FB.ui.mainWindow = null;
        });
        headerLayout.addView(closeBtn);
        
        mainLayout.addView(headerLayout);
        
        var desc = createLabel("以玩家为中心导出周围区块", 12, FB.colors.textSecondary, false);
        mainLayout.addView(desc);
        
        mainLayout.addView(createDivider());
        
        // 文件名
        mainLayout.addView(createLabel("文件名", 12, FB.colors.textSecondary, false));
        var fileNameInput = createInputField("文件名", "chunk_export");
        mainLayout.addView(fileNameInput);
        
        // 区块范围
        var rangeLabel = createLabel("区块半径 (1-16)", 12, FB.colors.textSecondary, false);
        rangeLabel.setLayoutParams(createMarginParams(0, 12, 0, 0));
        mainLayout.addView(rangeLabel);
        var rangeInput = createNumberInput("半径", "3");
        mainLayout.addView(rangeInput);
        
        // Y轴范围
        var yLabel = createLabel("Y轴范围", 12, FB.colors.textSecondary, false);
        yLabel.setLayoutParams(createMarginParams(0, 12, 0, 0));
        mainLayout.addView(yLabel);
        
        var yLayout = new android.widget.LinearLayout(ctx);
        yLayout.setOrientation(android.widget.LinearLayout.HORIZONTAL);
        
        var yMinInput = createNumberInput("最小Y", "0");
        var yMaxInput = createNumberInput("最大Y", "127");
        yMinInput.setLayoutParams(new android.widget.LinearLayout.LayoutParams(0, -2, 1));
        yMaxInput.setLayoutParams(new android.widget.LinearLayout.LayoutParams(0, -2, 1));
        
        yLayout.addView(yMinInput);
        var spacer = createLabel(" ~ ", 14, FB.colors.textSecondary, false);
        spacer.setGravity(android.view.Gravity.CENTER);
        yLayout.addView(spacer);
        yLayout.addView(yMaxInput);
        mainLayout.addView(yLayout);
        
        // 包含空气
        var airCheck = new android.widget.CheckBox(ctx);
        airCheck.setText("包含空气方块");
        airCheck.setTextSize(14);
        airCheck.setTextColor(android.graphics.Color.parseColor(FB.colors.textPrimary));
        airCheck.setLayoutParams(createMarginParams(0, 12, 0, 0));
        mainLayout.addView(airCheck);
        
        mainLayout.addView(createDivider());
        
        // 开始按钮
        mainLayout.addView(createMaterialButton("🚀 开始导出", FB.colors.success, function() {
            var fileName = String(fileNameInput.getText());
            var range = parseInt(rangeInput.getText()) || 3;
            var yMin = parseInt(yMinInput.getText()) || 0;
            var yMax = parseInt(yMaxInput.getText()) || 127;
            var includeAir = airCheck.isChecked();
            
            if (!fileName) {
                toast("请输入文件名");
                return;
            }
            
            range = Math.max(1, Math.min(16, range));
            yMin = Math.max(0, Math.min(255, yMin));
            yMax = Math.max(0, Math.min(255, yMax));
            if (yMin > yMax) { var t = yMin; yMin = yMax; yMax = t; }
            
            FB.ui.mainWindow.dismiss();
            FB.ui.mainWindow = null;
            startChunkExportMultiThread(fileName, range, yMin, yMax, includeAir);
        }));
        
        mainLayout.addView(createOutlineButton("取消", FB.colors.textSecondary, function() {
            FB.ui.mainWindow.dismiss();
            FB.ui.mainWindow = null;
            showMainUI();
        }));
        
        var scrollView = createScrollView(mainLayout);
        var popup = createSafePopup(scrollView, dip(320), dip(500));
        popup.showAtLocation(ctx.getWindow().getDecorView(), android.view.Gravity.CENTER, 0, 0);
        
        FB.ui.mainWindow = popup;
    });
}

// ============================================
// 坐标导出界面
// ============================================

function showCoordExportUI() {
    runOnUiThread(function() {
        var ctx = getContext();
        
        var mainLayout = new android.widget.LinearLayout(ctx);
        mainLayout.setOrientation(android.widget.LinearLayout.VERTICAL);
        mainLayout.setPadding(dip(24), dip(20), dip(24), dip(24));
        mainLayout.setBackground(createRoundedBackground(FB.colors.card, 16, null, 0));
        
        // 标题栏
        var headerLayout = new android.widget.LinearLayout(ctx);
        headerLayout.setOrientation(android.widget.LinearLayout.HORIZONTAL);
        headerLayout.setGravity(android.view.Gravity.CENTER_VERTICAL);
        headerLayout.setLayoutParams(new android.widget.LinearLayout.LayoutParams(-1, -2));
        
        var backBtn = new android.widget.TextView(ctx);
        backBtn.setText("← ");
        backBtn.setTextSize(20);
        backBtn.setTextColor(android.graphics.Color.parseColor(FB.colors.primary));
        backBtn.setOnClickListener(new android.view.View.OnClickListener({
            onClick: function(v) {
                FB.ui.mainWindow.dismiss();
                FB.ui.mainWindow = null;
                showMainUI();
            }
        }));
        headerLayout.addView(backBtn);
        
        var title = createLabel("坐标导出", 18, FB.colors.primary, true);
        title.setLayoutParams(new android.widget.LinearLayout.LayoutParams(0, -2, 1));
        headerLayout.addView(title);
        
        var closeBtn = createCloseButton(function() {
            FB.ui.mainWindow.dismiss();
            FB.ui.mainWindow = null;
        });
        headerLayout.addView(closeBtn);
        
        mainLayout.addView(headerLayout);
        mainLayout.addView(createDivider());
        
        // 文件名
        mainLayout.addView(createLabel("文件名", 12, FB.colors.textSecondary, false));
        var fileNameInput = createInputField("文件名", "coord_export");
        mainLayout.addView(fileNameInput);
        
        // 位置1
        var pos1Label = createLabel("起始位置 (X, Y, Z)", 12, FB.colors.textSecondary, false);
        pos1Label.setLayoutParams(createMarginParams(0, 12, 0, 0));
        mainLayout.addView(pos1Label);
        
        var pos1Layout = new android.widget.LinearLayout(ctx);
        pos1Layout.setOrientation(android.widget.LinearLayout.HORIZONTAL);
        
        var x1Input = createNumberInput("X", FB.data.pos1.x);
        var y1Input = createNumberInput("Y", FB.data.pos1.y);
        var z1Input = createNumberInput("Z", FB.data.pos1.z);
        x1Input.setLayoutParams(new android.widget.LinearLayout.LayoutParams(0, -2, 1));
        y1Input.setLayoutParams(new android.widget.LinearLayout.LayoutParams(0, -2, 1));
        z1Input.setLayoutParams(new android.widget.LinearLayout.LayoutParams(0, -2, 1));
        pos1Layout.addView(x1Input);
        pos1Layout.addView(y1Input);
        pos1Layout.addView(z1Input);
        mainLayout.addView(pos1Layout);
        
        mainLayout.addView(createOutlineButton("📍 当前位置设为起点", FB.colors.primary, function() {
            x1Input.setText(String(Math.floor(getPlayerX())));
            y1Input.setText(String(Math.floor(getPlayerY())));
            z1Input.setText(String(Math.floor(getPlayerZ())));
        }));
        
        // 位置2
        var pos2Label = createLabel("结束位置 (X, Y, Z)", 12, FB.colors.textSecondary, false);
        pos2Label.setLayoutParams(createMarginParams(0, 12, 0, 0));
        mainLayout.addView(pos2Label);
        
        var pos2Layout = new android.widget.LinearLayout(ctx);
        pos2Layout.setOrientation(android.widget.LinearLayout.HORIZONTAL);
        
        var x2Input = createNumberInput("X", FB.data.pos2.x);
        var y2Input = createNumberInput("Y", FB.data.pos2.y);
        var z2Input = createNumberInput("Z", FB.data.pos2.z);
        x2Input.setLayoutParams(new android.widget.LinearLayout.LayoutParams(0, -2, 1));
        y2Input.setLayoutParams(new android.widget.LinearLayout.LayoutParams(0, -2, 1));
        z2Input.setLayoutParams(new android.widget.LinearLayout.LayoutParams(0, -2, 1));
        pos2Layout.addView(x2Input);
        pos2Layout.addView(y2Input);
        pos2Layout.addView(z2Input);
        mainLayout.addView(pos2Layout);
        
        mainLayout.addView(createOutlineButton("📍 当前位置设为终点", FB.colors.primary, function() {
            x2Input.setText(String(Math.floor(getPlayerX())));
            y2Input.setText(String(Math.floor(getPlayerY())));
            z2Input.setText(String(Math.floor(getPlayerZ())));
        }));
        
        // 包含空气
        var airCheck = new android.widget.CheckBox(ctx);
        airCheck.setText("包含空气方块");
        airCheck.setTextSize(14);
        airCheck.setTextColor(android.graphics.Color.parseColor(FB.colors.textPrimary));
        airCheck.setLayoutParams(createMarginParams(0, 12, 0, 0));
        mainLayout.addView(airCheck);
        
        mainLayout.addView(createDivider());
        
        mainLayout.addView(createMaterialButton("🚀 开始导出", FB.colors.success, function() {
            var fileName = String(fileNameInput.getText());
            var includeAir = airCheck.isChecked();
            
            var x1 = parseInt(x1Input.getText()) || 0;
            var y1 = parseInt(y1Input.getText()) || 0;
            var z1 = parseInt(z1Input.getText()) || 0;
            var x2 = parseInt(x2Input.getText()) || 0;
            var y2 = parseInt(y2Input.getText()) || 0;
            var z2 = parseInt(z2Input.getText()) || 0;
            
            if (!fileName) {
                toast("请输入文件名");
                return;
            }
            
            FB.ui.mainWindow.dismiss();
            FB.ui.mainWindow = null;
            startCoordExportMultiThread(fileName, x1, y1, z1, x2, y2, z2, includeAir);
        }));
        
        mainLayout.addView(createOutlineButton("取消", FB.colors.textSecondary, function() {
            FB.ui.mainWindow.dismiss();
            FB.ui.mainWindow = null;
            showMainUI();
        }));
        
        var scrollView = createScrollView(mainLayout);
        var popup = createSafePopup(scrollView, dip(340), dip(520));
        popup.showAtLocation(ctx.getWindow().getDecorView(), android.view.Gravity.CENTER, 0, 0);
        
        FB.ui.mainWindow = popup;
    });
}

// ============================================
// 导入界面
// ============================================

function showImportUI() {
    runOnUiThread(function() {
        var ctx = getContext();
        
        var mainLayout = new android.widget.LinearLayout(ctx);
        mainLayout.setOrientation(android.widget.LinearLayout.VERTICAL);
        mainLayout.setPadding(dip(24), dip(20), dip(24), dip(24));
        mainLayout.setBackground(createRoundedBackground(FB.colors.card, 16, null, 0));
        
        // 标题栏
        var headerLayout = new android.widget.LinearLayout(ctx);
        headerLayout.setOrientation(android.widget.LinearLayout.HORIZONTAL);
        headerLayout.setGravity(android.view.Gravity.CENTER_VERTICAL);
        headerLayout.setLayoutParams(new android.widget.LinearLayout.LayoutParams(-1, -2));
        
        var backBtn = new android.widget.TextView(ctx);
        backBtn.setText("← ");
        backBtn.setTextSize(20);
        backBtn.setTextColor(android.graphics.Color.parseColor(FB.colors.primary));
        backBtn.setOnClickListener(new android.view.View.OnClickListener({
            onClick: function(v) {
                FB.ui.mainWindow.dismiss();
                FB.ui.mainWindow = null;
                showMainUI();
            }
        }));
        headerLayout.addView(backBtn);
        
        var title = createLabel("导入建筑", 18, FB.colors.warning, true);
        title.setLayoutParams(new android.widget.LinearLayout.LayoutParams(0, -2, 1));
        headerLayout.addView(title);
        
        var closeBtn = createCloseButton(function() {
            FB.ui.mainWindow.dismiss();
            FB.ui.mainWindow = null;
        });
        headerLayout.addView(closeBtn);
        
        mainLayout.addView(headerLayout);
        mainLayout.addView(createDivider());
        
        // 文件路径
        mainLayout.addView(createLabel("文件路径", 12, FB.colors.textSecondary, false));
        var pathInput = createInputField("输入.fb文件路径", FB.data.filePath || FB.config.defaultPath);
        mainLayout.addView(pathInput);
        
        mainLayout.addView(createOutlineButton("📁 选择文件", FB.colors.primary, function() {
            FB.ui.mainWindow.dismiss();
            FB.ui.mainWindow = null;
            showFileListUI(function(path) {
                FB.data.filePath = path;
                showImportUI();
            });
        }));
        
        mainLayout.addView(createDivider());
        
        // 导入模式
        mainLayout.addView(createLabel("导入模式", 14, FB.colors.textPrimary, true));
        
        var radioGroup = new android.widget.RadioGroup(ctx);
        radioGroup.setOrientation(android.widget.LinearLayout.VERTICAL);
        
        var radio1 = new android.widget.RadioButton(ctx);
        radio1.setText("按原始坐标");
        radio1.setTextSize(14);
        radio1.setTextColor(android.graphics.Color.parseColor(FB.colors.textPrimary));
        radio1.setId(1);
        radio1.setChecked(true);
        radioGroup.addView(radio1);
        
        var radio2 = new android.widget.RadioButton(ctx);
        radio2.setText("以玩家位置为基准");
        radio2.setTextSize(14);
        radio2.setTextColor(android.graphics.Color.parseColor(FB.colors.textPrimary));
        radio2.setId(2);
        radioGroup.addView(radio2);
        
        var radio3 = new android.widget.RadioButton(ctx);
        radio3.setText("指定位置");
        radio3.setTextSize(14);
        radio3.setTextColor(android.graphics.Color.parseColor(FB.colors.textPrimary));
        radio3.setId(3);
        radioGroup.addView(radio3);
        
        mainLayout.addView(radioGroup);
        
        // 自定义位置输入
        var customPosLayout = new android.widget.LinearLayout(ctx);
        customPosLayout.setOrientation(android.widget.LinearLayout.VERTICAL);
        customPosLayout.setVisibility(android.view.View.GONE);
        
        var cpLabel = createLabel("目标位置 (X, Y, Z)", 12, FB.colors.textSecondary, false);
        cpLabel.setLayoutParams(createMarginParams(0, 8, 0, 0));
        customPosLayout.addView(cpLabel);
        
        var posLayout = new android.widget.LinearLayout(ctx);
        posLayout.setOrientation(android.widget.LinearLayout.HORIZONTAL);
        
        var xInput = createNumberInput("X", Math.floor(getPlayerX()));
        var yInput = createNumberInput("Y", Math.floor(getPlayerY()));
        var zInput = createNumberInput("Z", Math.floor(getPlayerZ()));
        xInput.setLayoutParams(new android.widget.LinearLayout.LayoutParams(0, -2, 1));
        yInput.setLayoutParams(new android.widget.LinearLayout.LayoutParams(0, -2, 1));
        zInput.setLayoutParams(new android.widget.LinearLayout.LayoutParams(0, -2, 1));
        posLayout.addView(xInput);
        posLayout.addView(yInput);
        posLayout.addView(zInput);
        customPosLayout.addView(posLayout);
        
        mainLayout.addView(customPosLayout);
        
        radioGroup.setOnCheckedChangeListener(new android.widget.RadioGroup.OnCheckedChangeListener({
            onCheckedChanged: function(group, checkedId) {
                customPosLayout.setVisibility(checkedId === 3 ? 
                    android.view.View.VISIBLE : android.view.View.GONE);
            }
        }));
        
        mainLayout.addView(createDivider());
        
        mainLayout.addView(createMaterialButton("📥 开始导入", FB.colors.warning, function() {
            var filePath = String(pathInput.getText());
            var mode = radioGroup.getCheckedRadioButtonId();
            
            var targetX = 0, targetY = 0, targetZ = 0;
            
            if (mode === 1) {
                targetX = null;
            } else if (mode === 2) {
                targetX = Math.floor(getPlayerX());
                targetY = Math.floor(getPlayerY());
                targetZ = Math.floor(getPlayerZ());
            } else {
                targetX = parseInt(xInput.getText()) || 0;
                targetY = parseInt(yInput.getText()) || 0;
                targetZ = parseInt(zInput.getText()) || 0;
            }
            
            if (!filePath) {
                toast("请输入文件路径");
                return;
            }
            
            FB.ui.mainWindow.dismiss();
            FB.ui.mainWindow = null;
            startImportMultiThread(filePath, mode, targetX, targetY, targetZ);
        }));
        
        mainLayout.addView(createOutlineButton("取消", FB.colors.textSecondary, function() {
            FB.ui.mainWindow.dismiss();
            FB.ui.mainWindow = null;
            showMainUI();
        }));
        
        var scrollView = createScrollView(mainLayout);
        var popup = createSafePopup(scrollView, dip(340), dip(480));
        popup.showAtLocation(ctx.getWindow().getDecorView(), android.view.Gravity.CENTER, 0, 0);
        
        FB.ui.mainWindow = popup;
    });
}

// ============================================
// 文件列表界面
// ============================================

function showFileListUI(callback) {
    runOnUiThread(function() {
        var ctx = getContext();
        
        var mainLayout = new android.widget.LinearLayout(ctx);
        mainLayout.setOrientation(android.widget.LinearLayout.VERTICAL);
        mainLayout.setPadding(dip(24), dip(20), dip(24), dip(24));
        mainLayout.setBackground(createRoundedBackground(FB.colors.card, 16, null, 0));
        
        // 标题栏
        var headerLayout = new android.widget.LinearLayout(ctx);
        headerLayout.setOrientation(android.widget.LinearLayout.HORIZONTAL);
        headerLayout.setGravity(android.view.Gravity.CENTER_VERTICAL);
        headerLayout.setLayoutParams(new android.widget.LinearLayout.LayoutParams(-1, -2));
        
        var backBtn = new android.widget.TextView(ctx);
        backBtn.setText("← ");
        backBtn.setTextSize(20);
        backBtn.setTextColor(android.graphics.Color.parseColor(FB.colors.primary));
        backBtn.setOnClickListener(new android.view.View.OnClickListener({
            onClick: function(v) {
                FB.ui.mainWindow.dismiss();
                FB.ui.mainWindow = null;
                showImportUI();
            }
        }));
        headerLayout.addView(backBtn);
        
        var title = createLabel("选择文件", 18, FB.colors.primary, true);
        title.setLayoutParams(new android.widget.LinearLayout.LayoutParams(0, -2, 1));
        headerLayout.addView(title);
        
        var closeBtn = createCloseButton(function() {
            FB.ui.mainWindow.dismiss();
            FB.ui.mainWindow = null;
        });
        headerLayout.addView(closeBtn);
        
        mainLayout.addView(headerLayout);
        mainLayout.addView(createDivider());
        
        // 文件列表
        var fileListLayout = new android.widget.LinearLayout(ctx);
        fileListLayout.setOrientation(android.widget.LinearLayout.VERTICAL);
        
        try {
            var dir = new java.io.File(FB.config.defaultPath);
            var files = dir.listFiles();
            var hasFiles = false;
            
            if (files && files.length > 0) {
                for (var i = 0; i < files.length; i++) {
                    var file = files[i];
                    var fileName = String(file.getName());
                    
                    if (fileName.endsWith(FB.config.fileExtension)) {
                        hasFiles = true;
                        (function(f, fn) {
                            var fileBtn = new android.widget.LinearLayout(ctx);
                            fileBtn.setOrientation(android.widget.LinearLayout.HORIZONTAL);
                            fileBtn.setGravity(android.view.Gravity.CENTER_VERTICAL);
                            fileBtn.setPadding(dip(12), dip(12), dip(12), dip(12));
                            fileBtn.setBackground(createRoundedBackground("#F5F5F5", 8, null, 0));
                            fileBtn.setLayoutParams(createMarginParams(0, 6, 0, 0));
                            
                            var iconText = createLabel("📄 ", 16, FB.colors.textPrimary, false);
                            fileBtn.addView(iconText);
                            
                            var infoLayout = new android.widget.LinearLayout(ctx);
                            infoLayout.setOrientation(android.widget.LinearLayout.VERTICAL);
                            infoLayout.setLayoutParams(new android.widget.LinearLayout.LayoutParams(0, -2, 1));
                            
                            infoLayout.addView(createLabel(fn, 13, FB.colors.textPrimary, false));
                            infoLayout.addView(createLabel(formatFileSize(f.length()), 10, FB.colors.textSecondary, false));
                            
                            fileBtn.addView(infoLayout);
                            
                            fileBtn.setOnClickListener(new android.view.View.OnClickListener({
                                onClick: function(v) {
                                    FB.ui.mainWindow.dismiss();
                                    FB.ui.mainWindow = null;
                                    callback(String(f.getAbsolutePath()));
                                }
                            }));
                            
                            fileListLayout.addView(fileBtn);
                        })(file, fileName);
                    }
                }
            }
            
            if (!hasFiles) {
                var emptyText = createLabel("没有找到 .fb 文件", 14, FB.colors.textSecondary, false);
                emptyText.setGravity(android.view.Gravity.CENTER);
                emptyText.setPadding(0, dip(32), 0, dip(32));
                fileListLayout.addView(emptyText);
            }
        } catch (e) {
            fileListLayout.addView(createLabel("读取失败: " + e, 12, FB.colors.error, false));
        }
        
        var scrollView = createScrollView(fileListLayout);
        scrollView.setLayoutParams(new android.widget.LinearLayout.LayoutParams(-1, dip(300)));
        mainLayout.addView(scrollView);
        
        mainLayout.addView(createDivider());
        
        var pathText = createLabel("📁 " + FB.config.defaultPath, 9, FB.colors.textSecondary, false);
        mainLayout.addView(pathText);
        
        mainLayout.addView(createOutlineButton("取消", FB.colors.textSecondary, function() {
            FB.ui.mainWindow.dismiss();
            FB.ui.mainWindow = null;
            showImportUI();
        }));
        
        var popup = createSafePopup(mainLayout, dip(340), -2);
        popup.showAtLocation(ctx.getWindow().getDecorView(), android.view.Gravity.CENTER, 0, 0);
        
        FB.ui.mainWindow = popup;
    });
}

// ============================================
// 文件管理界面
// ============================================

function showFileManagerUI() {
    runOnUiThread(function() {
        var ctx = getContext();
        
        var mainLayout = new android.widget.LinearLayout(ctx);
        mainLayout.setOrientation(android.widget.LinearLayout.VERTICAL);
        mainLayout.setPadding(dip(24), dip(20), dip(24), dip(24));
        mainLayout.setBackground(createRoundedBackground(FB.colors.card, 16, null, 0));
        
        // 标题栏
        var headerLayout = new android.widget.LinearLayout(ctx);
        headerLayout.setOrientation(android.widget.LinearLayout.HORIZONTAL);
        headerLayout.setGravity(android.view.Gravity.CENTER_VERTICAL);
        headerLayout.setLayoutParams(new android.widget.LinearLayout.LayoutParams(-1, -2));
        
        var backBtn = new android.widget.TextView(ctx);
        backBtn.setText("← ");
        backBtn.setTextSize(20);
        backBtn.setTextColor(android.graphics.Color.parseColor(FB.colors.primary));
        backBtn.setOnClickListener(new android.view.View.OnClickListener({
            onClick: function(v) {
                FB.ui.mainWindow.dismiss();
                FB.ui.mainWindow = null;
                showMainUI();
            }
        }));
        headerLayout.addView(backBtn);
        
        var title = createLabel("文件管理", 18, FB.colors.primary, true);
        title.setLayoutParams(new android.widget.LinearLayout.LayoutParams(0, -2, 1));
        headerLayout.addView(title);
        
        var closeBtn = createCloseButton(function() {
            FB.ui.mainWindow.dismiss();
            FB.ui.mainWindow = null;
        });
        headerLayout.addView(closeBtn);
        
        mainLayout.addView(headerLayout);
        mainLayout.addView(createDivider());
        
        // 统计
        var fileCount = 0, totalSize = 0;
        try {
            var dir = new java.io.File(FB.config.defaultPath);
            var files = dir.listFiles();
            if (files) {
                for (var i = 0; i < files.length; i++) {
                    if (String(files[i].getName()).endsWith(FB.config.fileExtension)) {
                        fileCount++;
                        totalSize += files[i].length();
                    }
                }
            }
        } catch (e) {}
        
        var statsLayout = new android.widget.LinearLayout(ctx);
        statsLayout.setBackground(createRoundedBackground("#E8F5E9", 8, null, 0));
        statsLayout.setPadding(dip(12), dip(10), dip(12), dip(10));
        statsLayout.addView(createLabel("📊 " + fileCount + " 个文件, " + formatFileSize(totalSize), 12, FB.colors.success, false));
        mainLayout.addView(statsLayout);
        
        // 文件列表
        var fileListLayout = new android.widget.LinearLayout(ctx);
        fileListLayout.setOrientation(android.widget.LinearLayout.VERTICAL);
        
        try {
            var dir = new java.io.File(FB.config.defaultPath);
            var files = dir.listFiles();
            var hasFiles = false;
            
            if (files && files.length > 0) {
                for (var i = 0; i < files.length; i++) {
                    var file = files[i];
                    var fileName = String(file.getName());
                    
                    if (fileName.endsWith(FB.config.fileExtension)) {
                        hasFiles = true;
                        (function(f, fn) {
                            var fileItem = new android.widget.LinearLayout(ctx);
                            fileItem.setOrientation(android.widget.LinearLayout.HORIZONTAL);
                            fileItem.setGravity(android.view.Gravity.CENTER_VERTICAL);
                            fileItem.setPadding(dip(12), dip(10), dip(8), dip(10));
                            fileItem.setBackground(createRoundedBackground("#FAFAFA", 8, FB.colors.divider, 1));
                            fileItem.setLayoutParams(createMarginParams(0, 6, 0, 0));
                            
                            var infoLayout = new android.widget.LinearLayout(ctx);
                            infoLayout.setOrientation(android.widget.LinearLayout.VERTICAL);
                            infoLayout.setLayoutParams(new android.widget.LinearLayout.LayoutParams(0, -2, 1));
                            
                            infoLayout.addView(createLabel("📄 " + fn, 12, FB.colors.textPrimary, false));
                            infoLayout.addView(createLabel(formatFileSize(f.length()) + " | " + formatDate(f.lastModified()), 10, FB.colors.textSecondary, false));
                            
                            fileItem.addView(infoLayout);
                            
                            var deleteBtn = new android.widget.TextView(ctx);
                            deleteBtn.setText("🗑️");
                            deleteBtn.setTextSize(16);
                            deleteBtn.setPadding(dip(10), dip(10), dip(10), dip(10));
                            deleteBtn.setOnClickListener(new android.view.View.OnClickListener({
                                onClick: function(v) {
                                    try {
                                        f["delete"]();
                                        toast("已删除");
                                        FB.ui.mainWindow.dismiss();
                                        FB.ui.mainWindow = null;
                                        showFileManagerUI();
                                    } catch (e) {
                                        toast("删除失败");
                                    }
                                }
                            }));
                            fileItem.addView(deleteBtn);
                            
                            fileListLayout.addView(fileItem);
                        })(file, fileName);
                    }
                }
            }
            
            if (!hasFiles) {
                var emptyText = createLabel("暂无文件", 14, FB.colors.textSecondary, false);
                emptyText.setGravity(android.view.Gravity.CENTER);
                emptyText.setPadding(0, dip(32), 0, dip(32));
                fileListLayout.addView(emptyText);
            }
        } catch (e) {}
        
        var scrollView = createScrollView(fileListLayout);
        scrollView.setLayoutParams(new android.widget.LinearLayout.LayoutParams(-1, dip(280)));
        mainLayout.addView(scrollView);
        
        mainLayout.addView(createDivider());
        
        mainLayout.addView(createOutlineButton("返回", FB.colors.primary, function() {
            FB.ui.mainWindow.dismiss();
            FB.ui.mainWindow = null;
            showMainUI();
        }));
        
        var popup = createSafePopup(mainLayout, dip(360), -2);
        popup.showAtLocation(ctx.getWindow().getDecorView(), android.view.Gravity.CENTER, 0, 0);
        
        FB.ui.mainWindow = popup;
    });
}

// ============================================
// 进度条界面
// ============================================

function showProgressUI(title, subtitle) {
    runOnUiThread(function() {
        var ctx = getContext();
        if (!ctx) return;
        
        if (FB.ui.progressWindow) {
            try { FB.ui.progressWindow.dismiss(); } catch (e) {}
        }
        
        var mainLayout = new android.widget.LinearLayout(ctx);
        mainLayout.setOrientation(android.widget.LinearLayout.VERTICAL);
        mainLayout.setPadding(dip(24), dip(24), dip(24), dip(24));
        mainLayout.setBackground(createRoundedBackground(FB.colors.card, 16, null, 0));
        mainLayout.setGravity(android.view.Gravity.CENTER);
        
        var titleText = createLabel(title, 18, FB.colors.primary, true);
        titleText.setGravity(android.view.Gravity.CENTER);
        mainLayout.addView(titleText);
        
        var subtitleText = createLabel(subtitle || "请稍候...", 12, FB.colors.textSecondary, false);
        subtitleText.setGravity(android.view.Gravity.CENTER);
        subtitleText.setLayoutParams(createMarginParams(0, 4, 0, 16));
        mainLayout.addView(subtitleText);
        
        var progressBar = new android.widget.ProgressBar(ctx, null, android.R.attr.progressBarStyleHorizontal);
        progressBar.setMax(100);
        progressBar.setProgress(0);
        progressBar.setLayoutParams(new android.widget.LinearLayout.LayoutParams(-1, dip(8)));
        mainLayout.addView(progressBar);
        
        var progressText = createLabel("0%", 16, FB.colors.textPrimary, true);
        progressText.setGravity(android.view.Gravity.CENTER);
        progressText.setLayoutParams(createMarginParams(0, 8, 0, 0));
        mainLayout.addView(progressText);
        
        var detailText = createLabel("准备中...", 11, FB.colors.textSecondary, false);
        detailText.setGravity(android.view.Gravity.CENTER);
        detailText.setLayoutParams(createMarginParams(0, 8, 0, 16));
        mainLayout.addView(detailText);
        
        var cancelBtn = createOutlineButton("取消", FB.colors.error, function() {
            stopWorkerThread();
            closeProgressUI();
            clientMessage("§c[FastBuild] 已取消");
        });
        mainLayout.addView(cancelBtn);
        
        var popup = createSafePopup(mainLayout, dip(300), -2);
        popup.showAtLocation(ctx.getWindow().getDecorView(), android.view.Gravity.CENTER, 0, 0);
        
        FB.ui.progressWindow = popup;
        FB.ui.progressBar = progressBar;
        FB.ui.progressText = progressText;
        FB.ui.detailText = detailText;
    });
}

function updateProgress(percent, detail) {
    runOnUiThread(function() {
        try {
            if (FB.ui.progressBar) FB.ui.progressBar.setProgress(Math.floor(percent));
            if (FB.ui.progressText) FB.ui.progressText.setText(Math.floor(percent) + "%");
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

function toast(message) {
    runOnUiThread(function() {
        try {
            android.widget.Toast.makeText(getContext(), message, android.widget.Toast.LENGTH_SHORT).show();
        } catch (e) {}
    });
}

function formatFileSize(bytes) {
    if (bytes < 1024) return bytes + " B";
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + " KB";
    return (bytes / (1024 * 1024)).toFixed(2) + " MB";
}

function formatDate(timestamp) {
    try {
        var date = new java.util.Date(timestamp);
        var format = new java.text.SimpleDateFormat("MM-dd HH:mm");
        return String(format.format(date));
    } catch (e) {
        return "";
    }
}

function createMarginParams(left, top, right, bottom) {
    var params = new android.widget.LinearLayout.LayoutParams(-2, -2);
    params.setMargins(dip(left), dip(top), dip(right), dip(bottom));
    return params;
}

// ============================================
// 多线程导出 - 区块模式
// ============================================

function startChunkExportMultiThread(fileName, range, yMin, yMax, includeAir) {
    if (FB.state.isProcessing) {
        toast("有任务正在进行");
        return;
    }
    
    var playerX = Math.floor(getPlayerX());
    var playerZ = Math.floor(getPlayerZ());
    
    var chunkX = Math.floor(playerX / 16);
    var chunkZ = Math.floor(playerZ / 16);
    
    var x1 = (chunkX - range) * 16;
    var z1 = (chunkZ - range) * 16;
    var x2 = (chunkX + range + 1) * 16 - 1;
    var z2 = (chunkZ + range + 1) * 16 - 1;
    
    clientMessage("§b[FB] §f开始区块导出...");
    clientMessage("§7范围: §e(" + x1 + "," + yMin + "," + z1 + ") - (" + x2 + "," + yMax + "," + z2 + ")");
    
    showProgressUI("区块导出", "多线程扫描中...");
    
    executeMultiThreadExport(fileName, x1, yMin, z1, x2, yMax, z2, includeAir);
}

// ============================================
// 多线程导出 - 坐标模式
// ============================================

function startCoordExportMultiThread(fileName, x1, y1, z1, x2, y2, z2, includeAir) {
    if (FB.state.isProcessing) {
        toast("有任务正在进行");
        return;
    }
    
    var minX = Math.min(x1, x2), maxX = Math.max(x1, x2);
    var minY = Math.max(0, Math.min(y1, y2)), maxY = Math.min(255, Math.max(y1, y2));
    var minZ = Math.min(z1, z2), maxZ = Math.max(z1, z2);
    
    clientMessage("§b[FB] §f开始坐标导出...");
    clientMessage("§7范围: §e(" + minX + "," + minY + "," + minZ + ") - (" + maxX + "," + maxY + "," + maxZ + ")");
    
    showProgressUI("坐标导出", "多线程扫描中...");
    
    executeMultiThreadExport(fileName, minX, minY, minZ, maxX, maxY, maxZ, includeAir);
}

// ============================================
// 多线程导出核心
// ============================================

function executeMultiThreadExport(fileName, x1, y1, z1, x2, y2, z2, includeAir) {
    FB.state.isProcessing = true;
    
    var buildingData = {
        version: FB.config.version,
        name: fileName,
        created: new Date().getTime(),
        origin: {x: x1, y: y1, z: z1},
        size: {x: x2 - x1 + 1, y: y2 - y1 + 1, z: z2 - z1 + 1},
        blocks: [],
        blockCount: 0
    };
    
    var totalBlocks = buildingData.size.x * buildingData.size.y * buildingData.size.z;
    var processedBlocks = [0]; // 使用数组以便在闭包中修改
    var lastUpdateTime = [java.lang.System.currentTimeMillis()];
    
    FB.state.workerThread = new java.lang.Thread(new java.lang.Runnable({
        run: function() {
            try {
                var batchSize = FB.config.threadBatchSize;
                var blocks = [];
                
                for (var y = y1; y <= y2 && FB.state.isProcessing; y++) {
                    for (var z = z1; z <= z2 && FB.state.isProcessing; z++) {
                        for (var x = x1; x <= x2 && FB.state.isProcessing; x++) {
                            var blockId = 0;
                            var blockData = 0;
                            
                            try {
                                blockId = getTile(x, y, z);
                                blockData = Level.getData(x, y, z);
                            } catch (e) {}
                            
                            if (blockId !== 0 || includeAir) {
                                blocks.push({
                                    x: x - x1,
                                    y: y - y1,
                                    z: z - z1,
                                    id: blockId,
                                    data: blockData
                                });
                            }
                            
                            processedBlocks[0]++;
                            
                            // 定期更新进度（每100ms或每批次）
                            var now = java.lang.System.currentTimeMillis();
                            if (now - lastUpdateTime[0] > 100) {
                                lastUpdateTime[0] = now;
                                var percent = (processedBlocks[0] / totalBlocks) * 100;
                                updateProgress(percent, 
                                    "扫描: " + processedBlocks[0] + "/" + totalBlocks + "\n" +
                                    "保存: " + blocks.length + " 方块"
                                );
                            }
                        }
                    }
                    
                    // 每层休眠一下，让UI响应
                    if (FB.config.threadSleepMs > 0) {
                        java.lang.Thread.sleep(FB.config.threadSleepMs);
                    }
                }
                
                if (!FB.state.isProcessing) {
                    return;
                }
                
                // 完成
                buildingData.blocks = blocks;
                buildingData.blockCount = blocks.length;
                
                saveExportFile(buildingData, fileName);
                
            } catch (e) {
                clientMessage("§c[FB] 导出错误: " + e);
                closeProgressUI();
            }
            
            FB.state.isProcessing = false;
            FB.state.workerThread = null;
        }
    }));
    
    FB.state.workerThread.start();
}

function saveExportFile(data, fileName) {
    var filePath = FB.config.defaultPath + fileName + FB.config.fileExtension;
    
    try {
        var json = JSON.stringify(data);
        var fileContent = "FBUILD1" + json;
        
        var file = new java.io.File(filePath);
        var writer = new java.io.FileWriter(file);
        writer.write(fileContent);
        writer.close();
        
        closeProgressUI();
        
        clientMessage("§a[FB] §f导出完成!");
        clientMessage("§7文件: §e" + fileName + FB.config.fileExtension);
        clientMessage("§7方块: §e" + data.blockCount + " §7| 尺寸: §e" + data.size.x + "x" + data.size.y + "x" + data.size.z);
        clientMessage("§7大小: §e" + formatFileSize(file.length()));
        
        toast("导出成功!");
        
    } catch (e) {
        closeProgressUI();
        clientMessage("§c[FB] 保存失败: " + e);
    }
}

// ============================================
// 多线程导入核心
// ============================================

function startImportMultiThread(filePath, mode, targetX, targetY, targetZ) {
    if (FB.state.isProcessing) {
        toast("有任务正在进行");
        return;
    }
    
    // 读取文件
    var data;
    try {
        var file = new java.io.File(filePath);
        if (!file.exists()) {
            clientMessage("§c[FB] 文件不存在");
            return;
        }
        
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
        
        data = JSON.parse(content.substring(7));
        
        if (!data.blocks || data.blocks.length === 0) {
            clientMessage("§c[FB] 文件为空");
            return;
        }
    } catch (e) {
        clientMessage("§c[FB] 读取失败: " + e);
        return;
    }
    
    FB.state.isProcessing = true;
    
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
    
    showProgressUI("导入建筑", "多线程放置中...");
    
    var totalBlocks = data.blocks.length;
    var processedBlocks = [0];
    var placedBlocks = [0];
    var lastUpdateTime = [java.lang.System.currentTimeMillis()];
    
    FB.state.workerThread = new java.lang.Thread(new java.lang.Runnable({
        run: function() {
            try {
                var blocks = data.blocks;
                
                for (var i = 0; i < blocks.length && FB.state.isProcessing; i++) {
                    var block = blocks[i];
                    
                    var x, y, z;
                    if (useOriginal) {
                        x = data.origin.x + block.x;
                        y = data.origin.y + block.y;
                        z = data.origin.z + block.z;
                    } else {
                        x = offsetX + block.x;
                        y = offsetY + block.y;
                        z = offsetZ + block.z;
                    }
                    
                    if (y >= 0 && y <= 255) {
                        try {
                            setTile(x, y, z, block.id, block.data);
                            placedBlocks[0]++;
                        } catch (e) {}
                    }
                    
                    processedBlocks[0]++;
                    
                    // 更新进度
                    var now = java.lang.System.currentTimeMillis();
                    if (now - lastUpdateTime[0] > 100) {
                        lastUpdateTime[0] = now;
                        var percent = (processedBlocks[0] / totalBlocks) * 100;
                        updateProgress(percent,
                            "处理: " + processedBlocks[0] + "/" + totalBlocks + "\n" +
                            "放置: " + placedBlocks[0] + " 方块"
                        );
                    }
                    
                    // 每1000个方块休眠一下
                    if (i % 1000 === 0 && FB.config.threadSleepMs > 0) {
                        java.lang.Thread.sleep(FB.config.threadSleepMs);
                    }
                }
                
                if (!FB.state.isProcessing) {
                    return;
                }
                
                closeProgressUI();
                
                clientMessage("§a[FB] §f导入完成!");
                clientMessage("§7放置: §e" + placedBlocks[0] + " §7个方块");
                
                toast("导入成功!");
                
            } catch (e) {
                clientMessage("§c[FB] 导入错误: " + e);
                closeProgressUI();
            }
            
            FB.state.isProcessing = false;
            FB.state.workerThread = null;
        }
    }));
    
    FB.state.workerThread.start();
}

// ============================================
// modTick - 仅用于备用/兼容
// ============================================

function modTick() {
    FB.state.tickCounter++;
}

// ============================================
// 加载提示
// ============================================

print("[FastBuild v" + FB.config.version + "] 已加载");