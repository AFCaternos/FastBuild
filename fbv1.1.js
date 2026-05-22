// ============================================
// FastBuild v1.1.0 - 修复版
// 服务器建筑保存工具
// 适用于 Minecraft PE 0.14.3 - 1.1.5
// ES5 语法
// ============================================

var FB = {};

// ============ 配置 ============
FB.config = {
    version: "1.1.0",
    fileExtension: ".fb",
    defaultPath: "/sdcard/games/com.mojang/fastbuild/",
    chunkSize: 16,
    maxBlocksPerTick: 50,
    commandPrefix: ".fb" // 使用.fb作为命令前缀，避免服务器拦截
};

// ============ 状态 ============
FB.state = {
    isProcessing: false,
    currentTask: null,
    progress: 0,
    totalBlocks: 0,
    processedBlocks: 0,
    isReady: false,
    tickCounter: 0
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
    exportSpeed: 50,
    loadedChunks: []
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
// 上下文获取 - 兼容0.14.3
// ============================================

function getContext() {
    try {
        if (FB.ui.ctx !== null) {
            return FB.ui.ctx;
        }
        var ctx = com.mojang.minecraftpe.MainActivity.currentMainActivity.get();
        if (ctx !== null) {
            FB.ui.ctx = ctx;
            return ctx;
        }
    } catch (e) {
        // 忽略错误
    }
    return null;
}

function ensureContext() {
    var maxRetries = 10;
    var retryCount = 0;
    
    var checkContext = function() {
        var ctx = getContext();
        if (ctx !== null) {
            FB.state.isReady = true;
            return true;
        }
        retryCount++;
        if (retryCount < maxRetries) {
            // 延迟重试
            java.lang.Thread.sleep(100);
            return checkContext();
        }
        return false;
    };
    
    return checkContext();
}

// ============================================
// 初始化函数
// ============================================

function newLevel() {
    // 延迟初始化，确保上下文可用
    new java.lang.Thread(new java.lang.Runnable({
        run: function() {
            java.lang.Thread.sleep(500);
            initializeFB();
        }
    })).start();
}

function initializeFB() {
    if (ensureContext()) {
        initDirectory();
        FB.state.isReady = true;
        clientMessage("§b§l[FastBuild] §av" + FB.config.version + " 已加载");
        clientMessage("§7输入 §e" + FB.config.commandPrefix + " §7或 §e" + FB.config.commandPrefix + " help §7查看帮助");
    } else {
        clientMessage("§c[FastBuild] 初始化失败，请重新进入存档");
    }
}

function selectLevelHook() {
    FB.ui.ctx = null;
    FB.state.isReady = false;
}

/*function leaveGame() {
    closeAllWindows();
    FB.state.isProcessing = false;
    FB.state.currentTask = null;
    FB.state.isReady = false;
    FB.ui.ctx = null;
}*/

function initDirectory() {
    try {
        var dir = new java.io.File(FB.config.defaultPath);
        if (!dir.exists()) {
            dir.mkdirs();
        }
    } catch (e) {
        clientMessage("§c[FastBuild] 创建目录失败: " + e);
    }
}

// ============================================
// 命令处理 - 使用chatHook避免服务器拦截
// ============================================

function chatHook(str) {
    var msg = String(str).trim();
    var prefix = FB.config.commandPrefix;
    
    // 检查是否是FastBuild命令
    if (msg === prefix || msg.indexOf(prefix + " ") === 0) {
        // 阻止消息发送
        preventDefault();
        
        // 解析命令
        var cmdPart = msg.substring(prefix.length).trim();
        var args = cmdPart.length > 0 ? cmdPart.split(" ") : [];
        
        handleCommand(args);
    }
}

function handleCommand(args) {
    if (!FB.state.isReady) {
        clientMessage("§c[FastBuild] 插件未就绪，请稍后再试");
        return;
    }
    
    if (args.length === 0) {
        // 打开主菜单
        showMainUI();
    } else {
        var subCmd = args[0].toLowerCase();
        
        switch (subCmd) {
            case "help":
            case "?":
                showHelp();
                break;
            case "pos1":
            case "p1":
                setPos1();
                break;
            case "pos2":
            case "p2":
                setPos2();
                break;
            case "menu":
            case "m":
                showMainUI();
                break;
            default:
                clientMessage("§c[FastBuild] 未知命令: " + subCmd);
                clientMessage("§7输入 §e" + FB.config.commandPrefix + " help §7查看帮助");
        }
    }
}

function setPos1() {
    FB.data.pos1.x = Math.floor(getPlayerX());
    FB.data.pos1.y = Math.floor(getPlayerY());
    FB.data.pos1.z = Math.floor(getPlayerZ());
    clientMessage("§a[FastBuild] §f位置1已设置: §e" + FB.data.pos1.x + ", " + FB.data.pos1.y + ", " + FB.data.pos1.z);
}

function setPos2() {
    FB.data.pos2.x = Math.floor(getPlayerX());
    FB.data.pos2.y = Math.floor(getPlayerY());
    FB.data.pos2.z = Math.floor(getPlayerZ());
    clientMessage("§a[FastBuild] §f位置2已设置: §e" + FB.data.pos2.x + ", " + FB.data.pos2.y + ", " + FB.data.pos2.z);
}

function showHelp() {
    clientMessage("§b§l=== FastBuild v" + FB.config.version + " 帮助 ===");
    clientMessage("§e" + FB.config.commandPrefix + " §7- 打开主菜单");
    clientMessage("§e" + FB.config.commandPrefix + " pos1 §7- 设置位置1");
    clientMessage("§e" + FB.config.commandPrefix + " pos2 §7- 设置位置2");
    clientMessage("§e" + FB.config.commandPrefix + " help §7- 显示帮助");
    clientMessage("§7文件保存路径: §f" + FB.config.defaultPath);
}

// ============================================
// UI 工具函数
// ============================================

function dip(value) {
    var ctx = getContext();
    if (!ctx) return value;
    return Math.ceil(value * ctx.getResources().getDisplayMetrics().density);
}

function runOnUiThread(func) {
    var ctx = getContext();
    if (!ctx) {
        clientMessage("§c[FastBuild] UI上下文未就绪");
        return false;
    }
    
    ctx.runOnUiThread(new java.lang.Runnable({
        run: function() {
            try {
                func();
            } catch (e) {
                clientMessage("§c[UI Error] " + e);
                print("UI Error: " + e);
            }
        }
    }));
    return true;
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
        try {
            if (FB.ui.currentDialog) {
                FB.ui.currentDialog.dismiss();
                FB.ui.currentDialog = null;
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
    btn.setTextSize(18);
    btn.setTextColor(android.graphics.Color.parseColor(FB.colors.textSecondary));
    btn.setPadding(dip(12), dip(8), dip(4), dip(8));
    btn.setGravity(android.view.Gravity.CENTER);
    
    btn.setOnTouchListener(new android.view.View.OnTouchListener({
        onTouch: function(v, event) {
            var action = event.getAction();
            if (action === android.view.MotionEvent.ACTION_DOWN) {
                v.setTextColor(android.graphics.Color.parseColor(FB.colors.error));
            } else if (action === android.view.MotionEvent.ACTION_UP || 
                       action === android.view.MotionEvent.ACTION_CANCEL) {
                v.setTextColor(android.graphics.Color.parseColor(FB.colors.textSecondary));
            }
            return false;
        }
    }));
    
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
    
    btn.setOnTouchListener(new android.view.View.OnTouchListener({
        onTouch: function(v, event) {
            var action = event.getAction();
            if (action === android.view.MotionEvent.ACTION_DOWN) {
                v.setAlpha(0.7);
            } else if (action === android.view.MotionEvent.ACTION_UP || 
                       action === android.view.MotionEvent.ACTION_CANCEL) {
                v.setAlpha(1.0);
            }
            return false;
        }
    }));
    
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

function createHeaderWithClose(title, onClose) {
    var ctx = getContext();
    
    var headerLayout = new android.widget.LinearLayout(ctx);
    headerLayout.setOrientation(android.widget.LinearLayout.HORIZONTAL);
    headerLayout.setGravity(android.view.Gravity.CENTER_VERTICAL);
    
    var titleText = createLabel(title, 20, FB.colors.primary, true);
    var titleParams = new android.widget.LinearLayout.LayoutParams(0, -2, 1);
    titleText.setLayoutParams(titleParams);
    headerLayout.addView(titleText);
    
    var closeBtn = createCloseButton(onClose);
    headerLayout.addView(closeBtn);
    
    return headerLayout;
}

// ============================================
// 主界面
// ============================================

function showMainUI() {
    if (!FB.state.isReady) {
        clientMessage("§c[FastBuild] 插件未就绪，请稍后再试");
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
        
        // 标题栏带关闭按钮
        var headerLayout = new android.widget.LinearLayout(ctx);
        headerLayout.setOrientation(android.widget.LinearLayout.HORIZONTAL);
        headerLayout.setGravity(android.view.Gravity.CENTER_VERTICAL);
        headerLayout.setLayoutParams(new android.widget.LinearLayout.LayoutParams(-1, -2));
        
        // Logo区域
        var logoLayout = new android.widget.LinearLayout(ctx);
        logoLayout.setOrientation(android.widget.LinearLayout.HORIZONTAL);
        logoLayout.setGravity(android.view.Gravity.CENTER_VERTICAL);
        var logoParams = new android.widget.LinearLayout.LayoutParams(0, -2, 1);
        logoLayout.setLayoutParams(logoParams);
        
        var iconText = new android.widget.TextView(ctx);
        iconText.setText("🏗️ ");
        iconText.setTextSize(24);
        logoLayout.addView(iconText);
        
        var titleText = createLabel("FastBuild", 22, FB.colors.primary, true);
        logoLayout.addView(titleText);
        
        headerLayout.addView(logoLayout);
        
        // 关闭按钮
        var closeBtn = createCloseButton(function() {
            FB.ui.mainWindow.dismiss();
            FB.ui.mainWindow = null;
        });
        headerLayout.addView(closeBtn);
        
        mainLayout.addView(headerLayout);
        
        // 版本信息
        var versionText = createLabel("v" + FB.config.version + " | 服务器建筑保存工具", 11, FB.colors.textSecondary, false);
        versionText.setGravity(android.view.Gravity.CENTER);
        var vParams = new android.widget.LinearLayout.LayoutParams(-1, -2);
        vParams.setMargins(0, dip(4), 0, 0);
        versionText.setLayoutParams(vParams);
        mainLayout.addView(versionText);
        
        mainLayout.addView(createDivider());
        
        // 功能按钮
        var sectionLabel = createLabel("选择操作模式", 12, FB.colors.textSecondary, false);
        var sParams = new android.widget.LinearLayout.LayoutParams(-2, -2);
        sParams.setMargins(0, 0, 0, dip(4));
        sectionLabel.setLayoutParams(sParams);
        mainLayout.addView(sectionLabel);
        
        // 导出 - 区块模式
        mainLayout.addView(createMaterialButton("📦 区块导出模式", FB.colors.success, function() {
            FB.ui.mainWindow.dismiss();
            showChunkExportUI();
        }));
        
        // 导出 - 坐标模式
        mainLayout.addView(createMaterialButton("📐 坐标导出模式", FB.colors.primary, function() {
            FB.ui.mainWindow.dismiss();
            showCoordExportUI();
        }));
        
        // 导入
        mainLayout.addView(createMaterialButton("📥 导入建筑", FB.colors.warning, function() {
            FB.ui.mainWindow.dismiss();
            showImportUI();
        }));
        
        // 文件管理
        mainLayout.addView(createOutlineButton("📁 文件管理", FB.colors.primary, function() {
            FB.ui.mainWindow.dismiss();
            showFileManagerUI();
        }));
        
        mainLayout.addView(createDivider());
        
        // 当前坐标信息
        var infoLayout = new android.widget.LinearLayout(ctx);
        infoLayout.setOrientation(android.widget.LinearLayout.VERTICAL);
        infoLayout.setBackground(createRoundedBackground("#E3F2FD", 8, null, 0));
        infoLayout.setPadding(dip(12), dip(12), dip(12), dip(12));
        
        var posInfoLabel = createLabel("📍 当前位置", 12, FB.colors.primary, true);
        infoLayout.addView(posInfoLabel);
        
        var posText = createLabel(
            "X: " + Math.floor(getPlayerX()) + "  Y: " + Math.floor(getPlayerY()) + "  Z: " + Math.floor(getPlayerZ()),
            14, FB.colors.textPrimary, false
        );
        var pParams = new android.widget.LinearLayout.LayoutParams(-2, -2);
        pParams.setMargins(0, dip(4), 0, 0);
        posText.setLayoutParams(pParams);
        infoLayout.addView(posText);
        
        var savedPosLabel = createLabel(
            "位置1: (" + FB.data.pos1.x + "," + FB.data.pos1.y + "," + FB.data.pos1.z + ")\n" +
            "位置2: (" + FB.data.pos2.x + "," + FB.data.pos2.y + "," + FB.data.pos2.z + ")",
            11, FB.colors.textSecondary, false
        );
        var spParams = new android.widget.LinearLayout.LayoutParams(-2, -2);
        spParams.setMargins(0, dip(4), 0, 0);
        savedPosLabel.setLayoutParams(spParams);
        infoLayout.addView(savedPosLabel);
        
        var infoParams = new android.widget.LinearLayout.LayoutParams(-1, -2);
        infoParams.setMargins(0, dip(4), 0, 0);
        infoLayout.setLayoutParams(infoParams);
        mainLayout.addView(infoLayout);
        
        // 创建弹窗 - 禁用外部点击关闭
        var popup = new android.widget.PopupWindow(mainLayout, dip(320), -2, true);
        popup.setBackgroundDrawable(new android.graphics.drawable.ColorDrawable(android.graphics.Color.TRANSPARENT));
        popup.setOutsideTouchable(false); // 禁用外部点击关闭
        popup.setFocusable(true);
        
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
                showMainUI();
            }
        }));
        headerLayout.addView(backBtn);
        
        var title = createLabel("区块导出模式", 18, FB.colors.primary, true);
        var titleParams = new android.widget.LinearLayout.LayoutParams(0, -2, 1);
        title.setLayoutParams(titleParams);
        headerLayout.addView(title);
        
        var closeBtn = createCloseButton(function() {
            FB.ui.mainWindow.dismiss();
            FB.ui.mainWindow = null;
        });
        headerLayout.addView(closeBtn);
        
        mainLayout.addView(headerLayout);
        
        var desc = createLabel("自动获取已加载区块并保存所有方块", 12, FB.colors.textSecondary, false);
        var dParams = new android.widget.LinearLayout.LayoutParams(-2, -2);
        dParams.setMargins(0, dip(4), 0, 0);
        desc.setLayoutParams(dParams);
        mainLayout.addView(desc);
        
        mainLayout.addView(createDivider());
        
        // 文件名输入
        mainLayout.addView(createLabel("文件名称", 12, FB.colors.textSecondary, false));
        var fileNameInput = createInputField("输入文件名", "chunk_export");
        mainLayout.addView(fileNameInput);
        
        // 导出范围
        var rangeLabel = createLabel("导出范围（区块半径 1-10）", 12, FB.colors.textSecondary, false);
        var rlParams = new android.widget.LinearLayout.LayoutParams(-2, -2);
        rlParams.setMargins(0, dip(12), 0, 0);
        rangeLabel.setLayoutParams(rlParams);
        mainLayout.addView(rangeLabel);
        var rangeInput = createNumberInput("区块半径", "3");
        mainLayout.addView(rangeInput);
        
        // Y轴范围
        var yLabel = createLabel("Y轴范围", 12, FB.colors.textSecondary, false);
        var ylParams = new android.widget.LinearLayout.LayoutParams(-2, -2);
        ylParams.setMargins(0, dip(12), 0, 0);
        yLabel.setLayoutParams(ylParams);
        mainLayout.addView(yLabel);
        
        var yLayout = new android.widget.LinearLayout(ctx);
        yLayout.setOrientation(android.widget.LinearLayout.HORIZONTAL);
        
        var yMinInput = createNumberInput("最小Y", "0");
        var yMaxInput = createNumberInput("最大Y", "127");
        yMinInput.setLayoutParams(new android.widget.LinearLayout.LayoutParams(0, -2, 1));
        yMaxInput.setLayoutParams(new android.widget.LinearLayout.LayoutParams(0, -2, 1));
        
        yLayout.addView(yMinInput);
        var spacer = new android.widget.TextView(ctx);
        spacer.setText(" ~ ");
        spacer.setTextSize(14);
        spacer.setGravity(android.view.Gravity.CENTER);
        yLayout.addView(spacer);
        yLayout.addView(yMaxInput);
        
        mainLayout.addView(yLayout);
        
        // 速度设置
        var speedLabel = createLabel("每Tick处理方块数 (10-200)", 12, FB.colors.textSecondary, false);
        var slParams = new android.widget.LinearLayout.LayoutParams(-2, -2);
        slParams.setMargins(0, dip(12), 0, 0);
        speedLabel.setLayoutParams(slParams);
        mainLayout.addView(speedLabel);
        var speedInput = createNumberInput("速度", "50");
        mainLayout.addView(speedInput);
        
        // 包含空气方块选项
        var airCheck = new android.widget.CheckBox(ctx);
        airCheck.setText("包含空气方块（文件会更大）");
        airCheck.setTextSize(14);
        airCheck.setTextColor(android.graphics.Color.parseColor(FB.colors.textPrimary));
        airCheck.setChecked(false);
        var acParams = new android.widget.LinearLayout.LayoutParams(-2, -2);
        acParams.setMargins(0, dip(12), 0, 0);
        airCheck.setLayoutParams(acParams);
        mainLayout.addView(airCheck);
        
        mainLayout.addView(createDivider());
        
        // 开始导出按钮
        mainLayout.addView(createMaterialButton("🚀 开始导出", FB.colors.success, function() {
            var fileName = String(fileNameInput.getText());
            var range = parseInt(rangeInput.getText()) || 3;
            var speed = parseInt(speedInput.getText()) || 50;
            var yMin = parseInt(yMinInput.getText()) || 0;
            var yMax = parseInt(yMaxInput.getText()) || 127;
            var includeAir = airCheck.isChecked();
            
            if (fileName.length === 0) {
                toast("请输入文件名");
                return;
            }
            
            range = Math.max(1, Math.min(10, range));
            speed = Math.max(10, Math.min(200, speed));
            yMin = Math.max(0, Math.min(127, yMin));
            yMax = Math.max(0, Math.min(127, yMax));
            
            if (yMin > yMax) {
                var temp = yMin;
                yMin = yMax;
                yMax = temp;
            }
            
            FB.ui.mainWindow.dismiss();
            startChunkExport(fileName, range, speed, yMin, yMax, includeAir);
        }));
        
        mainLayout.addView(createOutlineButton("取消", FB.colors.textSecondary, function() {
            FB.ui.mainWindow.dismiss();
            showMainUI();
        }));
        
        var scrollView = createScrollView(mainLayout);
        
        var popup = new android.widget.PopupWindow(scrollView, dip(320), dip(480), true);
        popup.setBackgroundDrawable(new android.graphics.drawable.ColorDrawable(android.graphics.Color.TRANSPARENT));
        popup.setOutsideTouchable(false);
        popup.setFocusable(true);
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
                showMainUI();
            }
        }));
        headerLayout.addView(backBtn);
        
        var title = createLabel("坐标导出模式", 18, FB.colors.primary, true);
        var titleParams = new android.widget.LinearLayout.LayoutParams(0, -2, 1);
        title.setLayoutParams(titleParams);
        headerLayout.addView(title);
        
        var closeBtn = createCloseButton(function() {
            FB.ui.mainWindow.dismiss();
            FB.ui.mainWindow = null;
        });
        headerLayout.addView(closeBtn);
        
        mainLayout.addView(headerLayout);
        
        var desc = createLabel("指定两个坐标，保存范围内所有方块", 12, FB.colors.textSecondary, false);
        var dParams = new android.widget.LinearLayout.LayoutParams(-2, -2);
        dParams.setMargins(0, dip(4), 0, 0);
        desc.setLayoutParams(dParams);
        mainLayout.addView(desc);
        
        mainLayout.addView(createDivider());
        
        // 文件名
        mainLayout.addView(createLabel("文件名称", 12, FB.colors.textSecondary, false));
        var fileNameInput = createInputField("输入文件名", "coord_export");
        mainLayout.addView(fileNameInput);
        
        // 位置1
        var pos1Label = createLabel("起始位置 (X, Y, Z)", 12, FB.colors.textSecondary, false);
        var p1Params = new android.widget.LinearLayout.LayoutParams(-2, -2);
        p1Params.setMargins(0, dip(12), 0, 0);
        pos1Label.setLayoutParams(p1Params);
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
        
        // 获取当前位置按钮
        mainLayout.addView(createOutlineButton("📍 使用当前位置作为起点", FB.colors.primary, function() {
            x1Input.setText(String(Math.floor(getPlayerX())));
            y1Input.setText(String(Math.floor(getPlayerY())));
            z1Input.setText(String(Math.floor(getPlayerZ())));
        }));
        
        // 位置2
        var pos2Label = createLabel("结束位置 (X, Y, Z)", 12, FB.colors.textSecondary, false);
        var p2Params = new android.widget.LinearLayout.LayoutParams(-2, -2);
        p2Params.setMargins(0, dip(12), 0, 0);
        pos2Label.setLayoutParams(p2Params);
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
        
        mainLayout.addView(createOutlineButton("📍 使用当前位置作为终点", FB.colors.primary, function() {
            x2Input.setText(String(Math.floor(getPlayerX())));
            y2Input.setText(String(Math.floor(getPlayerY())));
            z2Input.setText(String(Math.floor(getPlayerZ())));
        }));
        
        // 速度
        var speedLabel = createLabel("每Tick处理方块数", 12, FB.colors.textSecondary, false);
        var sParams = new android.widget.LinearLayout.LayoutParams(-2, -2);
        sParams.setMargins(0, dip(12), 0, 0);
        speedLabel.setLayoutParams(sParams);
        mainLayout.addView(speedLabel);
        var speedInput = createNumberInput("10-200", "50");
        mainLayout.addView(speedInput);
        
        // 包含空气
        var airCheck = new android.widget.CheckBox(ctx);
        airCheck.setText("包含空气方块");
        airCheck.setTextSize(14);
        airCheck.setTextColor(android.graphics.Color.parseColor(FB.colors.textPrimary));
        airCheck.setChecked(false);
        var acParams = new android.widget.LinearLayout.LayoutParams(-2, -2);
        acParams.setMargins(0, dip(12), 0, 0);
        airCheck.setLayoutParams(acParams);
        mainLayout.addView(airCheck);
        
        mainLayout.addView(createDivider());
        
        // 开始按钮
        mainLayout.addView(createMaterialButton("🚀 开始导出", FB.colors.success, function() {
            var fileName = String(fileNameInput.getText());
            var speed = parseInt(speedInput.getText()) || 50;
            var includeAir = airCheck.isChecked();
            
            var x1 = parseInt(x1Input.getText()) || 0;
            var y1 = parseInt(y1Input.getText()) || 0;
            var z1 = parseInt(z1Input.getText()) || 0;
            var x2 = parseInt(x2Input.getText()) || 0;
            var y2 = parseInt(y2Input.getText()) || 0;
            var z2 = parseInt(z2Input.getText()) || 0;
            
            if (fileName.length === 0) {
                toast("请输入文件名");
                return;
            }
            
            speed = Math.max(10, Math.min(200, speed));
            
            FB.ui.mainWindow.dismiss();
            startCoordExport(fileName, x1, y1, z1, x2, y2, z2, speed, includeAir);
        }));
        
        mainLayout.addView(createOutlineButton("取消", FB.colors.textSecondary, function() {
            FB.ui.mainWindow.dismiss();
            showMainUI();
        }));
        
        // 滚动视图
        var scrollView = createScrollView(mainLayout);
        
        var popup = new android.widget.PopupWindow(scrollView, dip(340), dip(520), true);
        popup.setBackgroundDrawable(new android.graphics.drawable.ColorDrawable(android.graphics.Color.TRANSPARENT));
        popup.setOutsideTouchable(false);
        popup.setFocusable(true);
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
                showMainUI();
            }
        }));
        headerLayout.addView(backBtn);
        
        var title = createLabel("导入建筑", 18, FB.colors.warning, true);
        var titleParams = new android.widget.LinearLayout.LayoutParams(0, -2, 1);
        title.setLayoutParams(titleParams);
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
        var pathInput = createInputField("输入.fb文件完整路径", FB.data.filePath || FB.config.defaultPath);
        mainLayout.addView(pathInput);
        
        // 快速选择按钮
        mainLayout.addView(createOutlineButton("📁 从默认目录选择", FB.colors.primary, function() {
            FB.ui.mainWindow.dismiss();
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
        radio1.setText("按原始坐标导入");
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
        radio3.setText("指定位置导入");
        radio3.setTextSize(14);
        radio3.setTextColor(android.graphics.Color.parseColor(FB.colors.textPrimary));
        radio3.setId(3);
        radioGroup.addView(radio3);
        
        var rgParams = new android.widget.LinearLayout.LayoutParams(-1, -2);
        rgParams.setMargins(0, dip(8), 0, 0);
        radioGroup.setLayoutParams(rgParams);
        mainLayout.addView(radioGroup);
        
        // 指定坐标输入（默认隐藏）
        var customPosLayout = new android.widget.LinearLayout(ctx);
        customPosLayout.setOrientation(android.widget.LinearLayout.VERTICAL);
        customPosLayout.setVisibility(android.view.View.GONE);
        
        var cpLabel = createLabel("目标位置 (X, Y, Z)", 12, FB.colors.textSecondary, false);
        var cpParams = new android.widget.LinearLayout.LayoutParams(-2, -2);
        cpParams.setMargins(0, dip(8), 0, 0);
        cpLabel.setLayoutParams(cpParams);
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
        
        var cplParams = new android.widget.LinearLayout.LayoutParams(-1, -2);
        customPosLayout.setLayoutParams(cplParams);
        mainLayout.addView(customPosLayout);
        
        // RadioGroup监听
        radioGroup.setOnCheckedChangeListener(new android.widget.RadioGroup.OnCheckedChangeListener({
            onCheckedChanged: function(group, checkedId) {
                if (checkedId === 3) {
                    customPosLayout.setVisibility(android.view.View.VISIBLE);
                } else {
                    customPosLayout.setVisibility(android.view.View.GONE);
                }
            }
        }));
        
        // 速度设置
        var speedLabel = createLabel("每Tick放置方块数", 12, FB.colors.textSecondary, false);
        var slParams = new android.widget.LinearLayout.LayoutParams(-2, -2);
        slParams.setMargins(0, dip(12), 0, 0);
        speedLabel.setLayoutParams(slParams);
        mainLayout.addView(speedLabel);
        var speedInput = createNumberInput("10-200", "30");
        mainLayout.addView(speedInput);
        
        mainLayout.addView(createDivider());
        
        // 开始按钮
        mainLayout.addView(createMaterialButton("📥 开始导入", FB.colors.warning, function() {
            var filePath = String(pathInput.getText());
            var speed = parseInt(speedInput.getText()) || 30;
            var mode = radioGroup.getCheckedRadioButtonId();
            
            var targetX = 0, targetY = 0, targetZ = 0;
            
            if (mode === 1) {
                // 原始坐标 - 标记为null
                targetX = null;
                targetY = null;
                targetZ = null;
            } else if (mode === 2) {
                // 玩家坐标
                targetX = Math.floor(getPlayerX());
                targetY = Math.floor(getPlayerY());
                targetZ = Math.floor(getPlayerZ());
            } else if (mode === 3) {
                // 指定坐标
                targetX = parseInt(xInput.getText()) || 0;
                targetY = parseInt(yInput.getText()) || 0;
                targetZ = parseInt(zInput.getText()) || 0;
            }
            
            if (filePath.length === 0) {
                toast("请输入文件路径");
                return;
            }
            
            speed = Math.max(5, Math.min(200, speed));
            
            FB.ui.mainWindow.dismiss();
            startImport(filePath, mode, targetX, targetY, targetZ, speed);
        }));
        
        mainLayout.addView(createOutlineButton("取消", FB.colors.textSecondary, function() {
            FB.ui.mainWindow.dismiss();
            showMainUI();
        }));
        
        var scrollView = createScrollView(mainLayout);
        
        var popup = new android.widget.PopupWindow(scrollView, dip(340), dip(500), true);
        popup.setBackgroundDrawable(new android.graphics.drawable.ColorDrawable(android.graphics.Color.TRANSPARENT));
        popup.setOutsideTouchable(false);
        popup.setFocusable(true);
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
                showImportUI();
            }
        }));
        headerLayout.addView(backBtn);
        
        var title = createLabel("选择文件", 18, FB.colors.primary, true);
        var titleParams = new android.widget.LinearLayout.LayoutParams(0, -2, 1);
        title.setLayoutParams(titleParams);
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
                            
                            var iconText = new android.widget.TextView(ctx);
                            iconText.setText("📄 ");
                            iconText.setTextSize(18);
                            fileBtn.addView(iconText);
                            
                            var infoLayout = new android.widget.LinearLayout(ctx);
                            infoLayout.setOrientation(android.widget.LinearLayout.VERTICAL);
                            infoLayout.setLayoutParams(new android.widget.LinearLayout.LayoutParams(0, -2, 1));
                            
                            var nameText = createLabel(fn, 14, FB.colors.textPrimary, false);
                            infoLayout.addView(nameText);
                            
                            var sizeText = createLabel(formatFileSize(f.length()), 11, FB.colors.textSecondary, false);
                            infoLayout.addView(sizeText);
                            
                            fileBtn.addView(infoLayout);
                            
                            var fbParams = new android.widget.LinearLayout.LayoutParams(-1, -2);
                            fbParams.setMargins(0, dip(6), 0, 0);
                            fileBtn.setLayoutParams(fbParams);
                            
                            fileBtn.setOnClickListener(new android.view.View.OnClickListener({
                                onClick: function(v) {
                                    FB.ui.mainWindow.dismiss();
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
            var errorText = createLabel("读取目录失败: " + e, 14, FB.colors.error, false);
            fileListLayout.addView(errorText);
        }
        
        var scrollView = createScrollView(fileListLayout);
        scrollView.setLayoutParams(new android.widget.LinearLayout.LayoutParams(-1, dip(300)));
        mainLayout.addView(scrollView);
        
        mainLayout.addView(createDivider());
        
        // 路径提示
        var pathText = createLabel("📁 " + FB.config.defaultPath, 10, FB.colors.textSecondary, false);
        mainLayout.addView(pathText);
        
        mainLayout.addView(createOutlineButton("取消", FB.colors.textSecondary, function() {
            FB.ui.mainWindow.dismiss();
            showImportUI();
        }));
        
        var popup = new android.widget.PopupWindow(mainLayout, dip(340), -2, true);
        popup.setBackgroundDrawable(new android.graphics.drawable.ColorDrawable(android.graphics.Color.TRANSPARENT));
        popup.setOutsideTouchable(false);
        popup.setFocusable(true);
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
                showMainUI();
            }
        }));
        headerLayout.addView(backBtn);
        
        var title = createLabel("文件管理", 18, FB.colors.primary, true);
        var titleParams = new android.widget.LinearLayout.LayoutParams(0, -2, 1);
        title.setLayoutParams(titleParams);
        headerLayout.addView(title);
        
        var closeBtn = createCloseButton(function() {
            FB.ui.mainWindow.dismiss();
            FB.ui.mainWindow = null;
        });
        headerLayout.addView(closeBtn);
        
        mainLayout.addView(headerLayout);
        mainLayout.addView(createDivider());
        
        // 统计信息
        var fileCount = 0;
        var totalSize = 0;
        
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
        statsLayout.setLayoutParams(new android.widget.LinearLayout.LayoutParams(-1, -2));
        
        var statsText = createLabel("📊 共 " + fileCount + " 个文件, 总大小 " + formatFileSize(totalSize), 13, FB.colors.success, false);
        statsLayout.addView(statsText);
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
                            
                            var iconText = new android.widget.TextView(ctx);
                            iconText.setText("📄 ");
                            iconText.setTextSize(16);
                            fileItem.addView(iconText);
                            
                            var infoLayout = new android.widget.LinearLayout(ctx);
                            infoLayout.setOrientation(android.widget.LinearLayout.VERTICAL);
                            infoLayout.setLayoutParams(new android.widget.LinearLayout.LayoutParams(0, -2, 1));
                            
                            var nameText = createLabel(fn, 13, FB.colors.textPrimary, false);
                            infoLayout.addView(nameText);
                            
                            var sizeText = createLabel(formatFileSize(f.length()) + " | " + formatDate(f.lastModified()), 10, FB.colors.textSecondary, false);
                            infoLayout.addView(sizeText);
                            
                            fileItem.addView(infoLayout);
                            
                            // 删除按钮
                            var deleteBtn = new android.widget.TextView(ctx);
                            deleteBtn.setText("🗑️");
                            deleteBtn.setTextSize(16);
                            deleteBtn.setPadding(dip(8), dip(8), dip(8), dip(8));
                            deleteBtn.setOnClickListener(new android.view.View.OnClickListener({
                                onClick: function(v) {
                                    showDeleteConfirmDialog(f, fn, function() {
                                        FB.ui.mainWindow.dismiss();
                                        showFileManagerUI();
                                    });
                                }
                            }));
                            fileItem.addView(deleteBtn);
                            
                            var fiParams = new android.widget.LinearLayout.LayoutParams(-1, -2);
                            fiParams.setMargins(0, dip(6), 0, 0);
                            fileItem.setLayoutParams(fiParams);
                            
                            fileListLayout.addView(fileItem);
                        })(file, fileName);
                    }
                }
            }
            
            if (!hasFiles) {
                var emptyText = createLabel("暂无保存的建筑文件", 14, FB.colors.textSecondary, false);
                emptyText.setGravity(android.view.Gravity.CENTER);
                emptyText.setPadding(0, dip(32), 0, dip(32));
                fileListLayout.addView(emptyText);
            }
        } catch (e) {
            var errorText = createLabel("读取失败: " + e, 14, FB.colors.error, false);
            fileListLayout.addView(errorText);
        }
        
        var flParams = new android.widget.LinearLayout.LayoutParams(-1, -2);
        flParams.setMargins(0, dip(8), 0, 0);
        fileListLayout.setLayoutParams(flParams);
        
        var scrollView = createScrollView(fileListLayout);
        scrollView.setLayoutParams(new android.widget.LinearLayout.LayoutParams(-1, dip(280)));
        mainLayout.addView(scrollView);
        
        mainLayout.addView(createDivider());
        
        // 路径显示
        var pathText = createLabel("📁 " + FB.config.defaultPath, 10, FB.colors.textSecondary, false);
        mainLayout.addView(pathText);
        
        mainLayout.addView(createOutlineButton("返回主菜单", FB.colors.primary, function() {
            FB.ui.mainWindow.dismiss();
            showMainUI();
        }));
        
        var popup = new android.widget.PopupWindow(mainLayout, dip(360), -2, true);
        popup.setBackgroundDrawable(new android.graphics.drawable.ColorDrawable(android.graphics.Color.TRANSPARENT));
        popup.setOutsideTouchable(false);
        popup.setFocusable(true);
        popup.showAtLocation(ctx.getWindow().getDecorView(), android.view.Gravity.CENTER, 0, 0);
        
        FB.ui.mainWindow = popup;
    });
}

function showDeleteConfirmDialog(file, fileName, callback) {
    runOnUiThread(function() {
        var ctx = getContext();
        try {
            var dialog = new android.app.AlertDialog.Builder(ctx);
            dialog.setTitle("确认删除");
            dialog.setMessage("确定要删除 \"" + fileName + "\" 吗？\n此操作不可撤销。");
            dialog.setPositiveButton("删除", new android.content.DialogInterface.OnClickListener({
                onClick: function(d, w) {
                    try {
                        file["delete"]();
                        toast("已删除: " + fileName);
                        callback();
                    } catch (e) {
                        toast("删除失败: " + e);
                    }
                }
            }));
            dialog.setNegativeButton("取消", null);
            dialog.show();
        } catch (e) {
            toast("无法显示对话框: " + e);
        }
    });
}

// ============================================
// 进度条界面
// ============================================

function showProgressUI(title, subtitle) {
    runOnUiThread(function() {
        var ctx = getContext();
        if (!ctx) return;
        
        // 先关闭已存在的进度窗口
        if (FB.ui.progressWindow) {
            try {
                FB.ui.progressWindow.dismiss();
            } catch (e) {}
        }
        
        var mainLayout = new android.widget.LinearLayout(ctx);
        mainLayout.setOrientation(android.widget.LinearLayout.VERTICAL);
        mainLayout.setPadding(dip(24), dip(24), dip(24), dip(24));
        mainLayout.setBackground(createRoundedBackground(FB.colors.card, 16, null, 0));
        mainLayout.setGravity(android.view.Gravity.CENTER);
        
        // 标题
        var titleText = createLabel(title, 18, FB.colors.primary, true);
        titleText.setGravity(android.view.Gravity.CENTER);
        mainLayout.addView(titleText);
        
        // 副标题
        var subtitleText = createLabel(subtitle || "请稍候...", 12, FB.colors.textSecondary, false);
        subtitleText.setGravity(android.view.Gravity.CENTER);
        var stParams = new android.widget.LinearLayout.LayoutParams(-1, -2);
        stParams.setMargins(0, dip(4), 0, dip(16));
        subtitleText.setLayoutParams(stParams);
        mainLayout.addView(subtitleText);
        
        // 进度条
        var progressBar = new android.widget.ProgressBar(ctx, null, android.R.attr.progressBarStyleHorizontal);
        progressBar.setMax(100);
        progressBar.setProgress(0);
        var pbParams = new android.widget.LinearLayout.LayoutParams(-1, dip(8));
        pbParams.setMargins(0, dip(8), 0, dip(8));
        progressBar.setLayoutParams(pbParams);
        mainLayout.addView(progressBar);
        
        // 进度文本
        var progressText = createLabel("0%", 16, FB.colors.textPrimary, true);
        progressText.setGravity(android.view.Gravity.CENTER);
        mainLayout.addView(progressText);
        
        // 详细信息
        var detailText = createLabel("准备中...", 11, FB.colors.textSecondary, false);
        detailText.setGravity(android.view.Gravity.CENTER);
        var dtParams = new android.widget.LinearLayout.LayoutParams(-1, -2);
        dtParams.setMargins(0, dip(8), 0, dip(16));
        detailText.setLayoutParams(dtParams);
        mainLayout.addView(detailText);
        
        // 取消按钮
        var cancelBtn = createOutlineButton("取消", FB.colors.error, function() {
            FB.state.isProcessing = false;
            FB.state.currentTask = null;
            if (FB.ui.progressWindow) {
                FB.ui.progressWindow.dismiss();
                FB.ui.progressWindow = null;
            }
            clientMessage("§c[FastBuild] 操作已取消");
            toast("操作已取消");
        });
        mainLayout.addView(cancelBtn);
        
        var popup = new android.widget.PopupWindow(mainLayout, dip(300), -2, false);
        popup.setBackgroundDrawable(new android.graphics.drawable.ColorDrawable(android.graphics.Color.TRANSPARENT));
        popup.setOutsideTouchable(false);
        popup.setFocusable(false);
        
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
            if (FB.ui.progressBar) {
                FB.ui.progressBar.setProgress(Math.floor(percent));
            }
            if (FB.ui.progressText) {
                FB.ui.progressText.setText(Math.floor(percent) + "%");
            }
            if (FB.ui.detailText && detail) {
                FB.ui.detailText.setText(detail);
            }
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

// ============================================
// 核心导出功能 - 区块模式
// ============================================

function startChunkExport(fileName, range, speed, yMin, yMax, includeAir) {
    if (FB.state.isProcessing) {
        toast("有任务正在进行中");
        return;
    }
    
    FB.state.isProcessing = true;
    FB.config.maxBlocksPerTick = speed;
    
    var playerX = Math.floor(getPlayerX());
    var playerZ = Math.floor(getPlayerZ());
    
    // 计算区块范围
    var chunkX = Math.floor(playerX / 16);
    var chunkZ = Math.floor(playerZ / 16);
    
    var minChunkX = chunkX - range;
    var maxChunkX = chunkX + range;
    var minChunkZ = chunkZ - range;
    var maxChunkZ = chunkZ + range;
    
    // 计算坐标范围
    var x1 = minChunkX * 16;
    var z1 = minChunkZ * 16;
    var x2 = (maxChunkX + 1) * 16 - 1;
    var z2 = (maxChunkZ + 1) * 16 - 1;
    var y1 = yMin;
    var y2 = yMax;
    
    clientMessage("§b[FastBuild] §f开始区块导出...");
    clientMessage("§7范围: §e(" + x1 + "," + y1 + "," + z1 + ") §7到 §e(" + x2 + "," + y2 + "," + z2 + ")");
    
    showProgressUI("区块导出中", "正在扫描方块...");
    
    executeExport(fileName, x1, y1, z1, x2, y2, z2, includeAir);
}

// ============================================
// 核心导出功能 - 坐标模式
// ============================================

function startCoordExport(fileName, x1, y1, z1, x2, y2, z2, speed, includeAir) {
    if (FB.state.isProcessing) {
        toast("有任务正在进行中");
        return;
    }
    
    FB.state.isProcessing = true;
    FB.config.maxBlocksPerTick = speed;
    
    // 确保坐标顺序正确
    var minX = Math.min(x1, x2);
    var maxX = Math.max(x1, x2);
    var minY = Math.max(0, Math.min(y1, y2));
    var maxY = Math.min(255, Math.max(y1, y2)); // 支持更高的Y值
    var minZ = Math.min(z1, z2);
    var maxZ = Math.max(z1, z2);
    
    clientMessage("§b[FastBuild] §f开始坐标导出...");
    clientMessage("§7范围: §e(" + minX + "," + minY + "," + minZ + ") §7到 §e(" + maxX + "," + maxY + "," + maxZ + ")");
    
    showProgressUI("坐标导出中", "正在扫描方块...");
    
    executeExport(fileName, minX, minY, minZ, maxX, maxY, maxZ, includeAir);
}

function executeExport(fileName, x1, y1, z1, x2, y2, z2, includeAir) {
    // 建筑数据结构
    var buildingData = {
        version: FB.config.version,
        name: fileName,
        created: new Date().getTime(),
        origin: {x: x1, y: y1, z: z1},
        size: {
            x: x2 - x1 + 1,
            y: y2 - y1 + 1,
            z: z2 - z1 + 1
        },
        blocks: [],
        blockCount: 0
    };
    
    var totalBlocks = buildingData.size.x * buildingData.size.y * buildingData.size.z;
    
    FB.state.currentTask = {
        type: "export",
        data: buildingData,
        params: {
            x1: x1, y1: y1, z1: z1,
            x2: x2, y2: y2, z2: z2,
            currentX: x1,
            currentY: y1,
            currentZ: z1,
            includeAir: includeAir,
            fileName: fileName
        },
        totalBlocks: totalBlocks,
        processedBlocks: 0
    };
}

// ============================================
// modTick - 兼容0.14.3的任务处理
// ============================================

function modTick() {
    if (!FB.state.isProcessing || !FB.state.currentTask) {
        return;
    }
    
    // 增加tick计数器，用于调试
    FB.state.tickCounter++;
    
    try {
        var task = FB.state.currentTask;
        
        if (task.type === "export") {
            processExportTick();
        } else if (task.type === "import") {
            processImportTick();
        }
    } catch (e) {
        clientMessage("§c[FastBuild] 任务处理错误: " + e);
        FB.state.isProcessing = false;
        FB.state.currentTask = null;
        closeProgressUI();
    }
}

function processExportTick() {
    var task = FB.state.currentTask;
    if (!task) return;
    
    var params = task.params;
    var data = task.data;
    var blocksThisTick = 0;
    var maxBlocks = FB.config.maxBlocksPerTick;
    
    while (blocksThisTick < maxBlocks && FB.state.isProcessing) {
        // 检查是否完成
        if (params.currentY > params.y2) {
            finishExport(data, params.fileName);
            return;
        }
        
        // 获取方块数据
        var blockId = 0;
        var blockData = 0;
        
        try {
            blockId = getTile(params.currentX, params.currentY, params.currentZ);
            blockData = Level.getData(params.currentX, params.currentY, params.currentZ);
        } catch (e) {
            blockId = 0;
            blockData = 0;
        }
        
        // 保存方块（相对坐标）
        if (blockId !== 0 || params.includeAir) {
            data.blocks.push({
                x: params.currentX - params.x1,
                y: params.currentY - params.y1,
                z: params.currentZ - params.z1,
                id: blockId,
                data: blockData
            });
            data.blockCount++;
        }
        
        task.processedBlocks++;
        blocksThisTick++;
        
        // 移动到下一个方块 - X -> Z -> Y 顺序
        params.currentX++;
        if (params.currentX > params.x2) {
            params.currentX = params.x1;
            params.currentZ++;
            if (params.currentZ > params.z2) {
                params.currentZ = params.z1;
                params.currentY++;
            }
        }
    }
    
    // 更新进度 - 每10tick更新一次UI减少开销
    if (FB.state.tickCounter % 10 === 0) {
        var percent = (task.processedBlocks / task.totalBlocks) * 100;
        updateProgress(percent, "已扫描: " + task.processedBlocks + "/" + task.totalBlocks + "\n保存: " + data.blockCount + " 个方块");
    }
}

function finishExport(data, fileName) {
    FB.state.isProcessing = false;
    FB.state.currentTask = null;
    
    // 保存文件
    var filePath = FB.config.defaultPath + fileName + FB.config.fileExtension;
    
    try {
        var json = JSON.stringify(data);
        
        // 文件格式: FBUILD1 + JSON数据
        var fileContent = "FBUILD1" + json;
        
        var file = new java.io.File(filePath);
        var writer = new java.io.FileWriter(file);
        writer.write(fileContent);
        writer.close();
        
        closeProgressUI();
        
        clientMessage("§a[FastBuild] §f导出完成!");
        clientMessage("§7文件: §e" + fileName + FB.config.fileExtension);
        clientMessage("§7方块数量: §e" + data.blockCount);
        clientMessage("§7尺寸: §e" + data.size.x + "x" + data.size.y + "x" + data.size.z);
        clientMessage("§7文件大小: §e" + formatFileSize(file.length()));
        
        toast("导出成功!");
        
    } catch (e) {
        closeProgressUI();
        clientMessage("§c[FastBuild] 保存失败: " + e);
        toast("保存失败!");
    }
}

// ============================================
// 核心导入功能
// ============================================

function startImport(filePath, mode, targetX, targetY, targetZ, speed) {
    if (FB.state.isProcessing) {
        toast("有任务正在进行中");
        return;
    }
    
    // 读取文件
    try {
        var file = new java.io.File(filePath);
        if (!file.exists()) {
            clientMessage("§c[FastBuild] 文件不存在: " + filePath);
            toast("文件不存在");
            return;
        }
        
        var reader = new java.io.BufferedReader(new java.io.FileReader(file));
        var content = "";
        var line;
        while ((line = reader.readLine()) !== null) {
            content += line;
        }
        reader.close();
        
        // 检查文件头
        if (content.indexOf("FBUILD1") !== 0) {
            clientMessage("§c[FastBuild] 无效的建筑文件格式");
            toast("无效的文件格式");
            return;
        }
        
        // 解析JSON
        var jsonStr = content.substring(7); // 移除 "FBUILD1"
        var data;
        
        try {
            data = JSON.parse(jsonStr);
        } catch (parseError) {
            clientMessage("§c[FastBuild] 文件解析失败: " + parseError);
            toast("文件解析失败");
            return;
        }
        
        if (!data.blocks || data.blocks.length === 0) {
            clientMessage("§c[FastBuild] 建筑文件为空");
            toast("建筑文件为空");
            return;
        }
        
        FB.state.isProcessing = true;
        FB.config.maxBlocksPerTick = speed;
        
        // 计算偏移量
        var offsetX = 0, offsetY = 0, offsetZ = 0;
        var useOriginal = false;
        
        if (mode === 1) {
            // 原始坐标
            offsetX = data.origin.x;
            offsetY = data.origin.y;
            offsetZ = data.origin.z;
            useOriginal = true;
        } else if (mode === 2 || mode === 3) {
            // 玩家坐标或指定坐标
            offsetX = targetX;
            offsetY = targetY;
            offsetZ = targetZ;
            useOriginal = false;
        }
        
        clientMessage("§b[FastBuild] §f开始导入建筑...");
        clientMessage("§7名称: §e" + data.name);
        clientMessage("§7方块数量: §e" + data.blocks.length);
        clientMessage("§7尺寸: §e" + data.size.x + "x" + data.size.y + "x" + data.size.z);
        clientMessage("§7目标位置: §e(" + offsetX + "," + offsetY + "," + offsetZ + ")");
        
        showProgressUI("导入建筑中", "正在放置方块...");
        
        FB.state.currentTask = {
            type: "import",
            data: data,
            params: {
                offsetX: offsetX,
                offsetY: offsetY,
                offsetZ: offsetZ,
                useOriginal: useOriginal,
                currentIndex: 0
            },
            totalBlocks: data.blocks.length,
            processedBlocks: 0,
            placedBlocks: 0
        };
        
    } catch (e) {
        clientMessage("§c[FastBuild] 读取文件失败: " + e);
        toast("读取失败");
    }
}

function processImportTick() {
    var task = FB.state.currentTask;
    if (!task || !task.data || !task.data.blocks) {
        FB.state.isProcessing = false;
        FB.state.currentTask = null;
        return;
    }
    
    var params = task.params;
    var data = task.data;
    var blocksThisTick = 0;
    var maxBlocks = FB.config.maxBlocksPerTick;
    
    // 处理方块
    while (blocksThisTick < maxBlocks && params.currentIndex < data.blocks.length && FB.state.isProcessing) {
        var block = data.blocks[params.currentIndex];
        
        if (block) {
            var x, y, z;
            
            if (params.useOriginal) {
                // 使用原始坐标 + 相对位置
                x = data.origin.x + block.x;
                y = data.origin.y + block.y;
                z = data.origin.z + block.z;
            } else {
                // 使用偏移量 + 相对位置
                x = params.offsetX + block.x;
                y = params.offsetY + block.y;
                z = params.offsetZ + block.z;
            }
            
            // 确保Y坐标在有效范围内 (0-127 for 0.14.3, 0-255 for newer)
            if (y >= 0 && y <= 255) {
                try {
                    // 使用setTile放置方块
                    setTile(x, y, z, block.id, block.data);
                    task.placedBlocks++;
                } catch (e) {
                    // 忽略放置失败的方块
                }
            }
        }
        
        params.currentIndex++;
        task.processedBlocks++;
        blocksThisTick++;
    }
    
    // 更新进度 - 每5tick更新一次
    if (FB.state.tickCounter % 5 === 0 || params.currentIndex >= data.blocks.length) {
        var percent = (task.processedBlocks / task.totalBlocks) * 100;
        updateProgress(percent, "已处理: " + task.processedBlocks + "/" + task.totalBlocks + "\n已放置: " + task.placedBlocks + " 个方块");
    }
    
    // 检查是否完成
    if (params.currentIndex >= data.blocks.length) {
        finishImport();
    }
}

function finishImport() {
    var task = FB.state.currentTask;
    var placedCount = task ? task.placedBlocks : 0;
    
    FB.state.isProcessing = false;
    FB.state.currentTask = null;
    
    closeProgressUI();
    
    clientMessage("§a[FastBuild] §f导入完成!");
    clientMessage("§7成功放置 §e" + placedCount + " §7个方块");
    
    toast("导入成功!");
}

// ============================================
// 加载提示
// ============================================

print("[FastBuild] 脚本已加载，进入存档后可用");