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
ユーザーのローカルComfyUI（http://127.0.0.1:8189/）と既存output/town_game画像の生成情報を後で確認する想定。**この仕様策定時点ではローカルComfyUI・Windowsフォルダにアクセスしていない。** 既存PNGのWorkflow/Promptメタデータ、チェックポイント・LoRA設定の取り込みは別タスクとする。

1. 既存PNGの埋め込みworkflow/生成パラメータを読み取り、checkpoint、LoRA、強度、seed、解像度を棚卸し。
2. 採用できる設定を presets/character.json / presets/food.json / presets/background.json に記録。
3. キャラの参照絵・スタイル資料を揃え、まずキャラ1体×SSS/S/A/B/C/F差分を出す。
4. ビーフかつめしの完成形1枚を確定し、プレート・たれ量・光源・カメラを固定して差分を作る。
5. 背景/小物を制作し、ブラウザの実表示サイズでレビュー。
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

## 合成とアセット検査（v0.2）
- 代表完成形の皿/料理をcanonicalマスターとし、0〜1正規化座標でアンカーを管理。元画像をcropして位置を合わせる方式は採用しない。
- 描画順は **皿・影→ご飯→カツ→たれ→茹でキャベツ→湯気・ハイライト** を基準とする。重なりが不自然な部品にはマスクを導入する。
- たれ差分は皿の輪郭、中心、影、米・カツの配置を固定。皿中心の差は2%以内を暫定許容目標とする。
- 反応ランク差分は顔中心・肩位置を揃え、SSSの大胆なポーズでも顔の同一性と手の自然さを確認。
- 調理・店舗・試食の3つの実画面に合成して最終レビュー。アセット単品で問題がなくても画面上で位置ズレや浮遊があれば差し戻す。
- manifestにstatus（draft/reviewed/approved/rejected）とanchorX/Y（0〜1）、sourceWorkflow、licenseNoteを必須として、承認済み素材だけゲームに入れる。
- ローカルComfyUIへの接続や既存PNGのLoRAメタデータ読み取りは**未実施**。本書は生成手順の仕様であり生成済みの主張ではない。
