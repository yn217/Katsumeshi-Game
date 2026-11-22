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
      queuedWaitRemainingSeconds: number; // queuedの間だけ減らす
      cookingScore?: number;
      ingredientsConsumed: boolean;
      priceYenSnapshot: number;           // 受付時の価格
      ingredientCostYenSnapshot: number;  // 受付時の原価
      sauceSnapshot: {sweetness:number; richness:number; acidity:number} | null;
      appliedActionIds: string[];         // ACCEPT_ORDER/SERVE等の重複防止
      settled: boolean; // 提供・売上・評判確定時にtrue
    };

## セーブスキーマ（v1）
    type SaveGame = {
      schemaVersion: 1;
      savedAtIso: string;
      seed: number;
      rngState: number;           // 乱数の再開位置
      nextOrderSequence: number; // 注文ID連番
      day: number;
      phase: "MORNING"|"OPEN"|"COOK"|"REACTION"|"RESULT"|"UPGRADE";
      overlay: null | {kind: "PAUSE" | "EVENT"; eventId?: string};
      activeOrderId: string | null;
      cookingSession: CookingSession | null;
      remainingArrivals: number;
      dayOverheadSettled: boolean;
      dayClosed: boolean;
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
- 永続化: MVPはIndexedDBを採用（技術仕様と共通）。保存中の失敗を検知して表示する。
- すべての数値をロード時に検証。NaN/Infinity/負数の不正な在庫を禁止。
- セーブは1スロット+手動バックアップスロット（MVP後半）。
- 重大な状態遷移（受付と材料消費/提供/閉店/購入/翌日）後は自動保存。
- schemaVersion変更時は明示的な移行関数を書く。未対応バージョンは読み込みを中断し元データを保持。
- ランダムイベントと客生成はseed付きの乱数から生成し、同じseedで再現可能にする。

## データ整合性制約
- 注文は queued → cooking → served、または queued → expired、cooking → cancelled のみ。queued→cookingで一度だけ材料消費し、cooking客は忍耐切れしない。
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

## 調理中の復元構造（v0.2、実装時にスキーマ定義）
    type StageId = "P1" | "P2" | "P3" | "P4" | "P5" | "P6";
    type CookingSession = {
      orderId: string;
      stageIndex: number; // 0..5
      completedScores: Partial<Record<StageId, number>>;
      selectedSauceId: string;
      sauceSnapshot: {sweetness:number; richness:number; acidity:number};
      retriesRemaining: number;
      stageInput: {
        elapsedSeconds: number;        // P3/P5など
        taps: number;                  // P1
        thicknessError01: number;      // P1
        coatCoverage01: number[];      // P2 3区画
        placedComponentIds: string[];  // P6
      };
    };

- SaveGameにあるCookingSession型は上記とする。COOKの途中入力値・残り時計・レシピ配合スナップショットを保管し、保存後の再開で変化させない。
- PAUSE/EVENTはオーバーレイで保存し、永続phaseは維持する。TITLEはセーブ対象のphaseにしない。
- remainingArrivals、rngState、nextOrderSequenceを保存することで再読み込み時の二重来店を防ぐ。
- 各orderにpriceYenSnapshot、ingredientCostYenSnapshot、sauceSnapshot、appliedActionIdsを保持し、途中でデータの値段が変わっても既存注文を再会計しない。正式スキーマ実装時に型へ反映する。
- ledger.wasteYenはledger.ingredientConsumedYenの**内数**。利益から二重減算しない。
- RESULTのdayOverheadSettledがtrueなら二度と固定費支払いを適用しない。
- 本書の型例は規範を定めるものだがコードそのものは未実装。実装時にはZod/JSON Schemaを一次情報として同期する。

## v0.4データ契約
本書の旧TypeScript断片は初期概念例であり、調理途中の入出力、到着予定や設備購入元帳、救済フラグを全て列挙していない。MVP実装時の必要フィールド・状態不変条件・精算契約は [16_SAVE_DATA_AND_BALANCE.md](16_SAVE_DATA_AND_BALANCE.md)、単位/数値は [spec/mvp_config.json](../spec/mvp_config.json) が優先。コードにする際はZod/JSON Schemaを作成してから旧例を削除・整理する。

## v0.5 セーブスキーマの正式な検証入口
`spec/mvp_save.schema.json`がSaveGame v1の**最低限のJSON構造**、`spec/mvp_save_example.json`がDay1/MORNINGの整合サンプル。旧TypeScript断片よりもこのschemaを優先する。さらに「phase=COOKかつcooking注文が1つ」等の複数項目にまたがる条件は[20](20_EVENT_STATE_PROTOCOL.md)のドメイン検証で行う。命令ID集合 `appliedCommandIds`、Day1初回提供 `tutorialFirstServed`、設備投資元帳、支援取得日 `aidGrantedDay`を保存する。
