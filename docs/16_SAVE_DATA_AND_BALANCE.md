# 16. 保存データ・経済初期データ・検証契約（v0.4）

docs/03_MANAGEMENT.md / docs/05_CONTENT_DATA.mdの**型定義を実装に必要な粒度に補完する**。本書は契約仕様。ゲーム状態はES Modulesで実装し、保存構造はJSON Schemaと`src/save-validation.mjs`で検証する。TypeScript/Zodは使用しない。テスト計画の実施状況はdocs/23を参照。

## 1. 固定データ（MVP）
- 料理は `beef_katsumeshi` 1品、価格980円。材料は `beef=250, rice=60, coating=40, sauce=50, cabbage=30` 円/食分相当。計430円。
- 在庫はすべて **「食分相当」の整数**。初期在庫は各材料10。料理1皿で各1を消費、調理途中キャンセルでも返却しない。腐敗/賞味期限はMVP外。
- 仕入時は各材料を1/5/10単位で選択でき、所持上限99、購入後現金が負になる購入は拒否。負の現金残高からの新規購入は不可。
- たれ配合値は0,10,...,100の整数。初期プリセット `basic=(50,60,40)`。保存可能なプリセットは計3件。
- 価格変更、スタッフ人件費、割引、複数皿注文、材料の廃棄期限はMVP外。
- 設備は fryer(8,000円、Day2から有効) と chairs(5,000円、Day3から有効) のみ。**Day1結果後のUPGRADEでは翌Day2用フライヤー購入可**、椅子はDay2結果後から購入可。

## 2. ドメインモデル（実装で満たす）
```ts
type Phase = "MORNING"|"OPEN"|"COOK"|"REACTION"|"RESULT"|"UPGRADE";
type OrderState = "queued"|"cooking"|"served"|"cancelled"|"expired";
type Rank = "SSS"|"S"|"A"|"B"|"C"|"F";
type SauceTaste = { sweetness:number; richness:number; acidity:number };
type IngredientId = "beef"|"rice"|"coating"|"sauce"|"cabbage";
type IngredientUnits = Record<IngredientId,number>; // integer 0..99
type Order = {
 id:string; customerId:"regular"|"student"|"worker"|"tourist";
 recipeId:"beef_katsumeshi"; state:OrderState;
 createdAtGameSeconds:number;
 queuedWaitRemainingSeconds:number;
 priceYenSnapshot:number; ingredientCostYenSnapshot:number;
 sauceSnapshot:SauceTaste|null; ingredientsConsumed:boolean;
 cookingScore:number|null; qualityBreakdown:null|{stageScores:Record<"P1"|"P2"|"P3"|"P4"|"P5"|"P6",number>;quality:number;tasteDistance:number;tasteBonus:number;finalScore:number;rank:Rank}; rank:Rank|null; settled:boolean;
 appliedActionIds:string[];
};
type CookingSession = {
 orderId:string; stageIndex:0|1|2|3|4|5;
 completedScores:Partial<Record<"P1"|"P2"|"P3"|"P4"|"P5"|"P6",number>>;
 selectedSauceId:string; sauceSnapshot:SauceTaste;
 retriesRemaining:number; unlimitedRetry:boolean;
 stageInput:{
   elapsedSeconds:number; timerStarted:boolean;
   taps:number; strikeXs:number[]; thicknessError01:number;
   coatCoverage01:number[]; coatCellMask:number[]; // 3 zone bitsets
   placedComponentIds:string[]; placedSlotIds:string[]; selectedComponentId:string|null;
 };
};
type DailyLedger = {
 salesYen:number; ingredientConsumedYen:number; wasteYen:number;
 purchasesYen:number; upgradePurchasesYen:number;
 overheadYen:number; payrollYen:number;
 providedCount:number; cancelledCount:number; expiredCount:number;
 skippedCandidates:number;
};
type GameSave = {
 schemaVersion:1; revision:number; savedAtIso:string;
 seed:number; rngState:number; day:number; nextOrderSequence:number;
 phase:Phase; reactionStage:null|"intro"|"customerReaction"|"resultVisible"; overlay:null|{kind:"PAUSE"|"EVENT";eventId?:string};
 openingRemainingSeconds:number|null; businessElapsedSeconds:number;
 remainingArrivals:number; nextArrivalIndex:number; arrivalSeconds:number[];
 tutorialNextOrderIndex:number; tutorialFirstServed:boolean;
 dayClosed:boolean; dayOverheadSettled:boolean;
 aidGrantedDay:number|null; // 同日に二度の支援を受けられない
 cashYen:number; reputation:number; inventory:IngredientUnits;
 unlockedRecipeIds:string[]; unlockedUpgradeIds:string[];
 sauces:{id:string;taste:SauceTaste}[];
 customerAffinity:Record<string,number>;
 orders:Order[]; activeOrderId:string|null;
 cookingSession:CookingSession|null;
 seenStoryEventIds:string[]; appliedCommandIds:string[];
 dailyLedger:DailyLedger;
 lastServedOrderId:string|null; lastReactionRank:Rank|null;
};
```
- `GameSave`はJSON Schemaで構造検証し、注文/フェーズ/台帳の相互条件を`src/save-validation.mjs`で追加検証する。
- `openingRemainingSeconds=null` はDay1チュートリアルのみ。通常日は0..600。
- `lastServedOrderId` はREACTION再表示での二重会計を防ぐため表示専用。独立した注文スナップショットをsource of truthとする。
- `arrivalSeconds` と `nextArrivalIndex` は通常日の候補予定を保持。リロード後に同じ候補を再生成しない。MVPでは一日の開始時に配列を生成し永続化する。
- `customerAffinity` は0..100。MVPの明示的な長期解放には用いない（将来用の保存フィールド）。
- `seenStoryEventIds` のIDが既読なら同じ日次会話を再演しない。

## 3. トランザクション
- `BUY_INGREDIENT` (MORNING): `cashYen>=price`、`inventory[id]+qty<=99` で `cash-=price`, `inventory+=qty`, `ledger.purchasesYen+=price`。原価消費は増やさない。
- `ACCEPT_ORDER` (OPEN): 5種類の在庫を確認後 `inventory-=1`、`ledger.ingredientConsumedYen+=430`、`ingredientsConsumed=true`、`state=cooking` を一操作で記録。 `activeOrderId` と `CookingSession` を作成。
- `COMPLETE_STAGE` (COOK): 当該工程の入力が確定済みなら一回だけ点数保存。P6完了までSERVE不可。
- `SERVE` (COOK): 調理済・未settledなら価格スナップショットを売上と現金へ、評価ランク分を評判へ追加。 `settled=true`、`state=served`、`phase=REACTION`、`reactionStage=intro`。REACTION_NEXTで顧客反応・結果表示へ順に進み、REACTION_SKIPはresultVisibleへ進める。DISMISS_REACTIONはresultVisibleでのみ許可。
- `CANCEL_ORDER` (COOK): 既消費なら `ledger.wasteYen+=ingredientCostYenSnapshot`、`state=cancelled`、`phase=OPEN`。ingredientConsumedYenは消費時点で加算済みなので**追加で原価減算しない**。
- `EXPIRE_ORDER` (queued): `state=expired`、`reputation-=2`、`ledger.expiredCount+=1`、`inventory`は不変。
- `CLOSE_DAY`: `dayOverheadSettled` がfalseなら `overheadYen+=2200`、`cashYen-=2200`、trueにする。重複実行は無視。
- `BUY_UPGRADE` (UPGRADE): `day+1>=unlockDay`・未購入・支払可能を満たせば現金減額とID解放を原子的に更新。効果は翌日OPENから有効。
- `NEXT_DAY`: UPGRADE以外から拒否。日次ledgerとday flagsを初期化し、評判、在庫、設備、たれ、既読会話を継続。購入済みの設備は翌日の開始時点で効力がある。

## 4. 会計の検算式
```
grossProfit = salesYen - ingredientConsumedYen
operatingProfit = salesYen - ingredientConsumedYen - overheadYen - payrollYen
cashDelta = salesYen - purchasesYen - overheadYen - payrollYen - upgradePurchasesYen
// wasteYen は ingredientConsumedYen の内数で二度引かない
```
- `upgradePurchasesYen` は設備購入による現金支出であり営業費用ではなく資産投資。DailyLedgerに明示し、営業利益では減算しない。
- Day1基準: 初期現金30,000+売上7,840-固定費2,200=35,640。原価3,440は開業支給在庫からの消費のため当日現金減額しない。

## 5. 救済/進行不能防止
- MORNINGにて「必要5材料が1食分も揃わず」「不足材料を1食分揃える購入が現金不足で不可能」な場合、**立て直し支援**ボタンを1日1回表示。条件は `!every(inventory[id]>=1) && cashYen < sum(cost[id] for inventory[id]<1)`。押すと各食材の在庫を `max(current,4)` に補填（不足品以外は実質無変更。無料の現物支給、上限99）、仕入支払や原価計上なし。 `aidGrantedDay=day` を永続化する。
- 支援でも通常通り料理開始時に原価計上する。現金が負でも支援は受けられる。Day1の初期10食分では表示されない。
- 無償支援は明示的な救済機能であり通常の仕入の代わりとして利用できない条件判定をテストする。

## 6. 保存の原子性・復元
- IndexedDBは `main` と `backup` の2キーを使用し、1 transactionで世代を切り替える。`revision` を単調増加。保存中にページを閉じても最終コミット済みデータに戻す。
- `SAVE_QUIT`は保存成功後にTITLEへ遷移、失敗時は同じ画面に留まる。
- REACTIONからの再開でもSERVE再発火禁止。COOKからの再開は未完了の現在工程の入力を復元する。
- saveファイルの外部JSON import/exportはMVP外。診断用エクスポートは開発ビルドのみ。
- schemaVersion不一致/データ不整合はバックアップ復旧を試み、失敗なら新規ゲームの選択肢とエラー内容を表示。旧データを自動削除しない。

## 7. セーブ時不変条件
- 現金は整数。材料数0..99の整数。評判0..100、料理得点0..100。
- activeOrderId!=null ↔ phase=COOKかつ料理中注文がちょうど1件（ただしCOOK→REACTIONへはactiveOrderIdを同時にnullにする）。
- phase=REACTIONなら `lastServedOrderId` が必ず有効なserved注文を示し、settled=true。
- `wasteYen<=ingredientConsumedYen`、二重精算不可、同じorderIdが二つ存在しない。
- DAY1では残り候補が固定8件で、通常日と異なる時計・来客スケジュール。
- `dayOverheadSettled=true`かつ `dayClosed=true` のとき再CLOSE_DAYは無変更。

## 8. テスト例（先に実装する）
- 1注文を提供→保存→再開→SERVEを再試行しても売上980/原価430のまま。
- キャンセル1件→waste430/原価430/売上0、現金変化0。
- Day1全8件提供→35,640円、各食材残2食分。
- Day2の買い足し5種各1の現金減430、販売時現金+980、原価+430。
- 購入対象が保有99食の時、1以上の追加を拒否。
- 立て直し支援を同日二度押しても2回目は無変更。

## v0.5 スキーマと契約の統一
- `spec/mvp_save.schema.json`がJSON構造、`spec/mvp_save_example.json`がDay1初期セーブの例、`spec/mvp_config.json`が初期値の正。本文の型は説明であり競合時はschemaを優先。
- `appliedCommandIds`を保存し、支援/購入/受付/提供/設備購入/閉店/日付遷移に付けたcommandIdの重複適用を禁止。二重適用防止の範囲やタイムステップ順序は[20](20_EVENT_STATE_PROTOCOL.md)で定義。
- 初日初回キャンセルを拒否、`tutorialFirstServed`を保存する。無料支援は各食材を最低4食分へ補充し、在庫に4を無条件加算しない。

## v0.5 複数日集計と保存容量
`GameSave` は `careerLedger:DailyLedger`（完了済み営業日の累計）を追加で必須とする。 `orders[]` と `appliedCommandIds[]` はその日のみ保持し、`NEXT_DAY` で当日LedgerをcareerLedgerに1回だけ合算した後クリア。表示中の日次Ledgerは引き続き保持。Day7の累計は `careerLedger + dailyLedger`。このルールと自動保存の間隔・強制終了の復帰保証は[20](20_EVENT_STATE_PROTOCOL.md)が正。旧TypeScript例の追記漏れはセーブSchemaを優先する。
