# 05. コンテンツ・データ構造

## 方針
- ゲームの調理判定、客、メニュー、設備、イベント、会話をデータ駆動で定義。
- 内部IDはASCII snake_case。表示名・文章は別の日本語ローカライズ辞書に置く。
- 全IDは一意・不変。セーブ参照用IDの付け替えを禁止。
- ゲームロジックは表示レイヤー/ComfyUIの出力ファイル名に依存しない。

## データファイルの想定
| ファイル | 用途 |
| --- | --- |
| data/recipes.json | 料理ID、材料量、原価、基本価格、工程構成 |
| data/ingredients.json | 食材ID、単価、保有単位、表示画像 |
| data/customers.json | 顧客ID、台詞群、好み、待ち倍率、来店ウェイト |
| data/sauces.json | 初期配合、研究段階、特殊レシピ |
| data/upgrades.json | 費用、前提、効果量 |
| data/events.json | 起動条件、期間、演出ID、パラメータ変化 |
| data/dialogue.ja.json | 日本語台詞、評価別リアクション |
| data/assets.json | アセットID、用途、実ファイルパス、生成バージョン |
| data/balance.json | 営業時間、評判係数、日次客数、品質閾値 |

## 型定義（例）
下記はTypeScriptへの落とし込みを想定した規範的なフィールド例。数値の単位を明記し、実装の型とスキーマ検査を一致させる。

    type Sauce = {
      id: string;
      sweetness: number;   // 0..100
      richness: number;    // 0..100
      acidity: number;     // 0..100
    };

    type Customer = {
      id: string;
      preferredSauce: { sweetness: number; richness: number; acidity: number };
      patienceMultiplier: number; // >0
      arrivalWeight: number;      // >=0
      reactionAssetIds: Record<"SSS"|"S"|"A"|"B"|"C"|"F", string>;
    };

    type Recipe = {
      id: string;
      ingredientAmounts: Record<string, number>; // 非負・食数単位
      priceYen: number;
      stages: Array<"P1"|"P2"|"P3"|"P4"|"P5"|"P6">;
    };

    type Order = {
      id: string; customerId: string; recipeId: string;
      state: "queued"|"cooking"|"served"|"cancelled"|"expired";
      createdAtGameSeconds: number;
      patienceSeconds: number;
      cookingScore?: number;
      settled: boolean;
    };

## セーブスキーマ（v1）
    type SaveGame = {
      schemaVersion: 1;
      savedAtIso: string;
      seed: number;
      day: number;
      phase: "MORNING"|"OPEN"|"COOK"|"REACTION"|"RESULT"|"UPGRADE";
      timeRemainingSeconds: number;
      cashYen: number;
      reputation: number;
      inventory: Record<string, number>;
      unlockedRecipeIds: string[];
      unlockedUpgradeIds: string[];
      sauces: Sauce[];
      orders: Order[];
      seenStoryEventIds: string[];
      customerAffinity: Record<string, number>;
      dailyLedger: {
        salesYen: number; ingredientConsumedYen: number;
        purchasesYen: number; overheadYen: number;
        payrollYen: number; wasteYen: number;
      };
    };

## セーブとバージョニング
- 永続化: MVPはIndexedDBまたはlocalStorageを採用（選定は技術仕様参照）。保存中の失敗を検知して表示する。
- すべての数値をロード時に検証。NaN/Infinity/負数の不正な在庫を禁止。
- セーブは1スロット+手動バックアップスロット（MVP後半）。
- 重大な状態遷移（提供確定/閉店/購入/翌日）後は自動保存。
- schemaVersion変更時は明示的な移行関数を書く。未対応バージョンは読み込みを中断し元データを保持。
- ランダムイベントと客生成はseed付きの乱数から生成し、同じseedで再現可能にする。

## データ整合性制約
- 注文は queued → cooking → served、または queued → expired、cooking → cancelled のみ。
- served, cancelled, expired は終了状態。2回精算しない。
- cashYenは整数、評判・満足度は0〜100、材料量は整数個/グラム等をレシピ側で固定。
- 1営業日で同じイベントIDが複数回発火しない。
- データをロードする時点ですべての参照（recipeId/customerId/assetId）が存在することを確認。
- ローカライズ文字列の不足は開発時エラー、リリース時は安全な代替文言表示。

## 台詞・ストーリー
- 評価別のセリフは客ごとに最低6本（SSS/S/A/B/C/F）。
- 注文前の好みヒントは各客2〜3本、初来店・常連時の挨拶を分ける。
- 台詞は短め（標準で1〜2行）。長い文章は分割する。
- 世界観は加古川の食文化をベースにした創作。実在店舗の店名・メニューを許可なく移植しない。

## データ検証テスト
- すべてのJSONが構文・型スキーマに合致する。
- 使用するアセットIDの参照先がある。
- 配合値の範囲外・二重ID・重複イベント・無効な工程順はCI相当のローカル検証で失敗する。
- すべての評価ランクにリアクションアセットまたは代替表示がある。
