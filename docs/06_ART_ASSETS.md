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

## ComfyUI制作ワークフロー
2026-11-23にユーザー環境のComfyUI `output/town_game` PNGメタデータを調査し、店主LoRAと画風LoRA、checkpoint、seed等を確認した。生成条件は `assets/source/comfyui/presets.json`、`jobs.json`、キャラクターmanifestに保存済み。キャラクター候補はComfyUI＋LoRAで制作し、元画像の服装は模倣していない。権利・デザイン・画面合成レビューは別途必要。

1. 既存PNGの埋め込みworkflow/生成パラメータを読み取り、checkpoint、LoRA、強度、seed、解像度を棚卸し。
2. 採用できる設定を presets/character.json / presets/food.json / presets/background.json に記録。
3. キャラの参照絵・スタイル資料を揃え、まずキャラ1体×SSS/S/A/B/C/F差分を出す。
4. ビーフかつめしの完成形はユーザー指示により現在の生成手法で新規制作しない。ユーザー提供の実物写真切り抜きを仮の全画面共通素材として使い、たれ差分も保留する。
5. 背景/小物は作成済み候補を画面合成してレビュー。タイトル/結果の解像度不足候補は要改善。
6. 異常検査（透過、切れ、手指、皿の整合性、ライセンス）後、確定アセットのみゲームへ組み込む。

### ComfyUIプロンプト方針
- キャラ: 個別の特徴定義と、別ファイルのシーン/表情/ポーズ指示を分離。シーンの記述に固有キャラ特徴を混ぜない。
- 表情例: 大喜び、目を輝かせる、満足の笑顔、自然な無表情、困った表情、落胆。
- 料理例: Japanese Kakogawa katsumeshi, flattened breaded beef cutlet on a bed of rice, glossy demi-glace style sauce, boiled cabbage, western-style plate, appetizing warm lighting。
- 固定条件: single plate, cohesive perspective, no lettering, no watermark, no floating food。
- ネガティブ条件: malformed hands, extra fingers, duplicate plates, inconsistent perspective, cropped plate, illegible text, unwanted toppings。
- 生成モデル/LoRAライセンス・配布条件を別表で追跡し、許諾範囲を超えて公開しない。

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
- ローカルComfyUIへの接続や既存PNGのLoRAメタデータ読み取りは**未実施**。本書は生成手順の仕様であり生成済みの主張ではない。

## v0.4の主人公デザインと正式素材の扱い
ユーザー指定キャラクター（銀髪の双お団子・ピンク瞳/ヘアピン）を主役/店主役とする。参照画像のデニム服装は再利用しない。評価ランクに応じる顧客4人の感情差分が必要。詳細は[15](15_NARRATIVE_CHARACTER_AUDIO.md)と[17](17_ASSET_PRODUCTION_PLAN.md)。v0.3の高解像度8枚はGitHub登録済みだがランタイムの背景・UI・人物を分離した完成アセットではない。

## 2026-11-23 実装状況の追記
- キャラクター候補はComfyUI＋LoRAで生成し、衣装は参照画像から変更。生成情報をmanifestへ記録した。候補段階であり承認済みではない。
- 朝準備・店舗・厨房背景はComfyUI＋画風LoRAの2560×1440候補へランタイム参照を切替。タイトル/結果背景、完成料理の新規制作、たれ差分、最終画面レビューとライセンス確認は未完。詳細は `docs/25_ASSET_REQUIREMENTS_AUDIT.md` を参照。
