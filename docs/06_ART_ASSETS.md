# 06. アートディレクション・アセット仕様・ComfyUI

## 表現の方向
- 温かい商店街と小さな食堂、食欲を誘う料理、表情豊かなオリジナルのアニメ調キャラクター。
- 食べる瞬間は「料理の迫力」と「キャラクターの反応」を最優先。
- 店舗は2D見下ろし/斜め俯瞰の背景、調理はクローズアップ、会話は大きめの立ち絵。
- 料理は伝統的構成（ご飯・カツ・濃厚なたれ・茹でキャベツ）を見て判別できること。
- 過度に実写寄りなキャラと料理イラストが混在しないよう、ルックを統一。

## 画像の共通規格
| 分類 | マスター解像度 | 出力 | 基準 |
| --- | --- | --- | --- |
| 背景（タイトル/店舗/厨房） | 2560×1440 | PNG/JPEG | 16:9、文字を入れない |
| キャラ立ち絵 | 1536×2048以上 | PNG RGBA | 足/頭/手を切らず、透明背景 |
| キャラ表情・上半身差分 | 1024×1024以上 | PNG RGBA | 顔・肩位置を統一 |
| 完成料理・皿全体 | 1024×1024以上 | PNG RGBA | 真上/斜め上の角度を統一 |
| 調理中素材 | 1024×1024 | PNG RGBA | P1〜P6の作業台と整合 |
| UIアイコン | 256×256 | SVGまたはPNG RGBA | 余白・線幅を共通化 |
| ボタン/パネル | 9-slice可能な素材 | PNG RGBA/SVG | 角・影の厚みを共通化 |
| エフェクト | 512×512/1024×1024 | PNG RGBA/シート | 湯気・キラキラ・光など |
| 小物・店内什器 | 512〜1024px | PNG RGBA | 画角・影方向を統一 |

元画像と実行時リサイズ画像は別管理。縦横比の変更はしない。基準アンカー、透明余白、スケールを個々のアセットのmanifestに記載する。

## UIデザイントークン
UIの基準色・書体は `src/styles.css` の `:root` を単一の定義元とする。画面別CSSは既存の互換alias（`--red`、`--gold`、`--cream` 等）または意味名を参照し、同じ意味の値を画面ごとに再定義しない。

| 意味 | CSSトークン | 値 | 用途 |
| --- | --- | --- | --- |
| 主色 | `--brand-red` | `#9b2a24` | 主ボタン、見出し、選択状態 |
| 主色・濃 | `--brand-red-deep` | `#6a1814` | 濃色面、見出し文字、影 |
| 主色・明 | `--brand-red-light` | `#c8423a` | グラデーション上端 |
| 金縁 | `--accent-gold` | `#d9a441` | 枠線、選択強調 |
| 金縁影 | `--accent-gold-shadow` | `#a8752a` | ボタン下縁 |
| クリーム面 | `--surface-cream` | `#fff8ea` | カード/入力面 |
| 暖色面 | `--surface-cream-warm` | `#f6e7c8` | 面のグラデーション下端 |
| 半透明クリーム面 | `--surface-cream-overlay` / `--surface-cream-overlay-strong` / `--surface-cream-overlay-soft` | `#fff8eae6` / `#fff8eaee` / `#fff8eacc` | 背景に重ねる説明・情報面（約90/93/80%不透明） |
| 本文色 | `--text-ink` | `#4a2a20` | 本文・数値 |
| 補助文字 | `--text-muted` | `#7a5a48` | 説明・補助ラベル |
| 成功 | `--state-success` | `#3d702d` | 成功・増加表示 |
| 注意 | `--state-warning` | `#865800` | 中立/注意評価 |
| 危険 | `--state-danger` | `#b3261e` | 損失・危険表示 |
| キーボードフォーカス | `--focus-ring` | `#7b5cff` | `:focus-visible` の輪郭 |
| UI書体 | `--font-ui` | M PLUS Rounded 1c優先、日本語システム書体をfallback | 本文と操作部品 |
| 見出し書体 | `--font-display` | Dela Gothic One優先、UI書体をfallback | ステージ版のロゴ/大見出し |

パネル枠は `public/assets/game/ui/panels/v03/cream_panel_frame_v03.svg` の96×96 SVGを9-sliceで使う。カードの枠幅は8px、元SVGの角/辺を24相当で切り出し、繰り返し伸縮する。ボタン状態はCSSで描画し、通常=クリーム/金縁、hover=明度上昇、active=2px押し込み、focus-visible=3pxのフォーカス輪郭、disabled=50% opacityとする。文字入りのボタン画像は作らない。

UIの操作記号は `src/icons.mjs` の24×24 `viewBox` のインラインSVGで統一する。絵文字・記号を描画層で置換し、メニュー/情報/再試行/再生/戻る/展開/チェック/評価星もOSの絵文字フォントへ依存させない。ゲーム内のアクセシブル名と画面テキストは置換せずに保持する。キャラクター・料理以外のラスタ画像をUI記号として重複生成しない。

## 必須キャラ（MVP）
- 主人公（プレイヤーの店主、顔を映す場合はオリジナルデザイン）
- 近所の常連
- 学生
- 会社員
- 観光客

客4人×評価6ランク=最低24の表情/リアクション素材。ただしMVP前半は共通ポーズ＋顔差分で代替可能。正式版ではSSS/Sで大きなポーズ差分を作り、C/Fは表現を抑える。

### キャラクター制作の制約
- キャラクター参照シート: 正面全身、顔正面、左右、色パレット、髪/服のディテール。
- 名前・人物像・服装・髪・身長感を各キャラごとに固定。
- 生成時の画角・構図・ポーズは変えても顔の構造・衣服の意匠・アクセサリーを保持。
- 手指崩れ/顔違い/左右反転/アクセ欠落/切れは不合格。
- 既存の版権キャラや加古川観光協会のPRキャラクターは、明示的な使用許諾なしにゲームへ使用しない。

## 料理アセット制作の制約
- 基準となる**ビーフかつめし完成形**を先に確定する。
- 皿、米、カツ、キャベツ、たれは位置合わせ用マスター座標を共有する。
- たれの量や色差分を作る場合は、皿/米/カツの位置、皿の向き、影の基準を動かさない。
- 調理中の各工程は「完成皿とは違う作業用素材」として別セットで統一する。
- 油・衣・たれは自然なレイヤー順を保ち、浮遊・皿からのはみ出し・切断を画像比較で検査。
- 料理写真など他人の著作物を生成素材としてそのまま再配布せず、参考資料と成果物を分離する。

## アセットID/ディレクトリ
    assets/
      source/                  # 生成元、参照用の元データ、workflow JSON
      characters/{character_id}/
        full/
        expressions/
        poses/
      food/{recipe_id}/
        canonical/
        variants/
        stages/
      background/
      ui/
      effects/
      audio/
      manifest.json

命名例:
- char_regular_full_front_v001.png
- char_student_reaction_sss_v001.png
- food_beef_katsumeshi_final_canonical_v001.png
- food_beef_katsumeshi_sauce_rich_v001.png
- bg_shop_day_v001.png

必須manifestメタデータ: id, path, type, width, height, anchorX, anchorY, scaleHint, tags, status, sourceWorkflow, generationSeed, model, loraList, licenseNote, reviewedAt。

## 既存ComfyUIキャラクター候補の生成記録
2026-11-23にユーザー環境の既存 `output/town_game` PNGメタデータを読み取り、店主LoRA・画風LoRA・checkpoint・seed等を確認した。既存キャラクター候補の生成条件は `assets/source/comfyui/presets.json`、`jobs.json`、各manifestに記録済み。元画像の服装は模倣していない。現在、ComfyUIへのジョブ投入はキャラクターを含めすべて停止中であり、この節は過去素材の由来記録に限る。`scripts/comfy_generate.py` もジョブ投入を拒否する。今後の非キャラクター画像制作ではChatGPT画像生成を使う。（2026-11-24 更新：ユーザーの指示により、配膳画面の素材 `public/assets/game/serving/v01/` に限りComfyUI生成を許可。店員SDは Anima-Base＋Koharu LoRA＋anima-style LoRA、客と料理人は Anima-Base＋anima-style LoRA、店内背景は Qwen-Image＋ControlNet。manifest の `comfyUserApproved: true` でビルド確認を通す。）候補は権利・デザイン・画面合成の審査が終わるまで未承認。

- 既存PNGの埋め込みworkflowと生成パラメータを棚卸しし、checkpoint、LoRA、強度、seed、解像度をキャラクターmanifestへ記録済み。
- 完成かつめしの新規制作はユーザー指示により保留。ユーザー提供の実物写真切り抜きを暫定使用し、たれ外観差分も保留。
- 背景/小物はChatGPT生成済み候補を画面合成してレビューする。タイトル/結果の解像度不足候補は要改善。
- 透過、切れ、人物/皿の整合性、ライセンスを確認し、採用済み素材だけをリリース対象にする。

## アセット受け入れチェック
- 用途・ID・座標・サイズ・透明度・背景の正しさ
- アニメ/イラストの画風の一貫性
- 調理工程の形状や皿上の位置がつながる
- 料理は見ただけで基本のかつめしと分かる
- 表情ランクが連続して強弱を示す（SSSは最大、Fは最小）
- 同じ画面で複数素材を重ねても不自然な遠近・影・縮尺が生じない
- 個別レビュー時にはサムネイル一覧＋ゲーム画面上での合成検査を行う

## ChatGPT生成 食材候補 v03（2026-11-22）
- `public/assets/game/food/v03/manifest.json` に牛肉・ご飯・パン粉・煮キャベツ・デミグラスソース、衣付きカツ・揚げカツの7素材を登録。生成PNGマスターと使用プロンプトは `assets/source/imagegen/v03/ingredients/` と `assets/source/imagegen/v03/prompts.json` に保存。
- 食材在庫画面のアイコンとP1〜P6の工程見本にv03素材を接続。工程見本では完成皿を使わず、ご飯など個別の食材を表示する。完成かつめし画像・キャラクターはこのセットに含めない。
- 設備画面用にフライヤー・椅子の単体アイコンも生成し、`public/assets/game/equipment/v03/manifest.json` に登録。購入カードへ接続し、PNGマスターとプロンプトは同じv03ソース配下に保存。
- 演出用に湯気・揚げ油の気泡・金色のきらめきを作成し、`public/assets/game/effects/v03/manifest.json` に登録。P3/P5の調理中とSSS評価へ接続。
- Day7の節目用に夕暮れの店外背景を作成し、`public/assets/game/backgrounds/v03/manifest.json` に登録。Day7のRESULT/UPGRADEで使う。

- 調理工程P1肉たたき・P2パン粉トレイ・P4ソースレードル・P5キャベツ鍋・P6しゃもじの補助アイコンを作成し、`public/assets/game/cooking/v03/tools/manifest.json` に登録。各工程の食材イメージ上に道具アイコンを重ねて表示。P3は既存の揚げ画面のイメージを使う。
- 2026-11-23: P3の旧写実CG画像を、ChatGPT画像生成の手描き2D工程画像 `public/assets/game/cooking/v07/fry_stage_anime_chatgpt_v02.png` に差し替え。原本と生成条件は `assets/source/imagegen/chatgpt/v07/cooking/` に記録。ユーザー指示に従い、非キャラクター画像の生成にComfyUIは使用しない。候補レビューと権利確認は未完。
- クリーム色・金縁の9-slice UIパネル枠をSVGで作成し、`public/assets/game/ui/panels/v03/manifest.json` に登録。カードへ適用済み。ボタンの通常・hover・押下・focus・disabledは既存CSSで描画し、文字入りボタン画像は作らない。
- 評価用の透過ランク枠6種（SSS/S/A/B/C/F）を生成し、`public/assets/game/ui/ranks/v03/manifest.json` に登録。PNG原本とプロンプトは `assets/source/imagegen/v03/ranks/` と `prompts.json` に保存。試食・調理評価のランク文字の背面に表示し、文字自体はHTMLで重ねる。状態は `concept_review`。
- ステータスは `concept_review`。透明背景を保持したPNG/WebPであることと全体表示を確認したが、ゲーム内縮小表示の見え方や最終採用はレビュー待ち。

## 合成とアセット検査（v0.2）
- 代表完成形の皿/料理をcanonicalマスターとし、0〜1正規化座標でアンカーを管理。元画像をcropして位置を合わせる方式は採用しない。
- 描画順は **皿・影→ご飯→カツ→たれ→茹でキャベツ→湯気・ハイライト** を基準とする。重なりが不自然な部品にはマスクを導入する。
- たれ差分は皿の輪郭、中心、影、米・カツの配置を固定。皿中心の差は2%以内を暫定許容目標とする。
- 反応ランク差分は顔中心・肩位置を揃え、SSSの大胆なポーズでも顔の同一性と手の自然さを確認。
- 調理・店舗・試食の3つの実画面に合成して最終レビュー。アセット単品で問題がなくても画面上で位置ズレや浮遊があれば差し戻す。
- manifestにstatus（draft/reviewed/approved/rejected）とanchorX/Y（0〜1）、sourceWorkflow、licenseNoteを必須として、承認済み素材だけゲームに入れる。
- 当初この節の作成時点ではComfyUI接続と既存PNGのメタデータ確認は未実施だった。2026-11-23に実施し、キャラクター生成情報をmanifestへ記録。非キャラクターはChatGPT画像生成を使用し、ComfyUI生成スクリプトをキャラクター専用に制限した。

## v0.4の主人公デザインと正式素材の扱い
ユーザー指定キャラクター（銀髪の双お団子・ピンク瞳/ヘアピン）を主役/店主役とする。参照画像のデニム服装は再利用しない。評価ランクに応じる顧客4人の感情差分が必要。詳細は[15](15_NARRATIVE_CHARACTER_AUDIO.md)と[17](17_ASSET_PRODUCTION_PLAN.md)。v0.3の高解像度8枚はGitHub登録済みだがランタイムの背景・UI・人物を分離した完成アセットではない。

## 2026-11-23 実装状況の追記
- キャラクター候補はComfyUI＋LoRAで生成し、衣装は参照画像から変更。生成情報をmanifestへ記録した。候補段階であり承認済みではない。
- 朝準備・店舗・厨房背景のComfyUI候補は以前プレビュー接続したが、非キャラクターComfyUI生成を禁止するユーザー指示を受けて参照解除し、ChatGPT生成背景へ戻した。タイトル/結果の高解像度背景、完成料理の新規制作、たれ差分、最終画面レビューとライセンス確認は未完。詳細は `docs/25_ASSET_REQUIREMENTS_AUDIT.md` を参照。
- 2026-11-23: ChatGPT画像生成で食材・工程アイコン7点を作成し、在庫画面と工程見本へ候補接続。完成皿は含まない。原本シートと各PNGは `assets/source/imagegen/chatgpt/v06/food/`、256×256px実行WebPとmanifestは `public/assets/game/food/v06/`。画面合成、採用、ライセンスはレビュー待ち。

- 2026-11-23: 仕様17 §2/§3の試食・反応画面用に、ChatGPT画像生成で人物・料理・文字のない店内ぼかし背景候補 `tasting_interior_chatgpt_v01` を制作し、画面へ接続。原本は `assets/source/imagegen/chatgpt/v06/backgrounds/`、実行WebPは `public/assets/game/backgrounds/v06/`。1672×941のconcept_review候補であり、仕様17 §5原寸基準と最終合成は未完。

- 2026-11-23: 朝準備/営業/厨房/試食/結果の背景をChatGPT画像生成で2D手描きセル塗り調へ統一したv07候補に差し替え。生成原本・promptは `assets/source/imagegen/chatgpt/v07/backgrounds/`、実行用は `public/assets/game/backgrounds/v07/`、一覧は `artifacts/backgrounds_chatgpt_review_v07.jpg`。1672×941で原寸基準に未達、concept_review。

- 2026-11-23: フライヤー・椅子・調理道具5種をChatGPT画像生成の手描き2D透明アイコンv07へ更新。ComfyUIは使用していない。原本/プロンプトは `assets/source/imagegen/chatgpt/v07/`、実行用WebPとmanifestは `public/assets/game/equipment/v07/`・`public/assets/game/cooking/v07/tools/`。すべて1024×1024のconcept_review候補。
- 2026-11-23: SHOP画面の店主・中央UI・右側客席の位置に合わせたChatGPT生成2D背景候補v10を制作し、プレビュー実行へ接続。原本は1672×941で原寸要件2560×1440を満たさず、拡大実行画像もconcept_reviewであり正式採用ではない。仕様の画面配置を背景構図へ反映し、原寸品質/実画面合成/権利確認は引き続き必要。ComfyUIは使用していない。
