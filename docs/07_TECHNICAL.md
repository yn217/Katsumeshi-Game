# 07. 技術仕様・実装アーキテクチャ

## 推奨MVPスタック（提案）
- Vite + TypeScript（strict）
- React（HUD、メニュー、モーダル、会話UI）
- PixiJS（店舗・調理・料理の2D描画、演出）
- Web Audio API（SE/BGM。初回ユーザー操作後に再生）
- IndexedDB（セーブ。小規模ならlocalStorageでも可だが破損対策・バージョン移行を優先）
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
- GameClockはdeltaSecondsを受け取り、ブラウザのフレームレートに依存しない経過時間を計上。
- requestAnimationFrameは描画用。調理や顧客の待ち時間などのロジックは固定ステップ（例: 1/30秒）の更新が望ましい。
- タブ非アクティブ時は自動一時停止し、復帰後に大量の経過時間を一度に進めない。
- 乱数はseedベース、客生成やイベントはseedとゲーム内Dayから再現できるようにする。
- アニメーション用乱数をゲームバランス用乱数と分離する。

## ステートマシン/トランザクション
| アクション | 前提 | 副作用 |
| --- | --- | --- |
| START_DAY | MORNING | 時計初期化 |
| PURCHASE | MORNINGかUPGRADE、支払可能 | 現金↓、在庫または設備↑ |
| OPEN_SHOP | MORNING | OPEN、注文発生開始 |
| ACCEPT_ORDER | OPEN、注文queued、食材十分 | 食材予約、注文cooking、COOK |
| COMPLETE_STAGE | COOK、現在工程に一致 | 検証済み工程スコア保存、次工程 |
| SERVE | COOK全工程完了、未精算 | score計算、会計、評判更新、REACTION |
| DISMISS_REACTION | REACTION | OPEN、注文完了を確定 |
| CLOSE_DAY | OPEN、終了条件成立 | RESULT、固定費処理、注文停止 |
| NEXT_DAY | RESULTから遷移 | 日付進行、MORNING |
| SAVE_QUIT | 任意の復元可能状態 | セーブ完了後タイトル |

各アクションはvalidate → apply → persist notificationを通す。同じactionId/orderIdの二重送信を無視。Reactの再レンダーやダブルクリックで二重精算しない。

## 性能とロード
- 目標: 1920×1080で描画60fps、操作反応100ms以内、一般的なPCでタイトル初期表示3秒以内（キャッシュ済みを想定）。
- 画像は画面単位で遅延ロードし、元解像度を無条件で描画しない。
- 大量の画像がある立ち絵・反応素材は必要な差分だけロード。
- ループごとのDOM全再構築は禁止。状態表示は更新箇所を絞る。
- 画像処理やAI推論をブラウザ側の本番ゲーム中に行わない。ComfyUIは事前アセット制作専用。

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
- npm install
- npm run dev
- npm run typecheck
- npm run lint
- npm run test
- npm run build
- npm run test:e2e

上記のコマンドは現時点では未実装であり、完成扱いにしない。
