# 24. 初期操作プロトタイプ実装状況（2026-11-23）

## 実装の目的
現行設計のv0.5を、まず操作可能なブラウザ画面と独立したゲームコアとして試す。**実装形式は依存不要のJavaScript ES Modules**。企画の推奨構成（Vite/React/PixiJS）と異なるのは、初期検証とセットアップの単純さを優先するため。完成版のフレームワーク選定は未確定。

## 登録したファイル
| パス | 内容 |
| --- | --- |
| `index.html` | エントリー画面 |
| `src/domain.mjs` | 状態機械、来客、調理採点、会計、購入・設備、翌日進行 |
| `src/main.mjs` | 画面表示とクリック操作、IndexedDB保存/復元、タイマー |
| `src/styles.css` | 和食堂風の画面、PC幅とスマホ幅の仮レスポンシブ |
| `scripts/dev-server.mjs` | Node標準HTTPサーバー（localhost限定） |
| `scripts/build.mjs` | 配布素材ゲートとプレビュー/リリースビルド |
| `tests/domain.test.mjs` | Node標準テスト（8ケース） |
| `spec/mvp_save.schema.json` | 調理タイマー中断フラグを追加 |
| `package.json` | npm run dev / npm test / npm run build / npm run build:preview |

## 仕様に対して動く初期機能
- Day1: 固定順の8注文を1件ずつ発行。初回提供までキャンセル拒否。時間無制限。
- 通常日: 600秒、評判に応じて候補10〜14、固定時刻来店、queued3件まで・cooking1件。満員逸失と期限切れ。
- 料理: P1肉の3点クリック、P2衣の3区画塗り、P3揚げタイマー、P4たれプリセット、P5茹でタイマー、P6盛り付け4部品。
- 評価: 工程得点＋たれ嗜好補正、SSS/S/A/B/C/F、売上/評判を提供時に確定。
- 接客: 4タイプそれぞれの注文ヒント2件と、6ランク分のリアクション台詞を `spec/customer_dialogue_ja.json` で管理。
- 設定: タイトル/ポーズからBGM・効果音の個別音量、画面揺れ軽減、文字送り速度（即時/普通/ゆっくり）、文字送り/演出スキップを変更。設定はlocalStorageへ保存。Web AudioでWAV音声アセットの画面別ループBGM、操作/購入/提供/ランク/エラー音、揚げ工程中ループを再生。
- チュートリアル: T01〜T12の進行をDay1/Day2状態と連動。段階別の操作をスポットライトで案内し、進行をセーブ。初回完了後は再プレイ時にスキップを表示。旧セーブには移行時に進行値を補完。
- 物語: Day1〜7の必須会話を `spec/story_events_ja.json` で管理。朝または営業結果に表示し、既読IDと表示中IDを保存。チュートリアル中は案内内に会話を組み合わせ、優先順位を保つ。
- 経営: 5食材仕入れ、補填型の無料支援、フライヤー/椅子、Day1→Day2以降、日次/累計帳簿。
- 保存: IndexedDB main/backup（同じtransactionで更新）。初回の有効なsnapshotはmain/backup両方へ保存し、以降は直前の有効mainをbackupに残す。手動保存して終了、重要操作後の自動保存、調理中の定期保存、復元時PAUSE。保存終了中は二重操作を抑止し、書込不可を検出した環境では新規開始前に警告する。保存失敗時はタイトルへ遷移しない。
- TITLEの仕様差分を補正: Web版の「ゲーム終了」ボタンを除き、クレジットをモーダル表示。ComfyUI＋LoRAのキャラクター制作、生成素材、音源、ユーザー提供料理画像と、採用/権利確認が未完で試作専用であることを明示。起動時は「はじめから」へ初期フォーカス。EscapeとTabのフォーカス循環に対応。
- Day7 RESULTに累計売上・累計営業利益・累計提供数をcareerLedger+dailyLedgerで表示。表示だけの集計で台帳更新なし。
- SERVEでP1〜P6得点、基礎品質、たれ補正、最終点、ランクを`qualityBreakdown`に保存し、セーブ検証で点数・補正・ランクの整合を確認。REACTION結果に内訳を表示。旧セーブの内訳なし注文はnullで移行。
- 会話イベント表示中はTICKで営業/調理時間を進めず、Escapeは会話確認（未読本文を先に全文表示）として処理。ブラウザfocus喪失時にPAUSEダイアログを重ねず、会話をそのまま保持。
- OPENでは最古の待機注文に枠強調と「最古の注文」ラベルを付け、他の注文の受付選択は引き続き可能。
- P6の皿プレビューは配置先ごとに実際の部品アイコンを表示し、正しい配置に✓、誤配置に赤い×を付ける。
- MORNINGのたれ欄で、未登録カスタム枠を点線表示し「未登録・朝に保存できます」と明示。
- REACTIONをintro→customerReaction→resultVisibleの保存可能な3段階にし、段階送り/スキップを追加し、通常時は合計約2.6秒で結果表示まで自動進行。売上・評判はSERVE時に一度だけ確定し、旧セーブのREACTIONは結果表示段階へ移行。
- RESULTからの直接「次の日へ」を削除。翌日へ進む前に必ずUPGRADE画面を通る経路に統一。
- COOKの注文カードに「調理中」状態を追加し、受付後に作業中の注文であることを明示。
- OPENの不足材料案内に具体名を追加: 注文カードの受付ボタンと画面内メッセージに不足中の材料名を表示。
- 入力/UI補正: 設定画面/遊び方画面はEscで戻り、R・P1・P2の長押し反復入力を抑止する。入力欄編集中のRキーは調理再試行に使わない。PAUSE・タブ非表示・ウィンドウblur時に未確定のP2ドラッグ/長押し入力を破棄して一時停止を保存し、フォーカス復帰では自動再開しない。たれ保存先のchangeイベントを一本化し、未保存の配合を破棄して開店する時は確認する。ロード/翌日開始時は保存済みのカスタム1を編集プレビューへ復元する。仕入れ・注文受付・設備購入・セーブ続行の無効状態には理由を表示する。

## 現段階の計算検証
ソース文字列をGitHubに登録する前にJavaScript検証環境で8つのケースを実行し、**8件すべてPASS**：
1. 初回注文のキャンセル制限
2. Day1固定8注文→営業利益2,200円、閉店時現金35,640円、食材2食分
3. たれ補正/評価閾値
4. commandId重複防止
5. Day1閉店後のフライヤー購入とDay2への元帳繰入
6. 支援は不足品のみ最低4食分、同日再支給拒否
7. 通常日11来客候補、ポーズで時計停止
8. 旧営業日コマンド拒否

`npm run build` は実行時に必要な素材すべてが承認済みで、ライセンス記録が明確な場合だけ `dist/` に配布物を作る。`npm run build:preview` はレビュー候補を含むローカル確認用ビルドを `dist-preview/` に作る。出荷ゲートが失敗した場合、古い `dist/` も削除する。

**Node.jsでの `npm test` 実行とブラウザE2Eはまだ未実施**。ブラウザで動いたことを主張するものではない。登録後の実機確認が必要。

## 仕様との差分・既知の制限
- 店主と顧客4タイプ×6ランクのランタイム参照先はComfyUI＋LoRAのv05へ切替済み。店主は表情6種と店舗服/私服の全身2枚、顧客は24枚。原本PNG・BirefNetマスクはComfyUI outputに保持し、透過WebPは `public/assets/game/characters/**/v05/`、LoRA/seed/source記録は `public/assets/game/characters/v05/manifest.json` に保存。店主のKoharu LoRAと画風LoRA、顧客の画風LoRAを使用し、参考画像の白シャツ＋デニム服は負例指定して別衣装にした。画像はすべて `concept_review` で、最終採用判定とゲーム画面での合成確認は未了。ChatGPT生成版は比較用候補として残す。
- 仕様17 §3の店主リファレンス候補を追加。ComfyUI＋店主LoRA/画風LoRAで顔・髪・ヘアピンの拡大、店舗服正面、背面/横、私服を生成し、色メモ付きレビュー板へ構成。原本と再現条件は `assets/source/comfyui/references/manifest.json` に記録済み。レビュー候補でランタイム未投入、承認前。
- 料理（かつめし）の生成画像は不採用。代わりにユーザー提供画像2枚（`assets/source/food/`）をbirefnetで切り抜き、`public/assets/game/food/beef_katsumeshi/whole.webp`（使用中）・`sliced.webp`（予備、右端が元画像で切れている）として登録。皿はCSSで描画し、タイトル・注文カード・完成時・試食評価に表示。ランク別の不正確なAI生成皿は現行画面とプレビュー配布対象から除外し、すべてwhole素材へ統一。盛り付け工程の部品表示は絵文字のまま。利用権の確認が必要。食材・設備アイコンも絵文字。
- 先行版ではタイトル、朝準備、営業、P3揚げ、結果の5背景をChatGPT画像生成で作成した。現行では朝準備/営業/P3厨房だけComfyUI＋anima-style LoRAの候補に切替済み。タイトル/結果は既存候補を維持。原本PNGとプロンプトは `assets/source/imagegen/chatgpt/v04/backgrounds/` と `prompts.json`、実行用WebPと台帳は `public/assets/game/backgrounds/v04/manifest.json` に保存。生成原本は1672×941、実行用は2560×1440へ拡大変換しているため、原本は `docs/06` のネイティブ解像度基準を満たさない。候補状態は `concept_review`。ゲーム画面の合成レビューは未実施。
- 背景の朝準備/営業/P3厨房をComfyUI＋anima-style LoRAの2560×1440原本へ切替。マスターPNG、再現ジョブ、LoRA/seed記録は `assets/source/comfyui/backgrounds/`、ランタイムWebPとreview manifestは `public/assets/game/backgrounds/v05/`。全て `concept_review` で最終採用・合成レビューは未了。タイトル/結果は既存候補を維持。
- GitHub登録済みの画面モックをボタン付き一枚絵として転用していない。
- P2は30セルの被覆状態を描画し、ドラッグ中に通過したセルを一括確定する。ストロークはpointerupで確定し、pointercancel/領域外pointerupでは破棄する。クリックは1セル、キーボードEnter/Spaceは0.6秒長押しで区画をまとめ塗りする。
- セーブ読み込み/書き込み時に `spec/mvp_save.schema.json` の構造を検査し、注文状態・調理中注文・日次台帳・現金残高の相互整合を追加検査する。mainが不正でbackupが有効な場合は復旧確認を出し、不正なmainをbackupへ上書きしない。
- P1は画面内クリックのx比率で採点。P6は4部品から任意に選択して置き場を選ぶ。クリック選択→置き場クリック、または部品ドラッグ→置き場ドロップに対応。キーボードでは部品選択後に置き場へフォーカスを移す。誤配置は0点で記録して次の部品へ進み、選択中の部品もセーブ対象。
- Day7の結末テキストを評判30/60/80の段階で切替。累計提供数と売上を会話へ埋め込み、低評判時も立て直しを促す内容にした。
- タイマー/DOMは100ms単位で表示を更新。性能計測と描画負荷の最適化は未実施。
- 日本語台詞の一部（顧客ヒント・評価24件）は外部JSON化済み。画面全体のtextKey化と複数言語対応は未対応。
- BGM4曲・SE11種のオリジナル合成WAVを `public/assets/game/audio/` に作成し、Web Audioのバッファ再生へ接続。マスター/設計は `assets/source/audio/v03/` と `scripts/generate_audio_assets.py`。statusは `concept_review` で、聴取・音量・ミックスの最終確認は未実施。
- IndexedDBのランタイム検証とmain/backup復旧確認を実装した。DB障害・ブラウザ終了を含む実機での耐障害性確認は未実施。
- ゲーム内の調理秒数は短縮した演出であり、実際の食品調理の安全基準ではない。
- Windows/モバイル/実機での操作結果や60fpsの到達は未確認。

## 次の開発優先順位
1. セーブ復旧・ブラウザ入力境界・複数画面のレイアウトなど、`docs/23_QA_RELEASE_CONTRACT.md` に記載した残りの受け入れ項目を実装・記録する。
2. 保存の中断復帰・入力境界・乱数・試食演出の連打試験を増やし、リリースブロッカーを潰す。
3. チュートリアル操作誘導と画面マスクを実画面で確認し、フォーム・UIフォーカスも含めて操作を整える。
4. 既存モックのデザインを分割アセットへ移し、ユーザー指定店主の正式立ち絵と顧客評価差分を統合。
5. 音・イベント会話・Day7演出の完成度、ゲームバランスの100seed検証。
6. 実画面の再現性と保守性が確保できた段階でReact/PixiJS等への移行の必要性を判断。

## 生成アセット（2026-11-22）
- 音響素材: docs/15 §7に基づき、オリジナルのループBGM4曲（title/shop/cooking/result）とSE11種（click/purchase/fry/serve/各ランク5段階/error）をWAVで作成。Web Audioで音量設定を維持して再生し、P3中のfryだけloop再生。manifestは `public/assets/game/audio/manifest.json`、生成仕様は `assets/source/audio/v03/design.json`。聴取レビュー待ち。
- ChatGPT画像生成で食材・調理状態7点（生牛肉、炊いた米、パン粉、煮キャベツ、デミグラスソース、衣付きカツ、揚げカツ）、調理道具5点（肉たたき、パン粉トレイ、ソースレードル、キャベツ鍋、しゃもじ）、設備2点（フライヤー、椅子）、演出3点（湯気、油はね、金色のきらめき）、Day7用背景1点を制作。ランク表示用のSSS/S/A/B/C/Fバッジ6点も生成し、試食・調理評価画面へ接続。画像は文字なしで、ランク文字はHTML重ね表示。透過PNGマスターは `assets/source/imagegen/v03/`、実行用WebPは `public/assets/game/food/v03/`、`equipment/v03/`、`effects/v03/`、`backgrounds/v03/`、道具旧候補は `assets/source/imagegen/v03/tools/`、現行のComfyUI＋LoRA候補WebPは `public/assets/game/cooking/v04/tools/`（`concept_review`）、`ui/ranks/v03/`、`ui/panels/v03/`、プロンプトとレビュー状態は各manifestに保存。9-sliceカード枠はSVGで作成し、カードへ適用。ボタン状態（通常/hover/押下/focus/disabled）はCSSで描画。在庫画面アイコン、P1〜P6の工程見本（P1/P2/P4/P5/P6に道具アイコン付き）、設備購入カード、P3/P5の調理中、SSS評価、Day7のRESULT/UPGRADE背景に接続済み。完成皿とキャラクターは今回の生成対象に含めていない。
- 生成手順: `assets/source/comfyui/presets.json`（モデル/LoRA/サンプラー）、`jobs.json`（プロンプト・seed）、`scripts/comfy_generate.py <set>` でローカルComfyUI（127.0.0.1:8189）へ投入。
- 店主の設定はComfyUI `output/town_game` の koharu_rikka 生成画像PNGメタデータから取得: Anima-Base-v1.0 / qwen_3_06b_base / qwen_image_vae、LoRA `Koharu-Koharu-epoch100` 0.8 → `anima-style-epoch35-lr5e5` 0.8、euler/simple 24step CFG4.5。**元画像の白シャツ＋デニムオーバーオールは使わず**、クリーム色ブラウス＋深紅エプロン（店舗服）、ピンクのカーディガン（私服）に変更。
- 顧客4人は店主LoRAを外し、画風LoRAのみで生成（旧 `town_game_specs` の学生は店主LoRAが混入して店主と同じ顔だったため不採用）。各客はseed固定で6ランクの表情差分。
- 採用リストは `assets/source/comfyui/selection.json`、`python -I scripts/export_assets.py` でマスクをアルファ化・WebP化・生成メタデータ除去し、`public/assets/game/manifest.json` を出力。
- 画面はv03モックアップ（docs/11）の構図に合わせてHTML/CSSで再構成: 赤いHUD帯（ロゴ・画面名・Day/資金/評判★）、背景を全面表示、金縁クリーム色パネル、左下に店主の立ち絵と吹き出し、深紅の主ボタン。調理はP1〜P6タブ・注文情報・中央作業台（まな板/揚げ鍋/茹で鍋/たれカード/盛り付け皿）・右にタイミングゲージ。試食は背景ぼかし＋客のランク別表情＋評価エンブレム＋吹き出し。結果は営業利益行を強調した帳簿・評判★・お客さんの声。文字は画像に焼き込まず、フォントはZen Maru Gothic（Google Fonts、未取得時はシステムフォント）。
- モデル/LoRAのライセンス確認は未了。全アセット draft のまま公開しない。

## 変更管理
現段階は「初期Webゲームプロトタイプ」。仕様v0.5の完全実装ではない。実機テストのログと画面キャプチャが残るまではMVP完了としない。
