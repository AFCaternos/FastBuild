// ============================================
// FastBuild v1.0.0
// 服务器建筑保存工具
// 适用于 Minecraft PE 0.14.3 BlockLauncher
// ES5 语法
// ============================================

var FB = {};

// ============ 配置 ============
FB.config = {
    version: "1.0.0",
    fileExtension: ".fb",
    defaultPath: "/sdcard/games/com.mojang/fastbuild/",
    chunkSize: 16,
    maxBlocksPerTick: 50,
    saveSpeed: 1
};

// ============ 状态 ============
FB.state = {
    isProcessing: false,
    currentTask: null,
    progress: 0,
    totalBlocks: 0,
    processedBlocks: 0
};

// ============ UI ============
FB.ui = {
    ctx: null,
    mainWindow: null,
    progressWindow: null,
    currentDialog: null
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
// 初始化函数
// ============================================

function newLevel() {
    FB.ui.ctx = com.mojang.minecraftpe.MainActivity.currentMainActivity.get();
    initDirectory();
    clientMessage("§b§l[FastBuild] §a已加载 v" + FB.config.version);
    clientMessage("§7输入 §e/fb §7打开菜单");
}

function leaveGame() {
    closeAllWindows();
    FB.state.isProcessing = false;
    FB.state.currentTask = null;
}

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
// 命令处理
// ============================================

function procCmd(cmd) {
    var args = cmd.split(" ");
    var command = args[0].toLowerCase();
    
    if (command === "fb" || command === "fastbuild") {
        if (args.length === 1) {
            showMainUI();
        } else if (args[1] === "pos1") {
            setPos1();
        } else if (args[1] === "pos2") {
            setPos2();
        } else if (args[1] === "help") {
            showHelp();
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
    clientMessage("§b§l=== FastBuild 帮助 ===");
    clientMessage("§e/fb §7- 打开主菜单");
    clientMessage("§e/fb pos1 §7- 设置位置1");
    clientMessage("§e/fb pos2 §7- 设置位置2");
    clientMessage("§e/fb help §7- 显示帮助");
}

// ============================================
// UI 工具函数
// ============================================

function dip(value) {
    return Math.ceil(value * FB.ui.ctx.getResources().getDisplayMetrics().density);
}

function runOnUiThread(func) {
    FB.ui.ctx.runOnUiThread(new java.lang.Runnable({
        run: function() {
            try {
                func();
            } catch (e) {
                clientMessage("§c[UI Error] " + e);
            }
        }
    }));
}

function closeAllWindows() {
    runOnUiThread(function() {
        if (FB.ui.mainWindow) {
            FB.ui.mainWindow.dismiss();
            FB.ui.mainWindow = null;
        }
        if (FB.ui.progressWindow) {
            FB.ui.progressWindow.dismiss();
            FB.ui.progressWindow = null;
        }
        if (FB.ui.currentDialog) {
            FB.ui.currentDialog.dismiss();
            FB.ui.currentDialog = null;
        }
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

function createMaterialButton(text, color, onClick) {
    var ctx = FB.ui.ctx;
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
                v.animate().scaleX(0.95).scaleY(0.95).setDuration(100).start();
            } else if (action === android.view.MotionEvent.ACTION_UP || 
                       action === android.view.MotionEvent.ACTION_CANCEL) {
                v.setAlpha(1.0);
                v.animate().scaleX(1.0).scaleY(1.0).setDuration(100).start();
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
    var ctx = FB.ui.ctx;
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
    var ctx = FB.ui.ctx;
    var input = new android.widget.EditText(ctx);
    input.setHint(hint);
    if (defaultValue !== undefined) {
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
    var ctx = FB.ui.ctx;
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
    var ctx = FB.ui.ctx;
    var divider = new android.view.View(ctx);
    var params = new android.widget.LinearLayout.LayoutParams(-1, dip(1));
    params.setMargins(0, dip(16), 0, dip(16));
    divider.setLayoutParams(params);
    divider.setBackgroundColor(android.graphics.Color.parseColor(FB.colors.divider));
    return divider;
}

function createScrollView(content) {
    var ctx = FB.ui.ctx;
    var scroll = new android.widget.ScrollView(ctx);
    scroll.addView(content);
    scroll.setVerticalScrollBarEnabled(true);
    return scroll;
}

// ============================================
// 主界面
// ============================================

function showMainUI() {
    runOnUiThread(function() {
        if (FB.ui.mainWindow) {
            FB.ui.mainWindow.dismiss();
        }
        
        var ctx = FB.ui.ctx;
        
        // 主容器
        var mainLayout = new android.widget.LinearLayout(ctx);
        mainLayout.setOrientation(android.widget.LinearLayout.VERTICAL);
        mainLayout.setGravity(android.view.Gravity.CENTER_HORIZONTAL);
        mainLayout.setPadding(dip(24), dip(24), dip(24), dip(24));
        mainLayout.setBackground(createRoundedBackground(FB.colors.card, 16, null, 0));
        
        // 添加阴影效果
        if (android.os.Build.VERSION.SDK_INT >= 21) {
            mainLayout.setElevation(dip(8));
        }
        
        // Logo/标题区域
        var titleLayout = new android.widget.LinearLayout(ctx);
        titleLayout.setOrientation(android.widget.LinearLayout.VERTICAL);
        titleLayout.setGravity(android.view.Gravity.CENTER);
        
        var iconText = new android.widget.TextView(ctx);
        iconText.setText("🏗️");
        iconText.setTextSize(48);
        iconText.setGravity(android.view.Gravity.CENTER);
        titleLayout.addView(iconText);
        
        var titleText = createLabel("FastBuild", 28, FB.colors.primary, true);
        titleText.setGravity(android.view.Gravity.CENTER);
        titleLayout.addView(titleText);
        
        var versionText = createLabel("v" + FB.config.version + " | 建筑保存工具", 12, FB.colors.textSecondary, false);
        versionText.setGravity(android.view.Gravity.CENTER);
        var vParams = new android.widget.LinearLayout.LayoutParams(-2, -2);
        vParams.setMargins(0, dip(4), 0, 0);
        versionText.setLayoutParams(vParams);
        titleLayout.addView(versionText);
        
        mainLayout.addView(titleLayout);
        mainLayout.addView(createDivider());
        
        // 功能按钮
        var sectionLabel = createLabel("选择操作模式", 12, FB.colors.textSecondary, false);
        var sParams = new android.widget.LinearLayout.LayoutParams(-2, -2);
        sParams.setMargins(0, 0, 0, dip(8));
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
        
        var posInfoLabel = createLabel("当前位置", 12, FB.colors.primary, true);
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
            "位置1: (" + FB.data.pos1.x + "," + FB.data.pos1.y + "," + FB.data.pos1.z + ")  " +
            "位置2: (" + FB.data.pos2.x + "," + FB.data.pos2.y + "," + FB.data.pos2.z + ")",
            11, FB.colors.textSecondary, false
        );
        var spParams = new android.widget.LinearLayout.LayoutParams(-2, -2);
        spParams.setMargins(0, dip(4), 0, 0);
        savedPosLabel.setLayoutParams(spParams);
        infoLayout.addView(savedPosLabel);
        
        var infoParams = new android.widget.LinearLayout.LayoutParams(-1, -2);
        infoParams.setMargins(0, dip(8), 0, 0);
        infoLayout.setLayoutParams(infoParams);
        mainLayout.addView(infoLayout);
        
        // 关闭按钮
        var closeBtn = createOutlineButton("✕ 关闭", FB.colors.error, function() {
            FB.ui.mainWindow.dismiss();
        });
        mainLayout.addView(closeBtn);
        
        // 创建弹窗
        var popup = new android.widget.PopupWindow(mainLayout, dip(320), -2, true);
        popup.setBackgroundDrawable(new android.graphics.drawable.ColorDrawable(android.graphics.Color.TRANSPARENT));
        popup.setOutsideTouchable(true);
        popup.setFocusable(true);
        popup.showAtLocation(ctx.getWindow().getDecorView(), android.view.Gravity.CENTER, 0, 0);
        
        FB.ui.mainWindow = popup;
        
        // 入场动画
        mainLayout.setAlpha(0);
        mainLayout.setScaleX(0.8);
        mainLayout.setScaleY(0.8);
        mainLayout.animate()
            .alpha(1)
            .scaleX(1)
            .scaleY(1)
            .setDuration(200)
            .setInterpolator(new android.view.animation.DecelerateInterpolator())
            .start();
    });
}

// ============================================
// 区块导出界面
// ============================================

function showChunkExportUI() {
    runOnUiThread(function() {
        var ctx = FB.ui.ctx;
        
        var mainLayout = new android.widget.LinearLayout(ctx);
        mainLayout.setOrientation(android.widget.LinearLayout.VERTICAL);
        mainLayout.setPadding(dip(24), dip(24), dip(24), dip(24));
        mainLayout.setBackground(createRoundedBackground(FB.colors.card, 16, null, 0));
        
        // 标题
        var titleLayout = new android.widget.LinearLayout(ctx);
        titleLayout.setOrientation(android.widget.LinearLayout.HORIZONTAL);
        titleLayout.setGravity(android.view.Gravity.CENTER_VERTICAL);
        
        var backBtn = new android.widget.TextView(ctx);
        backBtn.setText("←");
        backBtn.setTextSize(24);
        backBtn.setTextColor(android.graphics.Color.parseColor(FB.colors.primary));
        backBtn.setPadding(0, 0, dip(16), 0);
        backBtn.setOnClickListener(new android.view.View.OnClickListener({
            onClick: function(v) {
                FB.ui.mainWindow.dismiss();
                showMainUI();
            }
        }));
        titleLayout.addView(backBtn);
        
        var title = createLabel("区块导出模式", 20, FB.colors.primary, true);
        titleLayout.addView(title);
        mainLayout.addView(titleLayout);
        
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
        
        // 导出范围（以玩家为中心的区块数）
        mainLayout.addView(createLabel("导出范围（区块半径）", 12, FB.colors.textSecondary, false));
        var rangeInput = createNumberInput("1-10", "3");
        mainLayout.addView(rangeInput);
        
        // 速度设置
        mainLayout.addView(createLabel("每Tick处理方块数", 12, FB.colors.textSecondary, false));
        var speedInput = createNumberInput("10-200", "50");
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
            var includeAir = airCheck.isChecked();
            
            if (fileName.length === 0) {
                toast("请输入文件名");
                return;
            }
            
            range = Math.max(1, Math.min(10, range));
            speed = Math.max(10, Math.min(200, speed));
            
            FB.ui.mainWindow.dismiss();
            startChunkExport(fileName, range, speed, includeAir);
        }));
        
        mainLayout.addView(createOutlineButton("取消", FB.colors.textSecondary, function() {
            FB.ui.mainWindow.dismiss();
            showMainUI();
        }));
        
        var popup = new android.widget.PopupWindow(mainLayout, dip(320), -2, true);
        popup.setBackgroundDrawable(new android.graphics.drawable.ColorDrawable(android.graphics.Color.TRANSPARENT));
        popup.setFocusable(true);
        popup.showAtLocation(ctx.getWindow().getDecorView(), android.view.Gravity.CENTER, 0, 0);
        
        FB.ui.mainWindow = popup;
        
        // 动画
        mainLayout.setAlpha(0);
        mainLayout.setTranslationX(dip(50));
        mainLayout.animate().alpha(1).translationX(0).setDuration(200).start();
    });
}

// ============================================
// 坐标导出界面
// ============================================

function showCoordExportUI() {
    runOnUiThread(function() {
        var ctx = FB.ui.ctx;
        
        var mainLayout = new android.widget.LinearLayout(ctx);
        mainLayout.setOrientation(android.widget.LinearLayout.VERTICAL);
        mainLayout.setPadding(dip(24), dip(24), dip(24), dip(24));
        mainLayout.setBackground(createRoundedBackground(FB.colors.card, 16, null, 0));
        
        // 标题栏
        var titleLayout = new android.widget.LinearLayout(ctx);
        titleLayout.setOrientation(android.widget.LinearLayout.HORIZONTAL);
        titleLayout.setGravity(android.view.Gravity.CENTER_VERTICAL);
        
        var backBtn = new android.widget.TextView(ctx);
        backBtn.setText("←");
        backBtn.setTextSize(24);
        backBtn.setTextColor(android.graphics.Color.parseColor(FB.colors.primary));
        backBtn.setPadding(0, 0, dip(16), 0);
        backBtn.setOnClickListener(new android.view.View.OnClickListener({
            onClick: function(v) {
                FB.ui.mainWindow.dismiss();
                showMainUI();
            }
        }));
        titleLayout.addView(backBtn);
        
        titleLayout.addView(createLabel("坐标导出模式", 20, FB.colors.primary, true));
        mainLayout.addView(titleLayout);
        
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
        mainLayout.addView(createLabel("起始位置 (X, Y, Z)", 12, FB.colors.textSecondary, false));
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
        
        var popup = new android.widget.PopupWindow(scrollView, dip(340), dip(500), true);
        popup.setBackgroundDrawable(new android.graphics.drawable.ColorDrawable(android.graphics.Color.TRANSPARENT));
        popup.setFocusable(true);
        popup.showAtLocation(ctx.getWindow().getDecorView(), android.view.Gravity.CENTER, 0, 0);
        
        FB.ui.mainWindow = popup;
        
        mainLayout.setAlpha(0);
        mainLayout.setTranslationX(dip(50));
        mainLayout.animate().alpha(1).translationX(0).setDuration(200).start();
    });
}

// ============================================
// 导入界面
// ============================================

function showImportUI() {
    runOnUiThread(function() {
        var ctx = FB.ui.ctx;
        
        var mainLayout = new android.widget.LinearLayout(ctx);
        mainLayout.setOrientation(android.widget.LinearLayout.VERTICAL);
        mainLayout.setPadding(dip(24), dip(24), dip(24), dip(24));
        mainLayout.setBackground(createRoundedBackground(FB.colors.card, 16, null, 0));
        
        // 标题栏
        var titleLayout = new android.widget.LinearLayout(ctx);
        titleLayout.setOrientation(android.widget.LinearLayout.HORIZONTAL);
        titleLayout.setGravity(android.view.Gravity.CENTER_VERTICAL);
        
        var backBtn = new android.widget.TextView(ctx);
        backBtn.setText("←");
        backBtn.setTextSize(24);
        backBtn.setTextColor(android.graphics.Color.parseColor(FB.colors.primary));
        backBtn.setPadding(0, 0, dip(16), 0);
        backBtn.setOnClickListener(new android.view.View.OnClickListener({
            onClick: function(v) {
                FB.ui.mainWindow.dismiss();
                showMainUI();
            }
        }));
        titleLayout.addView(backBtn);
        
        titleLayout.addView(createLabel("导入建筑", 20, FB.colors.warning, true));
        mainLayout.addView(titleLayout);
        
        mainLayout.addView(createDivider());
        
        // 文件路径
        mainLayout.addView(createLabel("文件路径", 12, FB.colors.textSecondary, false));
        var pathInput = createInputField("输入.fb文件完整路径", FB.config.defaultPath);
        mainLayout.addView(pathInput);
        
        // 快速选择按钮
        mainLayout.addView(createOutlineButton("📁 从默认目录选择", FB.colors.primary, function() {
            FB.ui.mainWindow.dismiss();
            showFileListUI(function(path) {
                FB.data.filePath = path;
                showImportUI();
            });
        }));
        
        // 如果已选择文件，显示
        if (FB.data.filePath.length > 0) {
            pathInput.setText(FB.data.filePath);
        }
        
        mainLayout.addView(createDivider());
        
        // 导入模式
        mainLayout.addView(createLabel("导入模式", 14, FB.colors.textPrimary, true));
        
        var radioGroup = new android.widget.RadioGroup(ctx);
        radioGroup.setOrientation(android.widget.LinearLayout.VERTICAL);
        
        var radio1 = new android.widget.RadioButton(ctx);
        radio1.setText("按原始坐标导入");
        radio1.setTextSize(14);
        radio1.setId(1);
        radio1.setChecked(true);
        radioGroup.addView(radio1);
        
        var radio2 = new android.widget.RadioButton(ctx);
        radio2.setText("以玩家位置为基准");
        radio2.setTextSize(14);
        radio2.setId(2);
        radioGroup.addView(radio2);
        
        var radio3 = new android.widget.RadioButton(ctx);
        radio3.setText("指定位置导入");
        radio3.setTextSize(14);
        radio3.setId(3);
        radioGroup.addView(radio3);
        
        mainLayout.addView(radioGroup);
        
        // 指定坐标输入（默认隐藏）
        var customPosLayout = new android.widget.LinearLayout(ctx);
        customPosLayout.setOrientation(android.widget.LinearLayout.VERTICAL);
        customPosLayout.setVisibility(android.view.View.GONE);
        
        customPosLayout.addView(createLabel("目标位置 (X, Y, Z)", 12, FB.colors.textSecondary, false));
        
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
        var speedInput = createNumberInput("10-200", "50");
        mainLayout.addView(speedInput);
        
        mainLayout.addView(createDivider());
        
        // 开始按钮
        mainLayout.addView(createMaterialButton("📥 开始导入", FB.colors.warning, function() {
            var filePath = String(pathInput.getText());
            var speed = parseInt(speedInput.getText()) || 50;
            var mode = radioGroup.getCheckedRadioButtonId();
            
            var targetX = 0, targetY = 0, targetZ = 0;
            
            if (mode === 1) {
                // 原始坐标
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
            
            speed = Math.max(10, Math.min(200, speed));
            
            FB.ui.mainWindow.dismiss();
            startImport(filePath, mode, targetX, targetY, targetZ, speed);
        }));
        
        mainLayout.addView(createOutlineButton("取消", FB.colors.textSecondary, function() {
            FB.ui.mainWindow.dismiss();
            showMainUI();
        }));
        
        var scrollView = createScrollView(mainLayout);
        
        var popup = new android.widget.PopupWindow(scrollView, dip(340), dip(480), true);
        popup.setBackgroundDrawable(new android.graphics.drawable.ColorDrawable(android.graphics.Color.TRANSPARENT));
        popup.setFocusable(true);
        popup.showAtLocation(ctx.getWindow().getDecorView(), android.view.Gravity.CENTER, 0, 0);
        
        FB.ui.mainWindow = popup;
        
        mainLayout.setAlpha(0);
        mainLayout.setTranslationX(dip(50));
        mainLayout.animate().alpha(1).translationX(0).setDuration(200).start();
    });
}

// ============================================
// 文件列表界面
// ============================================

function showFileListUI(callback) {
    runOnUiThread(function() {
        var ctx = FB.ui.ctx;
        
        var mainLayout = new android.widget.LinearLayout(ctx);
        mainLayout.setOrientation(android.widget.LinearLayout.VERTICAL);
        mainLayout.setPadding(dip(24), dip(24), dip(24), dip(24));
        mainLayout.setBackground(createRoundedBackground(FB.colors.card, 16, null, 0));
        
        // 标题
        var titleLayout = new android.widget.LinearLayout(ctx);
        titleLayout.setOrientation(android.widget.LinearLayout.HORIZONTAL);
        titleLayout.setGravity(android.view.Gravity.CENTER_VERTICAL);
        
        var backBtn = new android.widget.TextView(ctx);
        backBtn.setText("←");
        backBtn.setTextSize(24);
        backBtn.setTextColor(android.graphics.Color.parseColor(FB.colors.primary));
        backBtn.setPadding(0, 0, dip(16), 0);
        backBtn.setOnClickListener(new android.view.View.OnClickListener({
            onClick: function(v) {
                FB.ui.mainWindow.dismiss();
                showImportUI();
            }
        }));
        titleLayout.addView(backBtn);
        
        titleLayout.addView(createLabel("选择文件", 20, FB.colors.primary, true));
        mainLayout.addView(titleLayout);
        
        mainLayout.addView(createDivider());
        
        // 文件列表
        var fileListLayout = new android.widget.LinearLayout(ctx);
        fileListLayout.setOrientation(android.widget.LinearLayout.VERTICAL);
        
        try {
            var dir = new java.io.File(FB.config.defaultPath);
            var files = dir.listFiles();
            
            if (files && files.length > 0) {
                for (var i = 0; i < files.length; i++) {
                    var file = files[i];
                    var fileName = String(file.getName());
                    
                    if (fileName.endsWith(FB.config.fileExtension)) {
                        (function(f, fn) {
                            var fileBtn = new android.widget.LinearLayout(ctx);
                            fileBtn.setOrientation(android.widget.LinearLayout.HORIZONTAL);
                            fileBtn.setGravity(android.view.Gravity.CENTER_VERTICAL);
                            fileBtn.setPadding(dip(12), dip(12), dip(12), dip(12));
                            fileBtn.setBackground(createRoundedBackground("#F5F5F5", 8, null, 0));
                            
                            var iconText = new android.widget.TextView(ctx);
                            iconText.setText("📄");
                            iconText.setTextSize(20);
                            iconText.setPadding(0, 0, dip(12), 0);
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
                            fbParams.setMargins(0, dip(8), 0, 0);
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
            } else {
                var emptyText = createLabel("没有找到 .fb 文件", 14, FB.colors.textSecondary, false);
                emptyText.setGravity(android.view.Gravity.CENTER);
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
        var pathText = createLabel("目录: " + FB.config.defaultPath, 11, FB.colors.textSecondary, false);
        mainLayout.addView(pathText);
        
        mainLayout.addView(createOutlineButton("取消", FB.colors.textSecondary, function() {
            FB.ui.mainWindow.dismiss();
            showImportUI();
        }));
        
        var popup = new android.widget.PopupWindow(mainLayout, dip(340), -2, true);
        popup.setBackgroundDrawable(new android.graphics.drawable.ColorDrawable(android.graphics.Color.TRANSPARENT));
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
        var ctx = FB.ui.ctx;
        
        var mainLayout = new android.widget.LinearLayout(ctx);
        mainLayout.setOrientation(android.widget.LinearLayout.VERTICAL);
        mainLayout.setPadding(dip(24), dip(24), dip(24), dip(24));
        mainLayout.setBackground(createRoundedBackground(FB.colors.card, 16, null, 0));
        
        // 标题
        var titleLayout = new android.widget.LinearLayout(ctx);
        titleLayout.setOrientation(android.widget.LinearLayout.HORIZONTAL);
        titleLayout.setGravity(android.view.Gravity.CENTER_VERTICAL);
        
        var backBtn = new android.widget.TextView(ctx);
        backBtn.setText("←");
        backBtn.setTextSize(24);
        backBtn.setTextColor(android.graphics.Color.parseColor(FB.colors.primary));
        backBtn.setPadding(0, 0, dip(16), 0);
        backBtn.setOnClickListener(new android.view.View.OnClickListener({
            onClick: function(v) {
                FB.ui.mainWindow.dismiss();
                showMainUI();
            }
        }));
        titleLayout.addView(backBtn);
        
        titleLayout.addView(createLabel("文件管理", 20, FB.colors.primary, true));
        mainLayout.addView(titleLayout);
        
        mainLayout.addView(createDivider());
        
        // 统计信息
        var statsLayout = new android.widget.LinearLayout(ctx);
        statsLayout.setOrientation(android.widget.LinearLayout.HORIZONTAL);
        statsLayout.setBackground(createRoundedBackground("#E8F5E9", 8, null, 0));
        statsLayout.setPadding(dip(12), dip(12), dip(12), dip(12));
        
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
        
        var statsText = createLabel("📊 共 " + fileCount + " 个文件, 总大小 " + formatFileSize(totalSize), 14, FB.colors.success, false);
        statsLayout.addView(statsText);
        mainLayout.addView(statsLayout);
        
        // 文件列表
        var fileListLayout = new android.widget.LinearLayout(ctx);
        fileListLayout.setOrientation(android.widget.LinearLayout.VERTICAL);
        
        try {
            var dir = new java.io.File(FB.config.defaultPath);
            var files = dir.listFiles();
            
            if (files && files.length > 0) {
                for (var i = 0; i < files.length; i++) {
                    var file = files[i];
                    var fileName = String(file.getName());
                    
                    if (fileName.endsWith(FB.config.fileExtension)) {
                        (function(f, fn) {
                            var fileItem = new android.widget.LinearLayout(ctx);
                            fileItem.setOrientation(android.widget.LinearLayout.HORIZONTAL);
                            fileItem.setGravity(android.view.Gravity.CENTER_VERTICAL);
                            fileItem.setPadding(dip(12), dip(12), dip(12), dip(12));
                            fileItem.setBackground(createRoundedBackground("#FAFAFA", 8, FB.colors.divider, 1));
                            
                            var iconText = new android.widget.TextView(ctx);
                            iconText.setText("📄");
                            iconText.setTextSize(20);
                            iconText.setPadding(0, 0, dip(12), 0);
                            fileItem.addView(iconText);
                            
                            var infoLayout = new android.widget.LinearLayout(ctx);
                            infoLayout.setOrientation(android.widget.LinearLayout.VERTICAL);
                            infoLayout.setLayoutParams(new android.widget.LinearLayout.LayoutParams(0, -2, 1));
                            
                            var nameText = createLabel(fn, 14, FB.colors.textPrimary, false);
                            infoLayout.addView(nameText);
                            
                            var sizeText = createLabel(formatFileSize(f.length()) + " | " + formatDate(f.lastModified()), 11, FB.colors.textSecondary, false);
                            infoLayout.addView(sizeText);
                            
                            fileItem.addView(infoLayout);
                            
                            // 删除按钮
                            var deleteBtn = new android.widget.TextView(ctx);
                            deleteBtn.setText("🗑️");
                            deleteBtn.setTextSize(18);
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
                            fiParams.setMargins(0, dip(8), 0, 0);
                            fileItem.setLayoutParams(fiParams);
                            
                            fileListLayout.addView(fileItem);
                        })(file, fileName);
                    }
                }
            } else {
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
        flParams.setMargins(0, dip(12), 0, 0);
        fileListLayout.setLayoutParams(flParams);
        
        var scrollView = createScrollView(fileListLayout);
        scrollView.setLayoutParams(new android.widget.LinearLayout.LayoutParams(-1, dip(280)));
        mainLayout.addView(scrollView);
        
        mainLayout.addView(createDivider());
        
        // 路径显示
        var pathText = createLabel("📁 " + FB.config.defaultPath, 11, FB.colors.textSecondary, false);
        mainLayout.addView(pathText);
        
        mainLayout.addView(createOutlineButton("返回主菜单", FB.colors.primary, function() {
            FB.ui.mainWindow.dismiss();
            showMainUI();
        }));
        
        var popup = new android.widget.PopupWindow(mainLayout, dip(360), -2, true);
        popup.setBackgroundDrawable(new android.graphics.drawable.ColorDrawable(android.graphics.Color.TRANSPARENT));
        popup.setFocusable(true);
        popup.showAtLocation(ctx.getWindow().getDecorView(), android.view.Gravity.CENTER, 0, 0);
        
        FB.ui.mainWindow = popup;
    });
}

function showDeleteConfirmDialog(file, fileName, callback) {
    runOnUiThread(function() {
        var ctx = FB.ui.ctx;
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
    });
}

// ============================================
// 进度条界面
// ============================================

function showProgressUI(title, subtitle) {
    runOnUiThread(function() {
        var ctx = FB.ui.ctx;
        
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
        var stParams = new android.widget.LinearLayout.LayoutParams(-2, -2);
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
        var progressText = createLabel("0%", 14, FB.colors.textPrimary, false);
        progressText.setGravity(android.view.Gravity.CENTER);
        mainLayout.addView(progressText);
        
        // 详细信息
        var detailText = createLabel("准备中...", 11, FB.colors.textSecondary, false);
        detailText.setGravity(android.view.Gravity.CENTER);
        var dtParams = new android.widget.LinearLayout.LayoutParams(-2, -2);
        dtParams.setMargins(0, dip(8), 0, dip(16));
        detailText.setLayoutParams(dtParams);
        mainLayout.addView(detailText);
        
        // 取消按钮
        var cancelBtn = createOutlineButton("取消", FB.colors.error, function() {
            FB.state.isProcessing = false;
            FB.state.currentTask = null;
            FB.ui.progressWindow.dismiss();
            FB.ui.progressWindow = null;
            toast("操作已取消");
        });
        mainLayout.addView(cancelBtn);
        
        var popup = new android.widget.PopupWindow(mainLayout, dip(300), -2, false);
        popup.setBackgroundDrawable(new android.graphics.drawable.ColorDrawable(android.graphics.Color.TRANSPARENT));
        popup.showAtLocation(ctx.getWindow().getDecorView(), android.view.Gravity.CENTER, 0, 0);
        
        FB.ui.progressWindow = popup;
        FB.ui.progressBar = progressBar;
        FB.ui.progressText = progressText;
        FB.ui.detailText = detailText;
    });
}

function updateProgress(percent, detail) {
    runOnUiThread(function() {
        if (FB.ui.progressBar) {
            FB.ui.progressBar.setProgress(Math.floor(percent));
        }
        if (FB.ui.progressText) {
            FB.ui.progressText.setText(Math.floor(percent) + "%");
        }
        if (FB.ui.detailText && detail) {
            FB.ui.detailText.setText(detail);
        }
    });
}

function closeProgressUI() {
    runOnUiThread(function() {
        if (FB.ui.progressWindow) {
            FB.ui.progressWindow.dismiss();
            FB.ui.progressWindow = null;
        }
    });
}

// ============================================
// 工具函数
// ============================================

function toast(message) {
    runOnUiThread(function() {
        android.widget.Toast.makeText(FB.ui.ctx, message, android.widget.Toast.LENGTH_SHORT).show();
    });
}

function formatFileSize(bytes) {
    if (bytes < 1024) return bytes + " B";
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + " KB";
    return (bytes / (1024 * 1024)).toFixed(2) + " MB";
}

function formatDate(timestamp) {
    var date = new java.util.Date(timestamp);
    var format = new java.text.SimpleDateFormat("yyyy-MM-dd HH:mm");
    return String(format.format(date));
}

// ============================================
// 核心导出功能 - 区块模式
// ============================================

function startChunkExport(fileName, range, speed, includeAir) {
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
    var y1 = 0;
    var y2 = 127;
    
    clientMessage("§b[FastBuild] §f开始区块导出...");
    clientMessage("§7范围: (" + x1 + "," + y1 + "," + z1 + ") 到 (" + x2 + "," + y2 + "," + z2 + ")");
    
    showProgressUI("区块导出中", "正在扫描方块...");
    
    // 使用坐标导出
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
    var maxY = Math.min(127, Math.max(y1, y2));
    var minZ = Math.min(z1, z2);
    var maxZ = Math.max(z1, z2);
    
    clientMessage("§b[FastBuild] §f开始坐标导出...");
    clientMessage("§7范围: (" + minX + "," + minY + "," + minZ + ") 到 (" + maxX + "," + maxY + "," + maxZ + ")");
    
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
    var processedBlocks = 0;
    
    var currentX = x1;
    var currentY = y1;
    var currentZ = z1;
    
    FB.state.currentTask = {
        type: "export",
        data: buildingData,
        params: {
            x1: x1, y1: y1, z1: z1,
            x2: x2, y2: y2, z2: z2,
            currentX: currentX,
            currentY: currentY,
            currentZ: currentZ,
            includeAir: includeAir,
            fileName: fileName
        },
        totalBlocks: totalBlocks,
        processedBlocks: 0
    };
}

function modTick() {
    if (!FB.state.isProcessing || !FB.state.currentTask) return;
    
    var task = FB.state.currentTask;
    
    if (task.type === "export") {
        processExportTick();
    } else if (task.type === "import") {
        processImportTick();
    }
}

function processExportTick() {
    var task = FB.state.currentTask;
    var params = task.params;
    var data = task.data;
    var blocksProcessed = 0;
    
    while (blocksProcessed < FB.config.maxBlocksPerTick) {
        if (params.currentY > params.y2) {
            // 完成
            finishExport(data, params.fileName);
            return;
        }
        
        var blockId = getTile(params.currentX, params.currentY, params.currentZ);
        var blockData = Level.getData(params.currentX, params.currentY, params.currentZ);
        
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
        blocksProcessed++;
        
        // 移动到下一个方块
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
    
    // 更新进度
    var percent = (task.processedBlocks / task.totalBlocks) * 100;
    updateProgress(percent, "已扫描 " + task.processedBlocks + " / " + task.totalBlocks + " 方块\n保存 " + data.blockCount + " 个非空方块");
}

function finishExport(data, fileName) {
    FB.state.isProcessing = false;
    FB.state.currentTask = null;
    
    // 保存文件
    var filePath = FB.config.defaultPath + fileName + FB.config.fileExtension;
    
    try {
        var json = JSON.stringify(data);
        
        // 压缩数据（简单的Base64编码，减少文件大小）
        var fileContent = "FBUILD1" + json; // FBUILD1 是文件头标识
        
        var file = new java.io.File(filePath);
        var writer = new java.io.FileWriter(file);
        writer.write(fileContent);
        writer.close();
        
        closeProgressUI();
        
        clientMessage("§a[FastBuild] §f导出完成!");
        clientMessage("§7文件: §e" + filePath);
        clientMessage("§7方块数量: §e" + data.blockCount);
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
            toast("无效的建筑文件格式");
            return;
        }
        
        // 解析JSON
        var jsonStr = content.substring(7); // 移除 "FBUILD1"
        var data = JSON.parse(jsonStr);
        
        if (!data.blocks || data.blocks.length === 0) {
            toast("建筑文件为空");
            return;
        }
        
        FB.state.isProcessing = true;
        FB.config.maxBlocksPerTick = speed;
        
        // 计算偏移量
        var offsetX = 0, offsetY = 0, offsetZ = 0;
        
        if (mode === 1) {
            // 原始坐标 - 无偏移
            offsetX = data.origin.x;
            offsetY = data.origin.y;
            offsetZ = data.origin.z;
        } else if (mode === 2) {
            // 玩家坐标
            offsetX = targetX;
            offsetY = targetY;
            offsetZ = targetZ;
        } else if (mode === 3) {
            // 指定坐标
            offsetX = targetX;
            offsetY = targetY;
            offsetZ = targetZ;
        }
        
        clientMessage("§b[FastBuild] §f开始导入建筑...");
        clientMessage("§7名称: §e" + data.name);
        clientMessage("§7方块数量: §e" + data.blocks.length);
        clientMessage("§7目标位置: §e(" + offsetX + "," + offsetY + "," + offsetZ + ")");
        
        showProgressUI("导入建筑中", "正在放置方块...");
        
        FB.state.currentTask = {
            type: "import",
            data: data,
            params: {
                offsetX: offsetX,
                offsetY: offsetY,
                offsetZ: offsetZ,
                useOriginal: (mode === 1),
                currentIndex: 0
            },
            totalBlocks: data.blocks.length,
            processedBlocks: 0
        };
        
    } catch (e) {
        clientMessage("§c[FastBuild] 读取文件失败: " + e);
        toast("读取失败: " + e);
    }
}

function processImportTick() {
    var task = FB.state.currentTask;
    var params = task.params;
    var data = task.data;
    var blocksProcessed = 0;
    
    while (blocksProcessed < FB.config.maxBlocksPerTick && params.currentIndex < data.blocks.length) {
        var block = data.blocks[params.currentIndex];
        
        var x, y, z;
        if (params.useOriginal) {
            // 使用原始坐标
            x = data.origin.x + block.x;
            y = data.origin.y + block.y;
            z = data.origin.z + block.z;
        } else {
            // 使用偏移量
            x = params.offsetX + block.x;
            y = params.offsetY + block.y;
            z = params.offsetZ + block.z;
        }
        
        // 确保Y坐标在有效范围内
        if (y >= 0 && y <= 127) {
            setTile(x, y, z, block.id, block.data);
        }
        
        params.currentIndex++;
        task.processedBlocks++;
        blocksProcessed++;
    }
    
    // 更新进度
    var percent = (task.processedBlocks / task.totalBlocks) * 100;
    updateProgress(percent, "已放置 " + task.processedBlocks + " / " + task.totalBlocks + " 方块");
    
    // 检查是否完成
    if (params.currentIndex >= data.blocks.length) {
        finishImport();
    }
}

function finishImport() {
    var task = FB.state.currentTask;
    
    FB.state.isProcessing = false;
    FB.state.currentTask = null;
    
    closeProgressUI();
    
    clientMessage("§a[FastBuild] §f导入完成!");
    clientMessage("§7成功放置 §e" + task.processedBlocks + " §7个方块");
    
    toast("导入成功!");
}

// ============================================
// 结束
// ============================================

clientMessage("§b§l[FastBuild] §f脚本已加载");