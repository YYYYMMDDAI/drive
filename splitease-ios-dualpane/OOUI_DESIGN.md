# OOUI_DESIGN

SplitEase DualPane をオブジェクト中心で設計するための定義。

## Core Objects

### 1. Pane
- 属性: `position(top/bottom)`, `selectedTarget`, `title`
- 責務: どの領域でどのアプリを開くかを保持する。

### 2. Preset
- 属性: `name`, `topTarget`, `bottomTarget`, `description`
- 責務: すぐ使える組み合わせを提供する。

### 3. SplitLayout
- 属性: `ratio`, `minRatio`, `maxRatio`, `aspect(9:16)`
- 責務: 分割ルールを保証する。

### 4. LaunchRequest
- 属性: `target`, `requestedAt`, `fromPane`
- 責務: 起動操作の単位を表現する。

### 5. UserPreference
- 属性: `selectedPreset`, `theme`, `hasShownConstraintGuide`
- 責務: 再起動時に体験を復元する。

## Viewの責務
- Viewは「オブジェクトの状態表示」と「イベント通知」のみ。
- 状態更新・制約判定・保存は ViewModel/Service 側で行う。
