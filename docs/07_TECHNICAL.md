# 07. 技術仕様・実装アーキテクチャ

## 推奨MVPスタック（提案）
- Vite + TypeScript（strict）
- React（HUD、メニュー、モーダル、会話UI）
- PixiJS（店舗・調理・料理の2D描画、演出）
- Web Audio API（SE/BGM。初回ユーザー操作後に再生）
- IndexedDB（MVPで採用。トランザクションと破損復旧を優先）
- Vitest（計算/状態/データ）、Playwright（画面遷移E2E）
- GitHub Actionsを前提としない。ローカル検証コマンドを定義する。

Web版はユーザーがすぐ触れる試作を優先。ゲームロジックをReact/PixiJSから独立させ、後からエンジン変更可能な構造にする。

## 推奨ディレクトリ
    src/
      app/                   # 起動、ルーティング、依存性注入
      domain/
        cooking/             # スコア算出、工程判定
        economy/             # 在庫、売上、固定費
        customers/           # 待ちと好み、注文
        calendar/            # 日付、イベント
        state/               # ゲーム状態機械
      services/
        save/                # セーブ永続化/マイグレーション
        assets/              # アセットロード、キャッシュ
        audio/               # 音
      ui/
        screens/             # タイトル、仕込み、店舗、調理、反応、結果
        components/          # ボタン、注文カード、モーダル
      scene/
        shop/                # 店舗2D表示
        cooking/             # 調理2D表示
        effects/             # パーティクル等
      data/                  # versioned JSON
      tests/                 # unit/integration
    public/assets/
    docs/
    scripts/

## システム構成
- Domain Core: 副作用のない cookingScore、purchaseInventory、settleOrder、advanceClockなどの関数。
- GameStore: 単一の正規状態と操作アクション。UIはStoreのスナップショットから描画。
- SceneAdapter: PixiJS描画と入力をDomain Actionへ変換。直接現金や在庫を書き換えない。
- UIAdapter: React画面の入力をDomain Actionへ変換。Sceneと同じ状態を参照する。
- Persistence: バージョン付けされたセーブの読込/検証/保存、旧形式移行。
- AssetRegistry: アセットID→ファイルパス、ロード失敗時の代替表示、進捗表示。

## ゲームループ
- GameClockはdeltaSecondsを受け取り、ブラウザのフレームレートに依存しない経過時間を計上。OPEN/COOKでのみ時計を進め、REACTION/PAUSE/MORNING/RESULT/UPGRADEでは停止。
- requestAnimationFrameは描画用。調理や顧客の待ち時間などのロジックは固定ステップ（例: 1/30秒）の更新が望ましい。
- タブ非アクティブ時は自動一時停止し、復帰後に大量の経過時間を一度に進めない。
- 乱数はseedベース、客生成やイベントはseedとゲーム内Dayから再現できるようにする。
- アニメーション用乱数をゲームバランス用乱数と分離する。

## ステートマシン/トランザクション
| アクション | 前提 | 副作用 |
| --- | --- | --- |
| START_DAY | MORNING | 時計初期化 |
| BUY_INGREDIENT | MORNING、仕入上限/現金条件を満たす | 現金減少、在庫増加、仕入支出を記録 |
| BUY_UPGRADE | UPGRADE、解放日/未購入/現金条件を満たす | 現金減少、設備ID解放、投資支出を記録 |
| OPEN_SHOP | MORNING | OPEN、注文発生開始 |
| ACCEPT_ORDER | OPEN、注文queued、食材十分 | 在庫減算・消費原価計上、注文cooking、COOK |
| COMPLETE_STAGE | COOK、現在工程に一致 | 検証済み工程スコア保存、次工程 |
| SERVE | COOK全工程完了、未精算 | score計算、売上・評判確定、注文served、REACTION |
| DISMISS_REACTION | REACTION | 会計変更なし、OPENに戻る |
| CLOSE_DAY | OPEN、終了条件成立、残注文なし | 固定費1回決済、RESULTへ |
| GO_UPGRADE | RESULT | UPGRADEへ（会計変更なし） |
| NEXT_DAY | UPGRADE | 日付進行、MORNING |
| SAVE_QUIT | 任意の復元可能状態 | セーブ完了後タイトル |

各アクションはvalidate → apply → persist notificationを通す。同じactionId/orderIdの二重送信を無視。Reactの再レンダーやダブルクリックで二重精算しない。

## 性能とロード
- 目標: 1920×1080で描画60fps、操作反応100ms以内、一般的なPCでタイトル初期表示3秒以内（キャッシュ済みを想定）。
- 画像は画面単位で遅延ロードし、元解像度を無条件で描画しない。
- 大量の画像がある立ち絵・反応素材は必要な差分だけロード。
- ループごとのDOM全再構築は禁止。状態表示は更新箇所を絞る。
- 画像処理やAI推論をブラウザ側の本番ゲーム中に行わない。ComfyUIは過去のキャラクター素材制作に使ったが、現在は新規ジョブ投入をすべて停止している。非キャラクター画像はChatGPT画像生成を使う。

## ログとデバッグ
- 開発ビルドにseed指定、Dayジャンプ、評判変更、評価ランク強制、在庫補充のDebug Menu。
- 警告ログにはeventId/orderId、phase、actionNameを残す。個人情報は収集しない。
- 1日プレイの再現テスト用に入力アクションの列をエクスポートできる構造にする（MVP後半）。

## セーブ・失敗復旧
- 保存直前はスキーマ検証し、旧セーブを残したまま新スロットへ書き込む（IndexedDBのtransaction活用）。
- 読み込み失敗時に古いデータを上書きせず「復旧/初期化」の選択肢を表示。
- 中断時COOKデータは工程と入力結果を保持、未完了アニメはロード後に再表示。

## セキュリティと権利
- APIキーやComfyUIのローカルURLを公開ビルドに埋め込まない。
- 生成されたローカルアセットに個人フォルダパスなどのメタデータがあれば公開前に除外。
- 外部画像は出典/利用許諾を確認する。町の地図や実店のロゴを無断複製しない。

## 推奨ローカル検証コマンド（実装後の想定）
- `npm run dev`: 依存なしのローカルHTTP開発サーバーを起動。開発サーバーでは一時停止メニューにDebug Menuを表示する。
- `npm test`: Node標準テストを実行。
- `npm run build`: 承認済み素材だけを対象とする配布ビルド。
- `npm run build:preview`: 候補素材を含むローカル確認用プレビューを作る。
- `npm install`、`npm run typecheck`、`npm run lint`、`npm run test:e2e` は現在のpackage scriptsにない。導入するまでは実装済みコマンドとして扱わない。

### 開発用Debug Menu
- 開発サーバーが提供する `__dev_status` を確認できた場合だけ、一時停止画面から開ける。
- seedの更新、Day 1〜7への移動、評判変更、調理中注文の評価ランク強制、全食材99食分への補充を行える。
- 操作後はGameSaveスキーマ/整合性検証を通し、通常セーブへ保存する。Day移動は当日台帳を累計台帳へ加算してから、注文・日次台帳・進行フラグを初期化する。所持金/在庫/設備は保持する。
- 配布ビルドには開発状態エンドポイントを含めないため、Debug Menuは表示されない。

## ドメイン状態の不変条件（v0.2）
- queued最大3、cooking最大1。受付時は在庫と消費原価を**同じ操作で**更新。材料の予約だけで宙に浮かせない。
- queuedのみ忍耐値減算。営業時間0でも残注文処理を継続し、新規来客生成を止める。REACTION表示中はゲーム時計停止。
- 注文ID単位で ACCEPT_ORDER/SERVE/CANCEL_ORDER を冪等にし、同じIDの再実行を防ぐ。CLOSE_DAYもdayキーで冪等にする。
- saveはstageIndex/工程入力/activeOrderId/rngState/来客残数/固定費精算フラグを含め、店舗の全phaseから復元可能にする。
- IndexedDB内に完全な状態スナップショットとバックアップをトランザクション保存。書き込み失敗で元のセーブを消さない。
- 配合/注文/費用の確定値をスナップショット化し、セーブ復帰やデータ変更による過去の会計再計算を防ぐ。
- 終了後のUIに関係なくdomainのイベント適用は1回だけとする。

## v0.4 ドメイン境界と検証
ドメイン時刻・来客スケジュールは[12](12_MVP_SIMULATION_SPEC.md)、調理入力は[14](14_COOKING_INPUT_CONTRACT.md)、GameSave契約は[16](16_SAVE_DATA_AND_BALANCE.md)、画面操作は[13](13_SCREEN_INTERACTION_SPEC.md)。店舗/調理/会計はUIの画像・画風から独立した純粋計算とする。設定画面はプレイセーブとは独立した永続キーを用い、設定変更で日次計算を再実行しない。

## v0.5 実装時のコマンドプロトコル
ドメインの正規順序は[20](20_EVENT_STATE_PROTOCOL.md)。1tick中の期限切れ→来店→入力コマンド→閉店判定。すべてのUI操作にcommandIdを持たせ、適用済みcommandIdをセーブしてリロード後の重複効果を排除。IndexedDBのmain/backupは原子的transactionで扱う。JSON Schemaは静的検査、相互状態の不変条件はドメイン側で検査する。
