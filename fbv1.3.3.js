// ============================================
// FastBuild v1.3.3 - 完整优化版
// 服务器建筑保存工具
// 适用于 Minecraft PE 0.14.3 - 1.1.5+
// ============================================

var FB = {};

// ============ 配置 ============
FB.config = {
    version: "1.3.3",
    fileExtension: ".fb",
    defaultPath: "/sdcard/games/com.mojang/fastbuild/",
    chunkSize: 16,
    exportBlocksPerTick: 8000,
    importBlocksPerTick: 3000,
    progressUpdateInterval: 3,
    useMultiThread: true,
    streamExport: false,
    streamFlushInterval: 5000,
    streamImportBatchSize: 5000,
    streamReadBufferSize: 262144
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

// ============ MD3 莫奈配色 — Material You 调色板 ============
FB.colors = {
    // ── Primary ──
    primary: "#6750A4",          onPrimary: "#FFFFFF",
    primaryContainer: "#EADDFF", onPrimaryContainer: "#21005D",
    // ── Secondary ──
    secondary: "#625B71",        onSecondary: "#FFFFFF",
    secondaryContainer: "#E8DEF8", onSecondaryContainer: "#1D192B",
    // ── Tertiary ──
    tertiary: "#7D5260",         onTertiary: "#FFFFFF",
    tertiaryContainer: "#FFD8E4", onTertiaryContainer: "#31111D",
    // ── Error ──
    error: "#B3261E",            onError: "#FFFFFF",
    errorContainer: "#F9DEDC",   onErrorContainer: "#410E0B",
    // ── Surface ──
    background: "#FEF7FF",       onBackground: "#1D1B20",
    surface: "#FEF7FF",          onSurface: "#1D1B20",
    surfaceVariant: "#E7E0EC",   onSurfaceVariant: "#49454F",
    surfaceContainerLowest: "#FFFFFF",
    surfaceContainerLow: "#F7F2FA",
    surfaceContainer: "#F3EDF7",
    surfaceContainerHigh: "#ECE6F0",
    surfaceContainerHighest: "#E6E0E9",
    // ── Outline ──
    outline: "#79747E",          outlineVariant: "#CAC4D0",
    // ── 语义 Tonal ──
    success: "#386A20",          successContainer: "#B8F397",
    warning: "#7C5800",          warningContainer: "#FFDEA6",
    // ── 兼容旧字段 ──
    primaryDark: "#6750A4",      primaryLight: "#EADDFF",
    accent: "#7D5260",           successLight: "#B8F397",
    warningLight: "#FFDEA6",     card: "#FEF7FF",
    cardHover: "#F3EDF7",        textPrimary: "#1D1B20",
    textSecondary: "#49454F",    textTertiary: "#79747E",
    divider: "#CAC4D0",          shadow: "#4900601A",
    // ── State Layer (8-12% opacity overlays for pressed states) ──
    stateLayerPrimary: "#146750A4",     // 8% primary on surface
    stateLayerOnSurface: "#1F1D1B20",   // 12% onSurface
    stateLayerError: "#14B3261E",       // 8% error
    stateLayerSuccess: "#14386A20",     // 8% success
    stateLayerTertiary: "#147D5260",    // 8% tertiary
    // ── Scrim ──
    scrim: "#52000000",                 // 32% black (M3 dialog scrim standard)
    scrimExit: "#00000000",             // 0% (退出时完全透明)
    // ── Dialog ──
    dialogBackground: "#ECE6F0",        // surfaceContainerHigh
    // ── FAB ──
    fabColor: "#6750A4",
    // ── Tonal Button ──
    tonalBg: "#E8DEF8",                 // secondaryContainer
    tonalText: "#1D192B",              // onSecondaryContainer
    tonalPressed: "#CAC4D0"            // secondaryContainer darker
};

// ═══ MD3 形状系统 ═══
FB.shape = { extraSmall: 4, xs: 8, sm: 12, md: 16, lg: 24, xl: 28, full: 9999 };

// ═══ MD3 海拔阴影系统 (M3 Elevation Levels) ═══
FB.elevation = { level0: 0, level1: 1, level2: 3, level3: 6, level4: 8, level5: 12 };

// ═══ MD3 海拔色调 (ambient/spot shadow color per M3 spec) ═══
FB.elevationColors = {
    // M3 规范：阴影使用 primary 色 tint 而非纯黑
    ambient:  "#03000000",  // 极淡环境光阴影
    spot:     "#1A000000",  // 聚光阴影
    // 莫奈色调阴影 (为莫奈配色定制)
    ambientMonet:  "#0A6750A4",
    spotMonet:     "#146750A4"
};

// ═══ MD3 动效系统 (M3 Motion Specs — 1:1 Google) ═══
FB.anim = {
    emphasized: null, emphasizedDecel: null, emphasizedAccel: null,
    standard: null, standardDecel: null, standardAccel: null,
    // 弹簧物理曲线 (Spring)
    spring: null, springHigh: null, springMedium: null, springLow: null,
    // 额外 M3 曲线
    anticipate: null, overshoot: null
};
(function initAnim() {
    try {
        var P = android.view.animation.PathInterpolator;
        // ── M3 Standard easing ──
        FB.anim.standard        = new P(0.2, 0, 0, 1);
        FB.anim.standardDecel   = new P(0, 0, 0, 1);
        FB.anim.standardAccel   = new P(0.3, 0, 1, 1);
        // ── M3 Emphasized easing (签名曲线) ──
        FB.anim.emphasized      = new P(0.2, 0, 0, 1);
        FB.anim.emphasizedDecel = new P(0.05, 0.7, 0.1, 1);
        FB.anim.emphasizedAccel = new P(0.3, 0, 0.8, 0.15);
        // ── 弹簧物理 (Spring-back / Overshoot) ──
        // 模拟 spring stiffness=380, damping=30 (MD3 default spring)
        FB.anim.spring          = new P(0.34, 1.56, 0.64, 1);     // 轻微过冲
        FB.anim.springHigh      = new P(0.34, 2.1, 0.64, 1);      // 强过冲 (按钮释放)
        FB.anim.springMedium    = new P(0.34, 1.3, 0.64, 1);      // 中等弹力
        FB.anim.springLow       = new P(0.34, 1.0, 0.64, 1);      // 低弹力 (细微)
        // ── Anticipate / Overshoot ──
        FB.anim.anticipate      = new P(0.5, -0.2, 0, 1.2);       // 预备+过冲
        FB.anim.overshoot       = new P(0.34, 1.56, 0.64, 1);     // 标准过冲
    } catch (e) {
        FB.anim.emphasized      = new android.view.animation.FastOutSlowInInterpolator();
        FB.anim.emphasizedDecel = new android.view.animation.DecelerateInterpolator();
        FB.anim.emphasizedAccel = new android.view.animation.AccelerateInterpolator();
        FB.anim.standard        = new android.view.animation.FastOutSlowInInterpolator();
        FB.anim.standardDecel   = new android.view.animation.DecelerateInterpolator();
        FB.anim.standardAccel   = new android.view.animation.AccelerateInterpolator();
        FB.anim.spring          = new android.view.animation.OvershootInterpolator(1.5);
        FB.anim.springHigh      = new android.view.animation.OvershootInterpolator(2.0);
        FB.anim.springMedium    = new android.view.animation.OvershootInterpolator(1.2);
        FB.anim.springLow       = new android.view.animation.OvershootInterpolator(0.8);
        FB.anim.anticipate      = new android.view.animation.AnticipateOvershootInterpolator(1.2);
        FB.anim.overshoot       = new android.view.animation.OvershootInterpolator(1.5);
    }
})();

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
    
    // 关闭流式导入的资源
    if (FB.state.currentTask !== null && FB.state.currentTask.type === "streamImport") {
        try {
            FB.state.currentTask.shouldStop = true;
            if (FB.state.currentTask.readerThread !== null) {
                FB.state.currentTask.readerThread.interrupt();
            }
            if (FB.state.currentTask.reader !== null) {
                FB.state.currentTask.reader.close();
            }
        } catch (e) {}
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
    
    // 关闭流式导入的资源
    if (FB.state.currentTask !== null && FB.state.currentTask.type === "streamImport") {
        try {
            FB.state.currentTask.shouldStop = true;
            if (FB.state.currentTask.readerThread !== null) {
                FB.state.currentTask.readerThread.interrupt();
            }
            if (FB.state.currentTask.reader !== null) {
                FB.state.currentTask.reader.close();
            }
        } catch (e) {}
    }
    
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
        // 关闭流式导入的资源
        if (FB.state.currentTask !== null && FB.state.currentTask.type === "streamImport") {
            try {
                FB.state.currentTask.shouldStop = true;
                if (FB.state.currentTask.readerThread !== null) {
                    FB.state.currentTask.readerThread.interrupt();
                }
                if (FB.state.currentTask.reader !== null) {
                    FB.state.currentTask.reader.close();
                }
            } catch (e) {}
        }
        
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
    } catch (e) { return null; }
}

function createShadowBg(color, radius, elevation) {
    try {
        var d = new android.graphics.drawable.GradientDrawable();
        d.setColor(android.graphics.Color.parseColor(color));
        d.setCornerRadius(dip(radius));
        return d;
    } catch (e) { return null; }
}

// ═══ MD3 海拔阴影应用 (Elevation + outlineAmbientShadowColor + outlineShadowColor) ═══
function applyElevation(view, level) {
    if (view === null || level === undefined) return;
    try {
        if (level > 0) {
            view.setElevation(dip(level));
            // M3: 阴影色调 — ambient 和 spot 使用 primary tint
            try {
                view.setOutlineAmbientShadowColor(android.graphics.Color.parseColor(FB.elevationColors.ambientMonet));
                view.setOutlineSpotShadowColor(android.graphics.Color.parseColor(FB.elevationColors.spotMonet));
            } catch (e) {}
        }
    } catch (e) {}
}

// ═══ MD3 状态层辅助 ═══
function createStateLayerDrawable(baseColor, stateColor, radius) {
    try {
        var base = new android.graphics.drawable.GradientDrawable();
        base.setColor(android.graphics.Color.parseColor(baseColor));
        base.setCornerRadius(dip(radius));
        
        var pressed = new android.graphics.drawable.GradientDrawable();
        pressed.setColor(android.graphics.Color.parseColor(stateColor));
        pressed.setCornerRadius(dip(radius));
        
        var states = [
            [android.R.attr.state_pressed],
            [android.R.attr.state_hovered],
            [android.R.attr.state_focused],
            []
        ];
        var drawables = [pressed, pressed, pressed, base];
        
        var sld = new android.graphics.drawable.StateListDrawable();
        for (var i = 0; i < states.length; i++) {
            sld.addState(states[i], drawables[i]);
        }
        return sld;
    } catch (e) {
        return createBg(baseColor, radius);
    }
}

// ═══ MD3 Ripple + State Layer ═══
function applyRipple(view, rippleColor, radius) {
    if (view === null) return;
    try {
        var csl = new android.content.res.ColorStateList(
            [[android.R.attr.state_pressed], []],
            [android.graphics.Color.parseColor(rippleColor), 0]
        );
        var mask = new android.graphics.drawable.GradientDrawable();
        mask.setCornerRadius(dip(radius));
        var ripple = new android.graphics.drawable.RippleDrawable(csl, view.getBackground(), mask);
        view.setBackground(ripple);
    } catch (e) {}
}

// ═══ MD3 状态层涟漪效果 ═══
function createStateLayerBg(baseColor, radius) {
    try {
        var d = new android.graphics.drawable.GradientDrawable();
        d.setColor(android.graphics.Color.parseColor(baseColor));
        d.setCornerRadius(dip(radius));
        return d;
    } catch (e) { return null; }
}

function applyRippleEffect(view, rippleColor, radius) {
    try {
        var colorStateList = new android.content.res.ColorStateList(
            [[android.R.attr.state_pressed], []],
            [android.graphics.Color.parseColor(rippleColor), 0]
        );
        var mask = new android.graphics.drawable.GradientDrawable();
        mask.setCornerRadius(dip(radius));
        var ripple = new android.graphics.drawable.RippleDrawable(colorStateList, view.getBackground(), mask);
        view.setBackground(ripple);
    } catch (e) {}
}

// ═══ MD3 弹性进入动效 (弹簧物理) ═══
function animateViewIn(view, delay) {
    try {
        view.setAlpha(0);
        view.setTranslationY(dip(16));
        view.animate()
            .alpha(1)
            .translationY(0)
            .setDuration(400)
            .setStartDelay(delay || 0)
            .setInterpolator(FB.anim.emphasizedDecel || new android.view.animation.DecelerateInterpolator())
            .start();
    } catch (e) {}
}

// ═══ MD3 弹性缩放动效（按下/释放）— 弹簧物理曲线 ═══
function animateButtonPress(view) {
    try {
        view.animate()
            .scaleX(0.92).scaleY(0.92)
            .setDuration(120)
            .setInterpolator(FB.anim.emphasizedAccel || new android.view.animation.AccelerateInterpolator())
            .start();
    } catch (e) {}
}

function animateButtonRelease(view) {
    try {
        view.animate()
            .scaleX(1).scaleY(1)
            .setDuration(380)
            .setInterpolator(FB.anim.spring || new android.view.animation.OvershootInterpolator(1.5))
            .start();
    } catch (e) {}
}

// ═══ MD3 列表项触摸反馈 (更细腻的缩放) ═══
function animateItemPress(view) {
    try {
        view.animate()
            .scaleX(0.97).scaleY(0.97)
            .setDuration(100)
            .setInterpolator(FB.anim.standardAccel || new android.view.animation.AccelerateInterpolator())
            .start();
    } catch (e) {}
}

function animateItemRelease(view) {
    try {
        view.animate()
            .scaleX(1).scaleY(1)
            .setDuration(350)
            .setInterpolator(FB.anim.springMedium || new android.view.animation.OvershootInterpolator(1.2))
            .start();
    } catch (e) {}
}

// ═══ MD3 页面进入动效 (Container Transform — M3 Motion Spec) ═══
function animatePageEnter(view, isBack) {
    try {
        view.setAlpha(0);
        if (isBack) {
            // 返回：从左侧滑入 + 轻微放大
            view.setTranslationX(dip(-12));
            view.setScaleX(0.98); view.setScaleY(0.98);
            view.animate()
                .alpha(1).translationX(0).scaleX(1).scaleY(1)
                .setDuration(300)
                .setInterpolator(FB.anim.standardDecel || new android.view.animation.DecelerateInterpolator())
                .start();
        } else {
            // 前进：从右侧滑入 + 放大 + 弹簧收尾
            view.setTranslationX(dip(18));
            view.setScaleX(0.94); view.setScaleY(0.94);
            view.animate()
                .alpha(1).translationX(0).scaleX(1).scaleY(1)
                .setDuration(350)
                .setInterpolator(FB.anim.emphasizedDecel || new android.view.animation.DecelerateInterpolator())
                .start();
        }
    } catch (e) {}
}

// ═══ MD3 页面退出动效 (M3 Motion Spec) ═══
function animatePageExit(view, isBack, onComplete) {
    try {
        view.setAlpha(1);
        if (isBack) {
            // 返回：向右滑出 + 缩小
            view.animate()
                .alpha(0).translationX(dip(18)).scaleX(0.94).scaleY(0.94)
                .setDuration(180)
                .setInterpolator(FB.anim.standardAccel || new android.view.animation.AccelerateInterpolator())
                .withEndAction(new java.lang.Runnable({ run: function() { if (onComplete) onComplete(); } }))
                .start();
        } else {
            // 前进：向左滑出 + 缩小
            view.animate()
                .alpha(0).translationX(dip(-12)).scaleX(0.98).scaleY(0.98)
                .setDuration(150)
                .setInterpolator(FB.anim.standardAccel || new android.view.animation.AccelerateInterpolator())
                .withEndAction(new java.lang.Runnable({ run: function() { if (onComplete) onComplete(); } }))
                .start();
        }
    } catch (e) { if (onComplete) onComplete(); }
}

// ═══ MD3 弹窗进入动效 (Scale + Fade — 弹簧收尾) ═══
function animateDialogEnter(view) {
    try {
        view.setAlpha(0);
        view.setScaleX(0.88); view.setScaleY(0.88);
        view.animate()
            .alpha(1).scaleX(1).scaleY(1)
            .setDuration(320)
            .setInterpolator(FB.anim.emphasizedDecel || new android.view.animation.DecelerateInterpolator())
            .start();
    } catch (e) {}
}

// ═══ MD3 弹窗退出动效 (Scale + Fade) ═══
function animateDialogExit(view, onComplete) {
    try {
        view.animate()
            .alpha(0).scaleX(0.88).scaleY(0.88)
            .setDuration(180)
            .setInterpolator(FB.anim.standardAccel || new android.view.animation.AccelerateInterpolator())
            .withEndAction(new java.lang.Runnable({ run: function() { if (onComplete) onComplete(); } }))
            .start();
    } catch (e) { if (onComplete) onComplete(); }
}

// ═══ MD3 FAB 动效 (弹簧弹入) ═══
function animateFabEnter(view, delay) {
    try {
        view.setAlpha(0);
        view.setScaleX(0); view.setScaleY(0);
        view.animate()
            .alpha(1).scaleX(1).scaleY(1)
            .setDuration(400)
            .setStartDelay(delay || 0)
            .setInterpolator(FB.anim.springHigh || new android.view.animation.OvershootInterpolator(2.0))
            .start();
    } catch (e) {}
}

// ═══ MD3 进度条动效 (平滑过渡) ═══
function animateProgressUpdate(progressBar, value) {
    try {
        var anim = android.animation.ObjectAnimator.ofInt(progressBar, "progress", progressBar.getProgress(), Math.floor(value));
        anim.setDuration(300);
        anim.setInterpolator(FB.anim.emphasizedDecel || new android.view.animation.DecelerateInterpolator());
        anim.start();
    } catch (e) {
        try { progressBar.setProgress(Math.floor(value)); } catch (ex) {}
    }
}

// ═══ MD3 逐项入场动效 (Staggered Enter) ═══
function animateStaggeredEnter(view, index) {
    try {
        view.setAlpha(0);
        view.setTranslationY(dip(20));
        view.animate()
            .alpha(1).translationY(0)
            .setDuration(360)
            .setStartDelay(index * 50)
            .setInterpolator(FB.anim.emphasizedDecel || new android.view.animation.DecelerateInterpolator())
            .start();
    } catch (e) {}
}

// ═══ MD3 Filled Button ═══
function createBtn(text, color, pressedColor, onClick) {
    var ctx = getContext();
    if (ctx === null) return null;
    try {
        var btn = new android.widget.Button(ctx);
        btn.setText(text);
        btn.setTextColor(android.graphics.Color.parseColor(FB.colors.onPrimary));
        btn.setTextSize(14);
        btn.setAllCaps(false);
        btn.setTransformationMethod(null);
        btn.setBackground(createStateLayerDrawable(color, pressedColor || color, FB.shape.full));
        btn.setPadding(dip(24), dip(14), dip(24), dip(14));
        btn.setTypeface(android.graphics.Typeface.create("sans-serif-medium", android.graphics.Typeface.NORMAL));
        btn.setStateListAnimator(null);
        
        var p = new android.widget.LinearLayout.LayoutParams(-1, dip(48));
        p.setMargins(0, dip(8), 0, 0);
        btn.setLayoutParams(p);
        
        applyRipple(btn, FB.colors.onPrimary, FB.shape.full);
        
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
            onClick: function() { try { onClick(); } catch (e) {} }
        }));
        return btn;
    } catch (e) { return null; }
}

// ═══ MD3 Outlined Button ═══
function createOutlineBtn(text, color, onClick) {
    var ctx = getContext();
    if (ctx === null) return null;
    try {
        var btn = new android.widget.Button(ctx);
        btn.setText(text);
        btn.setTextColor(android.graphics.Color.parseColor(color));
        btn.setTextSize(14);
        btn.setAllCaps(false);
        btn.setTransformationMethod(null);
        btn.setBackground(createStateLayerDrawable(FB.colors.surfaceContainerLowest, FB.colors.surfaceVariant, FB.shape.full));
        btn.setPadding(dip(24), dip(14), dip(24), dip(14));
        btn.setTypeface(android.graphics.Typeface.create("sans-serif-medium", android.graphics.Typeface.NORMAL));
        btn.setStateListAnimator(null);
        
        var p = new android.widget.LinearLayout.LayoutParams(-1, dip(48));
        p.setMargins(0, dip(8), 0, 0);
        btn.setLayoutParams(p);
        
        applyRipple(btn, color, FB.shape.full);
        
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
            onClick: function() { try { onClick(); } catch (e) {} }
        }));
        return btn;
    } catch (e) { return null; }
}

// ═══ MD3 Tonal Button ═══
function createTonalBtn(text, onClick) {
    var ctx = getContext();
    if (ctx === null) return null;
    try {
        var btn = new android.widget.Button(ctx);
        btn.setText(text);
        btn.setTextColor(android.graphics.Color.parseColor(FB.colors.tonalText));
        btn.setTextSize(14);
        btn.setAllCaps(false);
        btn.setTransformationMethod(null);
        btn.setBackground(createStateLayerDrawable(FB.colors.tonalBg, FB.colors.tonalPressed, FB.shape.full));
        btn.setPadding(dip(24), dip(14), dip(24), dip(14));
        btn.setTypeface(android.graphics.Typeface.create("sans-serif-medium", android.graphics.Typeface.NORMAL));
        btn.setStateListAnimator(null);
        
        var p = new android.widget.LinearLayout.LayoutParams(-1, dip(48));
        p.setMargins(0, dip(8), 0, 0);
        btn.setLayoutParams(p);
        
        applyRipple(btn, FB.colors.tonalText, FB.shape.full);
        
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
            onClick: function() { try { onClick(); } catch (e) {} }
        }));
        return btn;
    } catch (e) { return null; }
}

// ═══ MD3 Text Button ═══
function createTextBtn(text, color, onClick) {
    var ctx = getContext();
    if (ctx === null) return null;
    try {
        var btn = new android.widget.Button(ctx);
        btn.setText(text);
        btn.setTextColor(android.graphics.Color.parseColor(color || FB.colors.primary));
        btn.setTextSize(14);
        btn.setAllCaps(false);
        btn.setTransformationMethod(null);
        btn.setBackground(createStateLayerDrawable(android.graphics.Color.TRANSPARENT, FB.colors.stateLayerPrimary, FB.shape.full));
        btn.setPadding(dip(12), dip(10), dip(12), dip(10));
        btn.setTypeface(android.graphics.Typeface.create("sans-serif-medium", android.graphics.Typeface.NORMAL));
        btn.setStateListAnimator(null);
        btn.setMinimumWidth(0);
        btn.setMinimumHeight(0);
        
        var p = new android.widget.LinearLayout.LayoutParams(-2, -2);
        p.setMargins(0, dip(8), 0, 0);
        btn.setLayoutParams(p);
        
        applyRipple(btn, color || FB.colors.primary, FB.shape.full);
        
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
            onClick: function() { try { onClick(); } catch (e) {} }
        }));
        return btn;
    } catch (e) { return null; }
}

// ═══ MD3 Outlined TextField (M3 Spec — 动画指示线) ═══
function createInput(hint, val) {
    var ctx = getContext();
    if (ctx === null) return null;
    try {
        var input = new android.widget.EditText(ctx);
        input.setHint(hint);
        if (val !== undefined && val !== null) input.setText(String(val));
        input.setTextSize(14);
        input.setTextColor(android.graphics.Color.parseColor(FB.colors.onSurface));
        input.setHintTextColor(android.graphics.Color.parseColor(FB.colors.onSurfaceVariant));
        input.setBackground(createStateLayerDrawable(FB.colors.surfaceContainerHighest, FB.colors.surfaceContainerHighest, FB.shape.xs));
        input.setPadding(dip(16), dip(16), dip(16), dip(16));
        input.setSingleLine(true);
        input.setTypeface(android.graphics.Typeface.create("sans-serif", android.graphics.Typeface.NORMAL));
        
        var p = new android.widget.LinearLayout.LayoutParams(-1, -2);
        p.setMargins(0, dip(6), 0, 0);
        input.setLayoutParams(p);
        
        input.setOnFocusChangeListener(new android.view.View.OnFocusChangeListener({
            onFocusChange: function(v, hasFocus) {
                try {
                    if (hasFocus) {
                        // 聚焦：primary 色 2dp 描边 + 轻微缩放
                        v.setBackground(createBg(FB.colors.surfaceContainerHighest, FB.shape.xs, FB.colors.primary, 2));
                        v.animate()
                            .scaleX(1.01).scaleY(1.01)
                            .setDuration(200)
                            .setInterpolator(FB.anim.emphasized || new android.view.animation.FastOutSlowInInterpolator())
                            .start();
                    } else {
                        // 失焦：outlineVariant 1dp 描边 + 回缩
                        v.setBackground(createBg(FB.colors.surfaceContainerHighest, FB.shape.xs, FB.colors.outlineVariant, 1));
                        v.animate()
                            .scaleX(1).scaleY(1)
                            .setDuration(200)
                            .setInterpolator(FB.anim.standard || new android.view.animation.FastOutSlowInInterpolator())
                            .start();
                    }
                } catch (e) {}
            }
        }));
        return input;
    } catch (e) { return null; }
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

// ═══ MD3 Label / Typography ═══
function createLabel(text, size, color, bold) {
    var ctx = getContext();
    if (ctx === null) return null;
    try {
        var tv = new android.widget.TextView(ctx);
        tv.setText(text);
        tv.setTextSize(size || 14);
        tv.setTextColor(android.graphics.Color.parseColor(color || FB.colors.onSurface));
        if (bold) {
            tv.setTypeface(android.graphics.Typeface.create("sans-serif-medium", android.graphics.Typeface.NORMAL));
        } else {
            tv.setTypeface(android.graphics.Typeface.create("sans-serif", android.graphics.Typeface.NORMAL));
        }
        return tv;
    } catch (e) { return null; }
}

// ═══ MD3 Divider (M3 Spec — 全宽, outlineVariant) ═══
function createDivider() {
    var ctx = getContext();
    if (ctx === null) return null;
    try {
        var v = new android.view.View(ctx);
        var p = new android.widget.LinearLayout.LayoutParams(-1, dip(1));
        p.setMargins(0, dip(16), 0, dip(16));
        v.setLayoutParams(p);
        v.setBackgroundColor(android.graphics.Color.parseColor(FB.colors.outlineVariant));
        // 淡入动效
        v.setAlpha(0);
        v.animate().alpha(1).setDuration(300).setStartDelay(100)
            .setInterpolator(FB.anim.standard || new android.view.animation.FastOutSlowInInterpolator()).start();
        return v;
    } catch (e) { return null; }
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

// ═══ MD3 Scrim (32% black) ═══
function createSafePopup(content, width) {
    var ctx = getContext();
    if (ctx === null) return null;
    
    try {
        var outer = new android.widget.FrameLayout(ctx);
        outer.setLayoutParams(new android.widget.FrameLayout.LayoutParams(-1, -1));
        outer.setBackgroundColor(android.graphics.Color.parseColor(FB.colors.scrim));
        
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

// ═══ MD3 返回按钮 (带 Ripple) ═══
function createBackBtn(onClick) {
    var ctx = getContext();
    if (ctx === null) return null;
    try {
        var btn = new android.widget.TextView(ctx);
        btn.setText("←");
        btn.setTextSize(24);
        btn.setTextColor(android.graphics.Color.parseColor(FB.colors.onSurfaceVariant));
        btn.setPadding(dip(8), dip(4), dip(8), dip(4));
        btn.setGravity(android.view.Gravity.CENTER);
        btn.setBackground(createStateLayerDrawable(android.graphics.Color.TRANSPARENT, FB.colors.surfaceVariant, FB.shape.full));
        
        btn.setOnTouchListener(new android.view.View.OnTouchListener({
            onTouch: function(v, event) {
                try {
                    if (event.getAction() === android.view.MotionEvent.ACTION_DOWN) {
                        animateButtonPress(v);
                    } else if (event.getAction() === android.view.MotionEvent.ACTION_UP ||
                               event.getAction() === android.view.MotionEvent.ACTION_CANCEL) {
                        animateButtonRelease(v);
                    }
                } catch (e) {}
                return false;
            }
        }));
        
        btn.setOnClickListener(new android.view.View.OnClickListener({
            onClick: function() { try { onClick(); } catch (e) {} }
        }));
        return btn;
    } catch (e) { return null; }
}

// ═══ MD3 CheckBox 着色 ═══
function applyCheckBoxTint(cb) {
    if (cb === null) return;
    try {
        var csl = new android.content.res.ColorStateList(
            [
                [android.R.attr.state_checked],
                [-android.R.attr.state_checked]
            ],
            [
                android.graphics.Color.parseColor(FB.colors.primary),
                android.graphics.Color.parseColor(FB.colors.onSurfaceVariant)
            ]
        );
        cb.setButtonTintList(csl);
    } catch (e) {}
}

// ═══ MD3 RadioButton 着色 ═══
function applyRadioTint(rb) {
    if (rb === null) return;
    try {
        var csl = new android.content.res.ColorStateList(
            [
                [android.R.attr.state_checked],
                [-android.R.attr.state_checked]
            ],
            [
                android.graphics.Color.parseColor(FB.colors.primary),
                android.graphics.Color.parseColor(FB.colors.onSurfaceVariant)
            ]
        );
        rb.setButtonTintList(csl);
    } catch (e) {}
}

// ═══ MD3 ProgressBar 着色 ═══
function applyProgressTint(pb) {
    if (pb === null) return;
    try {
        pb.setProgressTintList(android.content.res.ColorStateList.valueOf(
            android.graphics.Color.parseColor(FB.colors.primary)
        ));
        pb.setBackgroundTintList(android.content.res.ColorStateList.valueOf(
            android.graphics.Color.parseColor(FB.colors.surfaceVariant)
        ));
    } catch (e) {}
}

function createCloseBtn(onClick) {
    var ctx = getContext();
    if (ctx === null) return null;
    
    try {
        var btn = new android.widget.TextView(ctx);
        btn.setText("✕");
        btn.setTextSize(22);
        btn.setTextColor(android.graphics.Color.parseColor(FB.colors.onSurfaceVariant));
        btn.setPadding(dip(12), dip(4), dip(4), dip(4));
        btn.setGravity(android.view.Gravity.CENTER);
        btn.setBackground(createStateLayerDrawable(android.graphics.Color.TRANSPARENT, FB.colors.surfaceVariant, FB.shape.full));
        
        btn.setOnTouchListener(new android.view.View.OnTouchListener({
            onTouch: function(v, event) {
                try {
                    if (event.getAction() === android.view.MotionEvent.ACTION_DOWN) {
                        animateButtonPress(v);
                    } else if (event.getAction() === android.view.MotionEvent.ACTION_UP ||
                               event.getAction() === android.view.MotionEvent.ACTION_CANCEL) {
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

// ============================================
// 创建设置项开关
// ============================================

// ═══ MD3 Switch (M3 Spec — 无文字, 大拇指缩放, 52x32dp) ═══
function createSettingSwitch(title, desc, checked, onChange) {
    var ctx = getContext();
    if (ctx === null) return null;
    try {
        var layout = new android.widget.LinearLayout(ctx);
        layout.setOrientation(0);
        layout.setGravity(android.view.Gravity.CENTER_VERTICAL);
        layout.setBackground(createStateLayerDrawable(FB.colors.surfaceContainerLow, FB.colors.surfaceContainerHigh, FB.shape.md));
        layout.setPadding(dip(16), dip(16), dip(16), dip(16));
        layout.setLayoutParams(mpFill(0, 8, 0, 0));
        
        layout.setOnTouchListener(new android.view.View.OnTouchListener({
            onTouch: function(v, event) {
                try {
                    var action = event.getAction();
                    if (action === android.view.MotionEvent.ACTION_DOWN) {
                        animateItemPress(v);
                    } else if (action === android.view.MotionEvent.ACTION_UP ||
                               action === android.view.MotionEvent.ACTION_CANCEL) {
                        animateItemRelease(v);
                    }
                } catch (e) {}
                return false;
            }
        }));
        
        var info = new android.widget.LinearLayout(ctx);
        info.setOrientation(1);
        info.setLayoutParams(new android.widget.LinearLayout.LayoutParams(0, -2, 1));
        
        var titleLabel = createLabel(title, 15, FB.colors.onSurface, true);
        if (titleLabel !== null) info.addView(titleLabel);
        
        var descLabel = createLabel(desc, 12, FB.colors.onSurfaceVariant, false);
        if (descLabel !== null) { descLabel.setLayoutParams(mp(0, 2, 0, 0)); info.addView(descLabel); }
        layout.addView(info);
        
        // ── M3 Switch: 自定义开关 (52x32dp, 大拇指 16→24dp 缩放) ──
        var switchContainer = new android.widget.FrameLayout(ctx);
        var scParams = new android.widget.LinearLayout.LayoutParams(dip(52), dip(32));
        scParams.setMargins(dip(12), 0, 0, 0);
        switchContainer.setLayoutParams(scParams);
        
        // 轨道 (track)
        var track = new android.view.View(ctx);
        var trackParams = new android.widget.FrameLayout.LayoutParams(dip(52), dip(32));
        trackParams.gravity = android.view.Gravity.CENTER;
        track.setLayoutParams(trackParams);
        var trackBg = new android.graphics.drawable.GradientDrawable();
        trackBg.setCornerRadius(dip(16));
        if (checked) {
            trackBg.setColor(android.graphics.Color.parseColor(FB.colors.primaryContainer));
        } else {
            trackBg.setColor(android.graphics.Color.parseColor(FB.colors.surfaceVariant));
        }
        track.setBackground(trackBg);
        switchContainer.addView(track);
        
        // 大拇指 (thumb) — M3: checked=24dp, unchecked=16dp
        var thumbSize = checked ? dip(24) : dip(16);
        var thumb = new android.view.View(ctx);
        var thumbParams = new android.widget.FrameLayout.LayoutParams(thumbSize, thumbSize);
        thumbParams.gravity = android.view.Gravity.CENTER_VERTICAL;
        thumbParams.leftMargin = checked ? dip(24) : dip(8);
        thumb.setLayoutParams(thumbParams);
        var thumbBg = new android.graphics.drawable.GradientDrawable();
        thumbBg.setCornerRadius(thumbSize / 2);
        if (checked) {
            thumbBg.setColor(android.graphics.Color.parseColor(FB.colors.onPrimaryContainer));
        } else {
            thumbBg.setColor(android.graphics.Color.parseColor(FB.colors.outline));
        }
        // M3 大拇指海拔 level2
        thumb.setBackground(thumbBg);
        try { thumb.setElevation(dip(2)); } catch (e) {}
        switchContainer.addView(thumb);
        
        // 点击切换
        var isOn = checked;
        switchContainer.setOnClickListener(new android.view.View.OnClickListener({
            onClick: function() {
                isOn = !isOn;
                // 动画切换
                try {
                    // 轨道颜色
                    var newTrackColor = isOn ? FB.colors.primaryContainer : FB.colors.surfaceVariant;
                    var newTrackBg = new android.graphics.drawable.GradientDrawable();
                    newTrackBg.setCornerRadius(dip(16));
                    newTrackBg.setColor(android.graphics.Color.parseColor(newTrackColor));
                    track.setBackground(newTrackBg);
                    
                    // 大拇指动画 (位置 + 大小 + 颜色)
                    var newThumbSize = isOn ? dip(24) : dip(16);
                    var newLeftMargin = isOn ? dip(24) : dip(8);
                    
                    // 大拇指缩放
                    var scaleAnim = android.animation.ObjectAnimator.ofFloat(thumb, "scaleX", 1.2, 1.0);
                    var scaleYAnim = android.animation.ObjectAnimator.ofFloat(thumb, "scaleY", 1.2, 1.0);
                    scaleAnim.setDuration(200);
                    scaleYAnim.setDuration(200);
                    scaleAnim.setInterpolator(FB.anim.emphasized || new android.view.animation.FastOutSlowInInterpolator());
                    scaleYAnim.setInterpolator(FB.anim.emphasized || new android.view.animation.FastOutSlowInInterpolator());
                    
                    // 位置滑动
                    var slideAnim = android.animation.ObjectAnimator.ofFloat(thumb, "translationX", 
                        isOn ? dip(-8) : dip(8), 0);
                    slideAnim.setDuration(250);
                    slideAnim.setInterpolator(FB.anim.emphasized || new android.view.animation.FastOutSlowInInterpolator());
                    
                    // 更新大拇指参数
                    var lp = thumb.getLayoutParams();
                    lp.width = newThumbSize;
                    lp.height = newThumbSize;
                    lp.leftMargin = newLeftMargin;
                    thumb.setLayoutParams(lp);
                    
                    // 更新大拇指圆角
                    var newThumbBg = new android.graphics.drawable.GradientDrawable();
                    newThumbBg.setCornerRadius(newThumbSize / 2);
                    newThumbBg.setColor(android.graphics.Color.parseColor(isOn ? FB.colors.onPrimaryContainer : FB.colors.outline));
                    thumb.setBackground(newThumbBg);
                    
                    scaleAnim.start();
                    scaleYAnim.start();
                    slideAnim.start();
                } catch (e) {}
                
                onChange(isOn);
            }
        }));
        
        layout.addView(switchContainer);
        return layout;
    } catch (e) { return null; }
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
            main.setBackground(createShadowBg(FB.colors.surfaceContainerLowest, FB.shape.lg));
            applyElevation(main, FB.elevation.level3);
            
            var header = new android.widget.LinearLayout(ctx);
            header.setOrientation(0);
            header.setGravity(android.view.Gravity.CENTER_VERTICAL);
            
            var logo = new android.widget.LinearLayout(ctx);
            logo.setOrientation(0);
            logo.setGravity(android.view.Gravity.CENTER_VERTICAL);
            logo.setLayoutParams(new android.widget.LinearLayout.LayoutParams(0, -2, 1));
            
            var icon = createLabel("🏗️", 26, FB.colors.onSurfaceVariant, false);
            if (icon !== null) { icon.setPadding(0, 0, dip(8), 0); logo.addView(icon); }
            
            var titleLayout = new android.widget.LinearLayout(ctx);
            titleLayout.setOrientation(1);
            
            var title = createLabel("FastBuild", 22, FB.colors.onSurface, true);
            if (title !== null) titleLayout.addView(title);
            
            var ver = createLabel("v" + FB.config.version, 10, FB.colors.onSurfaceVariant, false);
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
            statusLayout.setBackground(createBg(FB.config.useMultiThread ? FB.colors.successContainer : FB.colors.warningContainer, FB.shape.xs));
            statusLayout.setPadding(dip(12), dip(8), dip(12), dip(8));
            statusLayout.setLayoutParams(mpFill(0, 12, 0, 0));
            
            var statusIcon = createLabel(FB.config.useMultiThread ? "⚡" : "🔄", 14, null, false);
            if (statusIcon !== null) statusLayout.addView(statusIcon);
            
            var modeText = FB.config.useMultiThread ? " 多线程" : " 标准";
            if (FB.config.streamExport) modeText += " + 流式读写";
            
            var statusText = createLabel(modeText, 12, FB.config.useMultiThread ? FB.colors.success : FB.colors.warning, false);
            if (statusText !== null) statusLayout.addView(statusText);
            
            main.addView(statusLayout);
            
            var div1 = createDivider(); if (div1 !== null) main.addView(div1);
            
            var secLabel = createLabel("选择操作", 12, FB.colors.textSecondary, false);
            if (secLabel !== null) main.addView(secLabel);
            
            var btn1 = createBtn("📦  区块导出", FB.colors.primary, FB.colors.primaryDark, function() {
                try { if (FB.ui.mainWindow !== null) { FB.ui.mainWindow.dismiss(); FB.ui.mainWindow = null; } showChunkExportUI(); } catch (e) {}
            });
            if (btn1 !== null) { main.addView(btn1); animateStaggeredEnter(btn1, 0); }
            
            var btn2 = createBtn("📐  坐标导出", FB.colors.primary, FB.colors.primaryDark, function() {
                try { if (FB.ui.mainWindow !== null) { FB.ui.mainWindow.dismiss(); FB.ui.mainWindow = null; } showCoordExportUI(); } catch (e) {}
            });
            if (btn2 !== null) { main.addView(btn2); animateStaggeredEnter(btn2, 1); }
            
            var btn3 = createBtn("📥  导入建筑", FB.colors.tertiary, FB.colors.tertiaryContainer, function() {
                try { if (FB.ui.mainWindow !== null) { FB.ui.mainWindow.dismiss(); FB.ui.mainWindow = null; } showImportUI(); } catch (e) {}
            });
            if (btn3 !== null) { main.addView(btn3); animateStaggeredEnter(btn3, 2); }
            
            var btn4 = createOutlineBtn("📁  文件管理", FB.colors.primary, function() {
                try { if (FB.ui.mainWindow !== null) { FB.ui.mainWindow.dismiss(); FB.ui.mainWindow = null; } showFileManagerUI(); } catch (e) {}
            });
            if (btn4 !== null) { main.addView(btn4); animateStaggeredEnter(btn4, 3); }
            
            var btn5 = createOutlineBtn("⚙️  设置", FB.colors.textSecondary, function() {
                try { if (FB.ui.mainWindow !== null) { FB.ui.mainWindow.dismiss(); FB.ui.mainWindow = null; } showSettingsUI(); } catch (e) {}
            });
            if (btn5 !== null) { main.addView(btn5); animateStaggeredEnter(btn5, 4); }
            
            var div2 = createDivider(); if (div2 !== null) main.addView(div2);
            
            var info = new android.widget.LinearLayout(ctx);
            info.setOrientation(1);
            info.setBackground(createBg(FB.colors.primaryContainer, FB.shape.md));
            info.setPadding(dip(14), dip(12), dip(14), dip(12));
            
            var posRow = new android.widget.LinearLayout(ctx);
            posRow.setOrientation(0);
            posRow.setGravity(android.view.Gravity.CENTER_VERTICAL);
            
            var posIcon = createLabel("📍 ", 14, FB.colors.onPrimaryContainer, false);
            if (posIcon !== null) posRow.addView(posIcon);
            
            var posText = createLabel(
                Math.floor(getPlayerX()) + ", " + Math.floor(getPlayerY()) + ", " + Math.floor(getPlayerZ()),
                14, FB.colors.onPrimaryContainer, true
            );
            if (posText !== null) posRow.addView(posText);
            info.addView(posRow);
            
            var savedPos = createLabel(
                "P1: (" + FB.data.pos1.x + "," + FB.data.pos1.y + "," + FB.data.pos1.z + ")  " +
                "P2: (" + FB.data.pos2.x + "," + FB.data.pos2.y + "," + FB.data.pos2.z + ")",
                11, FB.colors.onPrimaryContainer, false
            );
            if (savedPos !== null) { savedPos.setLayoutParams(mp(0, 4, 0, 0)); info.addView(savedPos); }
            
            main.addView(info);
            animateViewIn(info, 300);
            
            var popup = createSafePopup(main, dip(300));
            if (popup === null) return;
            
            popup.showAtLocation(ctx.getWindow().getDecorView(), android.view.Gravity.CENTER, 0, 0);
            FB.ui.mainWindow = popup;
            
            // M3 Dialog Enter: Scale 0.88→1 + Fade, emphasizedDecel
            main.setAlpha(0); main.setScaleX(0.88); main.setScaleY(0.88);
            main.animate().alpha(1).scaleX(1).scaleY(1).setDuration(320).setInterpolator(FB.anim.emphasizedDecel || new android.view.animation.DecelerateInterpolator()).start();
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
            main.setBackground(createShadowBg(FB.colors.surfaceContainerLowest, FB.shape.lg));
            applyElevation(main, FB.elevation.level3);
            
            var header = new android.widget.LinearLayout(ctx);
            header.setOrientation(0);
            header.setGravity(android.view.Gravity.CENTER_VERTICAL);
            
            var back = createBackBtn(function() { try { if (FB.ui.mainWindow !== null) { FB.ui.mainWindow.dismiss(); FB.ui.mainWindow = null; } showMainUI(); } catch (e) {} });
            if (back !== null) { back.setPadding(0, 0, dip(8), 0); header.addView(back); }
            
            var title = createLabel("设置", 20, FB.colors.onSurface, true);
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
            
            var streamSwitch = createSettingSwitch("💾 流式读写", "边读边写，适合超大建筑(百万方块)", FB.config.streamExport, function(checked) {
                FB.config.streamExport = checked;
                toast(checked ? "流式读写已启用" : "流式读写已禁用");
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
            
            var streamBatchLabel = createLabel("流式导入批量 (方块/tick)", 13, FB.colors.textSecondary, false);
            if (streamBatchLabel !== null) { streamBatchLabel.setLayoutParams(mp(0, 12, 0, 0)); main.addView(streamBatchLabel); }
            
            var streamBatchInput = createNumInput("1000-20000", FB.config.streamImportBatchSize);
            if (streamBatchInput !== null) main.addView(streamBatchInput);
            
            var div3 = createDivider(); if (div3 !== null) main.addView(div3);
            
            var saveBtn = createBtn("💾  保存设置", FB.colors.primary, FB.colors.primaryDark, function() {
                try {
                    var exp = parseInt(expInput.getText()) || 8000;
                    var imp = parseInt(impInput.getText()) || 3000;
                    var streamBatch = parseInt(streamBatchInput.getText()) || 5000;
                    FB.config.exportBlocksPerTick = Math.max(1000, Math.min(50000, exp));
                    FB.config.importBlocksPerTick = Math.max(500, Math.min(10000, imp));
                    FB.config.streamImportBatchSize = Math.max(1000, Math.min(20000, streamBatch));
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
            
            // M3 Container Transform: 前进转场
            main.setAlpha(0); main.setTranslationX(dip(18)); main.setScaleX(0.94); main.setScaleY(0.94);
            main.animate().alpha(1).translationX(0).scaleX(1).scaleY(1).setDuration(350).setInterpolator(FB.anim.emphasizedDecel || new android.view.animation.DecelerateInterpolator()).start();
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
            main.setBackground(createShadowBg(FB.colors.surfaceContainerLowest, FB.shape.lg));
            applyElevation(main, FB.elevation.level3);
            
            var header = new android.widget.LinearLayout(ctx);
            header.setOrientation(0);
            header.setGravity(android.view.Gravity.CENTER_VERTICAL);
            
            var back = createBackBtn(function() { try { if (FB.ui.mainWindow !== null) { FB.ui.mainWindow.dismiss(); FB.ui.mainWindow = null; } showMainUI(); } catch (e) {} });
            if (back !== null) { back.setPadding(0, 0, dip(8), 0); header.addView(back); }
            
            var title = createLabel("区块导出", 20, FB.colors.onSurface, true);
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
            applyCheckBoxTint(airCheck);
            main.addView(airCheck);
            
            var div2 = createDivider(); if (div2 !== null) main.addView(div2);
            
            var exportBtn = createBtn("🚀  开始导出", FB.colors.primary, FB.colors.primaryDark, function() {
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
            
            // M3 Container Transform: 前进转场
            main.setAlpha(0); main.setTranslationX(dip(18)); main.setScaleX(0.94); main.setScaleY(0.94);
            main.animate().alpha(1).translationX(0).scaleX(1).scaleY(1).setDuration(350).setInterpolator(FB.anim.emphasizedDecel || new android.view.animation.DecelerateInterpolator()).start();
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
            main.setBackground(createShadowBg(FB.colors.surfaceContainerLowest, FB.shape.lg));
            applyElevation(main, FB.elevation.level3);
            
            var header = new android.widget.LinearLayout(ctx);
            header.setOrientation(0);
            header.setGravity(android.view.Gravity.CENTER_VERTICAL);
            
            var back = createBackBtn(function() { try { if (FB.ui.mainWindow !== null) { FB.ui.mainWindow.dismiss(); FB.ui.mainWindow = null; } showMainUI(); } catch (e) {} });
            if (back !== null) { back.setPadding(0, 0, dip(8), 0); header.addView(back); }
            
            var title = createLabel("坐标导出", 20, FB.colors.onSurface, true);
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
            applyCheckBoxTint(airCheck);
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
            
            // M3 Container Transform: 前进转场
            main.setAlpha(0); main.setTranslationX(dip(18)); main.setScaleX(0.94); main.setScaleY(0.94);
            main.animate().alpha(1).translationX(0).scaleX(1).scaleY(1).setDuration(350).setInterpolator(FB.anim.emphasizedDecel || new android.view.animation.DecelerateInterpolator()).start();
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
            main.setBackground(createShadowBg(FB.colors.surfaceContainerLowest, FB.shape.lg));
            applyElevation(main, FB.elevation.level3);
            
            var header = new android.widget.LinearLayout(ctx);
            header.setOrientation(0);
            header.setGravity(android.view.Gravity.CENTER_VERTICAL);
            
            var back = createBackBtn(function() { try { if (FB.ui.mainWindow !== null) { FB.ui.mainWindow.dismiss(); FB.ui.mainWindow = null; } showMainUI(); } catch (e) {} });
            if (back !== null) { back.setPadding(0, 0, dip(8), 0); header.addView(back); }
            
            var title = createLabel("导入建筑", 20, FB.colors.onSurface, true);
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
            r1.setId(1); r1.setChecked(true); applyRadioTint(r1); rg.addView(r1);
            
            var r2 = new android.widget.RadioButton(ctx);
            r2.setText(" 以玩家为中心"); r2.setTextSize(14);
            r2.setTextColor(android.graphics.Color.parseColor(FB.colors.textPrimary));
            r2.setId(2); applyRadioTint(r2); rg.addView(r2);
            
            var r3 = new android.widget.RadioButton(ctx);
            r3.setText(" 指定坐标"); r3.setTextSize(14);
            r3.setTextColor(android.graphics.Color.parseColor(FB.colors.textPrimary));
            r3.setId(3); applyRadioTint(r3); rg.addView(r3);
            
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
            
            var importBtn = createBtn("📥  开始导入", FB.colors.primary, FB.colors.primaryDark, function() {
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
            // M3 Container Transform: 前进转场
            main.setAlpha(0); main.setTranslationX(dip(18)); main.setScaleX(0.94); main.setScaleY(0.94);
            main.animate().alpha(1).translationX(0).scaleX(1).scaleY(1).setDuration(350).setInterpolator(FB.anim.emphasizedDecel || new android.view.animation.DecelerateInterpolator()).start();
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
            main.setBackground(createShadowBg(FB.colors.surfaceContainerLowest, FB.shape.lg));
            applyElevation(main, FB.elevation.level3);
            
            var header = new android.widget.LinearLayout(ctx);
            header.setOrientation(0);
            header.setGravity(android.view.Gravity.CENTER_VERTICAL);
            
            var back = createBackBtn(function() { try { if (FB.ui.mainWindow !== null) { FB.ui.mainWindow.dismiss(); FB.ui.mainWindow = null; } showImportUI(); } catch (e) {} });
            if (back !== null) { back.setPadding(0, 0, dip(8), 0); header.addView(back); }
            
            var title = createLabel("选择文件", 20, FB.colors.onSurface, true);
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
                                item.setBackground(createBg(FB.colors.surfaceContainerLow, FB.shape.md, FB.colors.outlineVariant, 1));
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
                                
                                applyRipple(item, FB.colors.primary, FB.shape.md);
                                
                                item.setOnTouchListener(new android.view.View.OnTouchListener({
                                    onTouch: function(v, event) {
                                        try {
                                            if (event.getAction() === android.view.MotionEvent.ACTION_DOWN) {
                                                animateItemPress(v);
                                            } else if (event.getAction() === android.view.MotionEvent.ACTION_UP ||
                                                       event.getAction() === android.view.MotionEvent.ACTION_CANCEL) {
                                                animateItemRelease(v);
                                            }
                                        } catch (e) {}
                                        return false;
                                    }
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
            // M3 Container Transform: 前进转场
            main.setAlpha(0); main.setTranslationX(dip(18)); main.setScaleX(0.94); main.setScaleY(0.94);
            main.animate().alpha(1).translationX(0).scaleX(1).scaleY(1).setDuration(350).setInterpolator(FB.anim.emphasizedDecel || new android.view.animation.DecelerateInterpolator()).start();
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
            main.setBackground(createShadowBg(FB.colors.surfaceContainerLowest, FB.shape.lg));
            applyElevation(main, FB.elevation.level3);
            
            var header = new android.widget.LinearLayout(ctx);
            header.setOrientation(0);
            header.setGravity(android.view.Gravity.CENTER_VERTICAL);
            
            var back = createBackBtn(function() { try { if (FB.ui.mainWindow !== null) { FB.ui.mainWindow.dismiss(); FB.ui.mainWindow = null; } showMainUI(); } catch (e) {} });
            if (back !== null) { back.setPadding(0, 0, dip(8), 0); header.addView(back); }
            
            var title = createLabel("文件管理", 20, FB.colors.onSurface, true);
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
            stats.setBackground(createBg(FB.colors.successContainer, FB.shape.sm));
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
                                item.setBackground(createBg(FB.colors.surfaceContainerLow, FB.shape.md, FB.colors.outlineVariant, 1));
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
                                    del.setBackground(createStateLayerDrawable(android.graphics.Color.TRANSPARENT, FB.colors.stateLayerError, FB.shape.full));
                                    applyRipple(del, FB.colors.error, FB.shape.full);
                                    del.setOnTouchListener(new android.view.View.OnTouchListener({
                                        onTouch: function(v, event) {
                                            try {
                                                if (event.getAction() === android.view.MotionEvent.ACTION_DOWN) {
                                                    animateButtonPress(v);
                                                } else if (event.getAction() === android.view.MotionEvent.ACTION_UP ||
                                                           event.getAction() === android.view.MotionEvent.ACTION_CANCEL) {
                                                    animateButtonRelease(v);
                                                }
                                            } catch (e) {}
                                            return false;
                                        }
                                    }));
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
            // M3 Container Transform: 前进转场
            main.setAlpha(0); main.setTranslationX(dip(18)); main.setScaleX(0.94); main.setScaleY(0.94);
            main.animate().alpha(1).translationX(0).scaleX(1).scaleY(1).setDuration(350).setInterpolator(FB.anim.emphasizedDecel || new android.view.animation.DecelerateInterpolator()).start();
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
            main.setBackground(createShadowBg(FB.colors.surfaceContainerHigh, FB.shape.lg));
            applyElevation(main, FB.elevation.level3);
            main.setGravity(android.view.Gravity.CENTER);
            
            var iconText = createLabel("⏳", 36, null, false);
            if (iconText !== null) { iconText.setGravity(android.view.Gravity.CENTER); main.addView(iconText); }
            
            var t = createLabel(title, 20, FB.colors.onSurface, true);
            if (t !== null) { t.setGravity(android.view.Gravity.CENTER); t.setLayoutParams(mp(0, 12, 0, 0)); main.addView(t); }
            
            var st = createLabel(subtitle || "请稍候...", 12, FB.colors.textSecondary, false);
            if (st !== null) { st.setGravity(android.view.Gravity.CENTER); st.setLayoutParams(mp(0, 4, 0, 16)); main.addView(st); }
            
            var pb = new android.widget.ProgressBar(ctx, null, android.R.attr.progressBarStyleHorizontal);
            pb.setMax(100); pb.setProgress(0);
            applyProgressTint(pb);
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
            
            // M3 Dialog Enter: Scale + Fade
            main.setAlpha(0); main.setScaleX(0.88); main.setScaleY(0.88);
            main.animate().alpha(1).scaleX(1).scaleY(1).setDuration(320).setInterpolator(FB.anim.emphasizedDecel || new android.view.animation.DecelerateInterpolator()).start();
        } catch (e) { print("showProgressUI Error: " + e); }
    });
}

function updateProgress(pct, detail) {
    runOnUiThread(function() {
        try {
            if (FB.ui.progressBar !== null) {
                animateProgressUpdate(FB.ui.progressBar, pct);
            }
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
// 导入 - 统一入口，根据配置选择普通或流式
// ============================================

function startImport(filePath, mode, targetX, targetY, targetZ) {
    if (FB.state.isProcessing) { toast("有任务进行中"); return; }
    
    // 流式导入模式
    if (FB.config.streamExport) {
        startStreamImport(filePath, mode, targetX, targetY, targetZ);
        return;
    }
    
    // 普通导入模式（原有逻辑）
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
// 流式导入 - 优化版：后台线程预解析，modTick放置
// ============================================

function startStreamImport(filePath, mode, targetX, targetY, targetZ) {
    FB.state.isProcessing = true;
    
    showProgressUI("流式导入", "解析文件头...");
    
    new java.lang.Thread(new java.lang.Runnable({
        run: function() {
            var reader = null;
            try {
                var file = new java.io.File(filePath);
                if (!file.exists()) { 
                    clientMessage("§c[FB] 文件不存在");
                    FB.state.isProcessing = false;
                    closeProgressUI();
                    return; 
                }
                
                var fileSize = file.length();
                
                reader = new java.io.BufferedReader(
                    new java.io.InputStreamReader(
                        new java.io.FileInputStream(file), "UTF-8"
                    ),
                    FB.config.streamReadBufferSize
                );
                
                // 读取并验证文件头 "FBUILD1"
                var header = "";
                for (var i = 0; i < 7 && FB.state.isProcessing; i++) {
                    var c = reader.read();
                    if (c === -1) break;
                    header += String.fromCharCode(c);
                }
                
                if (header !== "FBUILD1") {
                    clientMessage("§c[FB] 无效的文件格式");
                    try { reader.close(); } catch (e) {}
                    FB.state.isProcessing = false;
                    closeProgressUI();
                    return;
                }
                
                // 读取元数据直到 "blocks":[
                var metaBuffer = "";
                var foundBlocks = false;
                var origin = {x: 0, y: 0, z: 0};
                var size = {x: 0, y: 0, z: 0};
                var name = "unknown";
                
                while (!foundBlocks && FB.state.isProcessing) {
                    var c = reader.read();
                    if (c === -1) break;
                    metaBuffer += String.fromCharCode(c);
                    
                    if (metaBuffer.indexOf('"blocks":[') !== -1) {
                        foundBlocks = true;
                        
                        var metaPart = metaBuffer.substring(0, metaBuffer.indexOf('"blocks":['));
                        
                        var originMatch = metaPart.match(/"origin"\s*:\s*\{\s*"x"\s*:\s*(-?\d+)\s*,\s*"y"\s*:\s*(-?\d+)\s*,\s*"z"\s*:\s*(-?\d+)\s*\}/);
                        if (originMatch) {
                            origin.x = parseInt(originMatch[1]);
                            origin.y = parseInt(originMatch[2]);
                            origin.z = parseInt(originMatch[3]);
                        }
                        
                        var sizeMatch = metaPart.match(/"size"\s*:\s*\{\s*"x"\s*:\s*(\d+)\s*,\s*"y"\s*:\s*(\d+)\s*,\s*"z"\s*:\s*(\d+)\s*\}/);
                        if (sizeMatch) {
                            size.x = parseInt(sizeMatch[1]);
                            size.y = parseInt(sizeMatch[2]);
                            size.z = parseInt(sizeMatch[3]);
                        }
                        
                        var nameMatch = metaPart.match(/"name"\s*:\s*"([^"]*)"/);
                        if (nameMatch) {
                            name = nameMatch[1];
                        }
                    }
                    
                    if (metaBuffer.length > 10000) {
                        clientMessage("§c[FB] 文件格式异常");
                        try { reader.close(); } catch (e) {}
                        FB.state.isProcessing = false;
                        closeProgressUI();
                        return;
                    }
                }
                
                if (!foundBlocks || !FB.state.isProcessing) {
                    if (FB.state.isProcessing) {
                        clientMessage("§c[FB] 无效的文件结构");
                    }
                    try { reader.close(); } catch (e) {}
                    FB.state.isProcessing = false;
                    closeProgressUI();
                    return;
                }
                
                // 计算偏移量
                var offsetX, offsetY, offsetZ;
                if (mode === 1) {
                    offsetX = origin.x; 
                    offsetY = origin.y; 
                    offsetZ = origin.z;
                } else {
                    var halfX = Math.floor(size.x / 2);
                    var halfZ = Math.floor(size.z / 2);
                    offsetX = targetX - halfX; 
                    offsetY = targetY; 
                    offsetZ = targetZ - halfZ;
                }
                
                clientMessage("§b[FB] §f流式导入中...");
                clientMessage("§7名称: §e" + name + " §7| 尺寸: §e" + size.x + "x" + size.y + "x" + size.z);
                
                // 使用线程安全队列
                var blockQueue = new java.util.concurrent.ConcurrentLinkedQueue();
                
                // 设置流式导入任务
                FB.state.currentTask = {
                    type: "streamImport",
                    reader: reader,
                    readerThread: null,
                    blockQueue: blockQueue,
                    fileSize: fileSize,
                    bytesRead: 7 + metaBuffer.length,
                    offsetX: offsetX,
                    offsetY: offsetY,
                    offsetZ: offsetZ,
                    placed: 0,
                    parsed: 0,
                    readFinished: false,
                    parseFinished: false,
                    finished: false,
                    shouldStop: false,
                    name: name,
                    size: size
                };
                
                var task = FB.state.currentTask;
                
                // 启动后台解析线程
                task.readerThread = new java.lang.Thread(new java.lang.Runnable({
                    run: function() {
                        var charBuffer = java.lang.reflect.Array.newInstance(java.lang.Character.TYPE, FB.config.streamReadBufferSize);
                        var dataBuffer = "";
                        var blockPattern = /\{"x":(-?\d+),"y":(-?\d+),"z":(-?\d+),"id":(\d+),"data":(\d+)\}/g;
                        
                        try {
                            while (!task.shouldStop && !task.readFinished) {
                                // 控制队列大小，防止内存溢出
                                while (blockQueue.size() > 100000 && !task.shouldStop) {
                                    java.lang.Thread.sleep(10);
                                }
                                
                                if (task.shouldStop) break;
                                
                                var charsRead = reader.read(charBuffer, 0, FB.config.streamReadBufferSize);
                                
                                if (charsRead === -1) {
                                    task.readFinished = true;
                                    break;
                                }
                                
                                task.bytesRead += charsRead;
                                
                                // 转换为字符串并追加到缓冲区
                                var newData = new java.lang.String(charBuffer, 0, charsRead);
                                dataBuffer += String(newData);
                                
                                // 检测是否到达blocks数组结尾
                                var endIndex = dataBuffer.indexOf('],"blockCount"');
                                if (endIndex === -1) {
                                    endIndex = dataBuffer.indexOf(']}');
                                }
                                
                                var searchBuffer = dataBuffer;
                                if (endIndex !== -1) {
                                    searchBuffer = dataBuffer.substring(0, endIndex);
                                    task.readFinished = true;
                                }
                                
                                // 批量解析方块
                                var match;
                                var lastMatchEnd = 0;
                                blockPattern.lastIndex = 0;
                                
                                while ((match = blockPattern.exec(searchBuffer)) !== null) {
                                    var block = {
                                        x: parseInt(match[1]),
                                        y: parseInt(match[2]),
                                        z: parseInt(match[3]),
                                        id: parseInt(match[4]),
                                        data: parseInt(match[5])
                                    };
                                    blockQueue.offer(block);
                                    task.parsed++;
                                    lastMatchEnd = blockPattern.lastIndex;
                                }
                                
                                // 保留未匹配完的部分
                                if (lastMatchEnd > 0) {
                                    if (task.readFinished) {
                                        dataBuffer = "";
                                    } else {
                                        dataBuffer = dataBuffer.substring(lastMatchEnd);
                                        // 防止缓冲区过大
                                        if (dataBuffer.length > 10000) {
                                            var lastBrace = dataBuffer.lastIndexOf('}');
                                            if (lastBrace > 0) {
                                                dataBuffer = dataBuffer.substring(lastBrace + 1);
                                            }
                                        }
                                    }
                                }
                            }
                        } catch (e) {
                            if (!task.shouldStop) {
                                print("Stream reader error: " + e);
                            }
                        } finally {
                            task.parseFinished = true;
                            try { reader.close(); } catch (ex) {}
                        }
                    }
                }));
                
                task.readerThread.setPriority(java.lang.Thread.MIN_PRIORITY + 2);
                task.readerThread.start();
                
                updateProgress(0, "开始放置方块...");
                
            } catch (e) {
                try { if (reader !== null) reader.close(); } catch (ex) {}
                clientMessage("§c[FB] 流式导入错误: " + e);
                FB.state.isProcessing = false;
                FB.state.currentTask = null;
                closeProgressUI();
            }
        }
    })).start();
}

// ============================================
// modTick - 驱动导入任务
// ============================================

function modTick() {
    FB.state.tickCounter++;
    
    if (!FB.state.isProcessing || FB.state.currentTask === null) return;
    
    var task = FB.state.currentTask;
    
    // 普通导入处理
    if (task.type === "import") {
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
        return;
    }
    
    // 流式导入处理 - 优化版
    if (task.type === "streamImport") {
        if (task.finished) return;
        
        try {
            var blockQueue = task.blockQueue;
            var placedThisTick = 0;
            var maxPerTick = FB.config.streamImportBatchSize;
            
            // 从队列批量取出并放置方块
            while (placedThisTick < maxPerTick && FB.state.isProcessing) {
                var block = blockQueue.poll();
                if (block === null) {
                    // 队列为空，检查是否解析完成
                    if (task.parseFinished) {
                        task.finished = true;
                    }
                    break;
                }
                
                var x = task.offsetX + block.x;
                var y = task.offsetY + block.y;
                var z = task.offsetZ + block.z;
                
                if (y >= 0 && y <= 255) {
                    try {
                        setTile(x, y, z, block.id, block.data);
                        task.placed++;
                    } catch (e) {}
                }
                placedThisTick++;
            }
            
            // 更新进度
            if (FB.state.tickCounter % FB.config.progressUpdateInterval === 0) {
                var pct = 0;
                if (task.fileSize > 0) {
                    pct = (task.bytesRead / task.fileSize) * 100;
                    if (pct > 99 && !task.finished) pct = 99;
                }
                var queueSize = blockQueue.size();
                updateProgress(pct, "放置: " + task.placed + " | 解析: " + task.parsed + "\n队列: " + queueSize + " | 读取: " + formatSize(task.bytesRead));
            }
            
            // 完成处理
            if (task.finished || !FB.state.isProcessing) {
                task.shouldStop = true;
                
                try {
                    if (task.readerThread !== null) {
                        task.readerThread.interrupt();
                    }
                } catch (e) {}
                
                try {
                    if (task.reader !== null) {
                        task.reader.close();
                    }
                } catch (e) {}
                
                var placed = task.placed;
                var wasProcessing = FB.state.isProcessing;
                
                FB.state.isProcessing = false;
                FB.state.currentTask = null;
                
                closeProgressUI();
                
                if (wasProcessing && task.finished) {
                    clientMessage("§a[FB] §f流式导入完成!");
                    clientMessage("§7放置: §e" + placed + " §7个方块");
                    toast("导入成功!");
                }
            }
            
        } catch (e) {
            task.shouldStop = true;
            
            try {
                if (task.readerThread !== null) {
                    task.readerThread.interrupt();
                }
            } catch (ex) {}
            
            try {
                if (task.reader !== null) {
                    task.reader.close();
                }
            } catch (ex) {}
            
            FB.state.isProcessing = false;
            FB.state.currentTask = null;
            closeProgressUI();
            clientMessage("§c[FB] 流式导入错误: " + e);
        }
        return;
    }
}

// ============================================
print("[FastBuild v" + FB.config.version + "] 已加载");