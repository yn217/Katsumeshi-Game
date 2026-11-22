# かつめし繁盛記 ～加古川の一皿～

兵庫県加古川市の郷土料理「かつめし」を題材にした、調理アクション付き店舗経営シミュレーションゲーム。

プレイヤーは小さな食堂を営み、ビフカツの下ごしらえ・衣付け・揚げ・秘伝のたれ・盛り付けを工夫しながら、お客さんの評判と売上を伸ばして地域の人気店を目指します。

> 状態: 企画・仕様策定 v0.5（第3回レビュー・検証契約追加） / 作成日: 2026-11-22。以下の数値はゲームの初期設計値であり、実装とプレイテストで調整します。**初期ブラウザプロトタイプのコードを追加済み**（2026-11-22）。正式キャラクター等のゲーム用アセットは未分割、ブラウザE2Eと実機UI品質は未検証。UIモックアップ画像8枚は登録済みです。

## 動作するブラウザ初期プロトタイプ（2026-11-22）

**ブラウザ初期版のコードを追加しました。** 仕様v0.5の検証を優先した依存ライブラリ不要のES Modules版です。後にReact/PixiJSへ移行するときも `src/domain.mjs` のロジックを再利用できます。

```powershell
git clone https://github.com/yn217/Katsumeshi-Game.git
cd Katsumeshi-Game
npm run dev
```

ブラウザで `http://127.0.0.1:5173/` を開きます（Node.js 20以上推奨、npm install不要）。

```powershell
npm test
npm run build
```

- `npm test`：Node.jsの標準テストで注文/会計/調理/翌日など8項目を検証
- `npm run build`：外部依存なしの静的サイトを `dist/` に出力
- **機能:** タイトル → 朝の仕込み/たれ → 通常営業と注文 → 6工程 → 評価SSS〜F → 閉店結果 → 設備購入 → 翌日、IndexedDBセーブ/ロード
- **現状:** 調理は簡易入力方式。正式なキャラ立ち絵・料理アセット・音声・完全なドラッグ操作・ブラウザE2Eは未対応。公開リリースではなく操作検証用。
- **注意:** `index.html` を直接ダブルクリックせず、`npm run dev` でHTTP配信してください。ローカル保存はブラウザのIndexedDBに依存します。

実装範囲・検証結果・既知の差分は [docs/24_PROTOTYPE_IMPLEMENTATION.md](docs/24_PROTOTYPE_IMPLEMENTATION.md) を参照。

## 設計の柱
- **調理の手触り**: 1皿を短いアクションの連続で作り、出来映えが目に見えて変化する。
- **たれの研究**: 甘さ・コク・酸味の配合を研究し、店の看板メニューを生み出す。
- **キャラクターの反応**: 料理の評価が客の表情、台詞、評判に反映される。常連化による動的来客抽選はv1以降。
- **地域性**: 加古川の食文化を尊重しつつ、架空の街・人物による温かな店舗物語を描く。

## ドキュメント
| パス | 内容 |
| --- | --- |
| [docs/00_VISION.md](docs/00_VISION.md) | コンセプト・対象ユーザー・スコープ・非目標 |
| [docs/01_GAMEPLAY.md](docs/01_GAMEPLAY.md) | コアループ・進行・ゲーム状態・チュートリアル |
| [docs/02_COOKING.md](docs/02_COOKING.md) | 調理アクション・評価式・たれ研究 |
| [docs/03_MANAGEMENT.md](docs/03_MANAGEMENT.md) | 店舗経営・顧客・イベント・バランス |
| [docs/04_UI_UX.md](docs/04_UI_UX.md) | 画面遷移・画面構成・入力・アクセシビリティ |
| [docs/05_CONTENT_DATA.md](docs/05_CONTENT_DATA.md) | データ定義・レシピ・イベント・セーブ |
| [docs/06_ART_ASSETS.md](docs/06_ART_ASSETS.md) | ビジュアル方針・アセット規格・ComfyUI制作 |
| [docs/07_TECHNICAL.md](docs/07_TECHNICAL.md) | Web実装案・アーキテクチャ・性能目標 |
| [docs/08_ROADMAP_QA.md](docs/08_ROADMAP_QA.md) | MVP工程・Issue分割・検証・受け入れ基準 |
| [docs/09_REFERENCES.md](docs/09_REFERENCES.md) | 郷土料理の事実確認・資料・権利について |
| [docs/10_SPEC_REVIEW.md](docs/10_SPEC_REVIEW.md) | 仕様レビュー・修正履歴・未解決事項 |
| [docs/11_UI_MOCKUPS_V03.md](docs/11_UI_MOCKUPS_V03.md) | 新キャラクターを反映したUIモックアップ v0.3 のレビューと管理 |
| [docs/12_MVP_SIMULATION_SPEC.md](docs/12_MVP_SIMULATION_SPEC.md) | 来客スケジュール、時間処理、注文、閉店 |
| [docs/13_SCREEN_INTERACTION_SPEC.md](docs/13_SCREEN_INTERACTION_SPEC.md) | 画面別操作、ボタン、遷移、エラー |
| [docs/14_COOKING_INPUT_CONTRACT.md](docs/14_COOKING_INPUT_CONTRACT.md) | 調理6工程の具体的入力・採点 |
| [docs/15_NARRATIVE_CHARACTER_AUDIO.md](docs/15_NARRATIVE_CHARACTER_AUDIO.md) | 主人公・顧客・物語・台詞・音 |
| [docs/16_SAVE_DATA_AND_BALANCE.md](docs/16_SAVE_DATA_AND_BALANCE.md) | セーブ契約、食材単位、会計、救済 |
| [docs/17_ASSET_PRODUCTION_PLAN.md](docs/17_ASSET_PRODUCTION_PLAN.md) | UI分割、ComfyUI、アセット制作 |
| [docs/18_REVIEW_V04.md](docs/18_REVIEW_V04.md) | レビュー指摘と実装残課題 |
| [docs/19_REVIEW_V05.md](docs/19_REVIEW_V05.md) | 第3回横断レビューと修正記録 |
| [docs/20_EVENT_STATE_PROTOCOL.md](docs/20_EVENT_STATE_PROTOCOL.md) | 状態遷移・コマンド処理・保存規約 |
| [docs/21_BALANCE_AND_PLAYER_EXPERIENCE.md](docs/21_BALANCE_AND_PLAYER_EXPERIENCE.md) | 進行、ゲーム体験、バランス試験 |
| [docs/22_UI_ACCESSIBILITY_AND_INPUT.md](docs/22_UI_ACCESSIBILITY_AND_INPUT.md) | 画面状態・入力・アクセシビリティ |
| [docs/23_QA_RELEASE_CONTRACT.md](docs/23_QA_RELEASE_CONTRACT.md) | 単体/E2E/アセット受け入れ試験 |

## MVP（最初に動かすもの）
- ブラウザでタイトル→1日の仕込み→開店→8件の注文→結果→翌日の流れを遊べる
- 基本ビーフかつめし1種、たれ3パラメータ、異なる嗜好を持つ客4種
- カツ調理6工程（採点5工程＋たれ選択1工程）、品質評価、食後リアクション、売上・評価・セーブ
- マウス操作中心。仮アセットで機能検証後、ComfyUIのオリジナル素材に置き換える

## 設計ルール
仕様と実装を区別する。未検証の数値には「暫定値」を明記する。実在店舗・実在人物・観光協会の公式キャラクター／ロゴの無断利用はしない。

## 開発
初期案は Vite + TypeScript + React（UI）+ PixiJS（2D演出）、ローカルセーブ。ゲームの品質検証を優先し、Godot等への移行は必要性を評価した後に判断する。

## v0.2の共通決定事項
初日は8注文・制限時間なし、通常日は600秒、客の待機時間は基本180秒。**待機客だけ忍耐が減り、調理中はその注文の待ち切れなし。試食リアクション中は時計停止。閉店時間後も残注文を処理する**。食材は注文を受けた時点で消費し、売上は提供時に一回だけ確定する。変更箇所と追加検討事項は[レビュー記録](docs/10_SPEC_REVIEW.md)参照。

## 実装に用いる仕様の優先順位（v0.4）
従来の企画書00〜11を残しつつ、細部の具体的な操作・時間・計算・保存契約は [12〜18の実装規範](docs/18_REVIEW_V04.md) を優先する。初期数値の唯一の機械可読ソースは [spec/mvp_config.json](spec/mvp_config.json) とする。仕様のレビューで不足を補っただけでゲーム本体の実装・動作試験が完了したわけではない。

**ゲームの顔**: 指定された銀髪・双お団子・ピンク色の瞳とヘアピンの主人公。元参照画像の衣装は使用せず、食堂の店主役としてデザインする。料理を評価するのは注文した顧客。モックアップは構図の参考であり、実装では背景/人物/料理/ボタンを分ける。

## v0.5で確定した追加実装ルール
- 設備unlockDayは**効果が発生する最初の営業日**。その前日の閉店後UPGRADEから購入可。Day1結果後はDay2用フライヤーを購入できる。
- 不足在庫への無償支援は**各品を最低4食分まで補う**もので、既にある材料に4食分を無条件加算しない。
- Day1の最初の注文は一度提供・試食を見せるまでキャンセル不可。以降はキャンセル可能。
- UI文字は画面画像とは別レイヤーでCSS表示。1280×720でも18px程度の主要文字サイズを維持。
- [spec/mvp_config.schema.json](spec/mvp_config.schema.json)・[spec/mvp_save.schema.json](spec/mvp_save.schema.json)・[spec/mvp_save_example.json](spec/mvp_save_example.json) でデータ型を検証する。[scripts/validate_specs.py](scripts/validate_specs.py)を使った静的チェックは実行可能な準備が整った段階で検証する。

**仕様優先順位:** v0.5の[19](docs/19_REVIEW_V05.md)を参照。v0.4の旧説明・v0.3の画像に矛盾する値があれば20〜23とspec JSONを優先する。ゲームコードやE2Eはまだ未実装。
