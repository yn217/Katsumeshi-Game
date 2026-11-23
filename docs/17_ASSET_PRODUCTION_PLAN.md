# 17. アセット制作・切り出し・音演出の実装計画（v0.4）

docs/06_ART_ASSETS.md / docs/11_UI_MOCKUPS_V03.mdに基づく、原画からゲーム画面への制作規範。**高解像度モックアップ8枚は現在GitHubにある**が、画面ごとの部品アセットとしては未分離である。

## 1. 確定事項と暫定事項
- 確定: ユーザー指定の銀髪/薄紫、双お団子、ピンク瞳、ピンクヘアピンを使う。元画像の服装はコピーしない。
- 暫定: 店舗用の衣装はクリーム系ブラウス+深赤エプロン、リボン。画面により表情・ポーズ変更可、髪型と顔を保持。
- 制作規範の初版では未確認だったが、2026-11-23時点で `output/town_game` のPNGメタデータを調査済み。現行v05キャラクターのComfyUI workflow、モデル、LoRA、weight、seed、sampler、steps、CFGは `assets/source/comfyui/jobs.json` と `public/assets/game/characters/v05/manifest.json` に記録した（進捗は末尾の実施状況を参照）。**権利確認とデザイン承認は別途必要**。
- v0.3画像のロゴ/メニュー/料理はイメージでありゲームの最終アセットではない。画面を1枚の画像として表示し透明ボタンを乗せる実装は禁止（幅変更/セーブ表示に弱い）。

## 2. レイヤー分割単位
| 画面 | 背景レイヤー | キャラ/料理レイヤー | プログラムUI |
| --- | --- | --- | --- |
| タイトル | 店舗と河川景観 | 主人公（私服）、完成料理、装飾ロゴ | ニューゲーム/続き/設定等 |
| 朝の準備 | 店内の調理台背景 | 店主立ち絵、在庫アイコン、たれ容器 | 在庫リスト/たれ3スライダ/プリセット/開店 |
| 店舗営業 | 店内斜め俯瞰背景 | 店主+4客の立ち絵/小ポートレート | 待ち列/注文カード/時間/評判 |
| 調理 | 厨房背景 | P1〜P6工程別の道具/食材/揚げエフェクト | ゲージ、工程タブ、注文情報 |
| 試食 | 店内背景のぼかし差分 | 評価客+店主の反応+完成皿+粒子 | 得点/ランク/セリフ/評判変動/次へ |
| 結果 | 閉店後の店内 | 店主の喜怒哀楽、完成料理アイコン | 売上/原価/利益/設備へ |
| 設備 | 店内/設備背景 | フライヤー・椅子 | 所持状態、価格、効果、購入/翌日へ |

## 3. デザインシートと必要素材数
- 店主: 1枚の正式リファレンスシート（顔拡大、正面、全身、後ろ/横、色パレット、ヘアピン位置、店内服/私服）、感情4種（通常/励まし/喜び/落胆）。立ち絵は最低2構図。
- 顧客: regular/student/worker/touristの4種、各6評価ランク=24表情（MVP前半は通常ポーズ+顔差分で代用可）。
- 完成料理: 基本かつめしのcanonical 1枚、たれ3種類の外観差分、調理6工程の中間絵、食材アイコン5種。
- 背景: タイトル/朝/店舗/厨房/試食/結果/設備の7用途（共通背景の使い回し可）。UI素材は9-slice枠、ボタン状態、各パネル装飾、ランクロゴ6種。
- 音: bgm_title、bgm_shop、bgm_cooking、bgm_result、SE11種程度を台帳化。外部楽曲の無断使用を避け、素材のライセンスを管理する。
- プレビュー画像と実アセットを混同しない。独立したキャラ表情と料理canonicalが採用される前に大量生成しない。

## 4. 仕様に基づくファイル構成
```
public/assets/
  mockups/v03/                 # 企画資料。ゲーム内の描画ソースにしない
  game/
    backgrounds/{screen_id}/
    characters/owner/{outfit}/{emotion}/
    characters/{customer_id}/{rank}/
    food/beef_katsumeshi/{stage}/
    ui/buttons/
    ui/icons/
    ui/ranks/
    effects/
    audio/bgm/
    audio/se/
assets/source/
  comfyui/workflows/
  comfyui/prompts/
  review/
```

## 5. アセット寸法・アンカー
- 画像原本: 背景2560×1440（16:9）、立ち絵1536×2048、顔/表情1024×1024、料理canonical1024×1024、UIアイコン256×256。実行時には必要に応じWebP/AVIF等へ変換する。
- 背景/キャラ/料理の各レイヤーで共通の正規化座標0..1を用いる。アンカー `anchorX/Y` は元画像内位置。
- 同じ顔の表情差分は眼の中心、顔の輪郭、肩ラインを揃える。例として顔中心位置が元画像の2%を超えて変わる差分はレビュー対象にする。
- 皿のレイヤー順: 皿/影→米→カツ→ソース→キャベツ→湯気。たれ変更で皿とカツの形状を動かさない。
- ゲーム画面にはテキスト入りの一枚絵を直接使わない。文字列はJSONのtextKeyで管理。UIはプログラムで再構築する。

## 6. ComfyUIキャラクター制作・再現性（新規投入停止中）
既存の生成条件は `assets/source/comfyui/jobs.json`、`presets.json` と各候補manifestに記録済み。これらは過去素材の由来確認用であり、新規生成は示さない。`output/town_game` の棚卸し記録と公開manifestではローカルの絶対パスを共有しない。

再開後に限り適用する制作・受入条件（現在は実行しない）:
- 生成対象をキャラクターに限定し、参照画像から服装を模倣しない。
- 画面の役割が分かる構図を元画像/画面合成で確認してから、差分へ展開する。
- `id,path,width,height,anchorX,anchorY,sourceWorkflow,seed,model,loraList,status,licenseNote` をmanifestに記録し、承認済み素材だけをリリース対象にする。
- 出力画像からprivate path等の不要メタデータを除去し、workflow原本は非公開管理する。
- 完成料理canonicalと依存するたれ外観差分は別途保留中であり、この節を理由に制作を再開しない。

## 7. 受け入れゲート
- 正面/斜めの主人公が同一人物と判別でき、髪のお団子・ピンクヘアピンが欠落しない。
- 服装は元画像のデニムの再現になっていない。
- 各キャラ全身画は頭・手指・足を含み、透明余白に欠けがない。
- 料理は洋皿・ご飯・平たいカツ・たれ・茹でキャベツを識別できる。浮き・角度・ソース位置ズレをチェック。
- 食後ランク6段階の強弱が一目で区別でき、顧客が評価主語である。
- MVP画面は1920×1080と1280×720の合成で内容を読める。横長以外の画面でもUI領域が欠けない。
- 複数画像合成で層順や位置が破綻せず、現金/評判/注文はプログラム表示にできる。
- ライセンスが未確認の素材はapprovedにせず公開しない。

## 8. 実装前の順番
1. 主役デザインシートと料理canonicalの承認
2. UIの色・フォント/枠のトークンを決定（`docs/06`「UIデザイントークン」、`src/styles.css` `:root` に基準値を集約済み。各画面合成とコントラストの採用レビューは継続）
3. タイトル・店舗・調理・試食の背景/キャラ/料理の切り出し方確定
4. 1画面をHTML/PixiJSで再構築、ヒット領域確認
5. 24客リアクション差分とSE/BGM展開

画像を作った事実と実際のゲームに組み込まれた事実を分けて記録する。

## 9. 実施状況の追記（2026-11-23）

- 店主・顧客のキャラクター候補はComfyUI＋LoRAで制作済み。元画像の白シャツ＋デニムオーバーオールは負例へ指定し、別衣装を使用。manifestには生成再現情報を記録し、PNG原本から透過WebPへ書き出した。
- 仕様 §3 の店主リファレンスを補うため、同じComfyUI＋LoRA条件で顔/髪/ヘアピン、店舗服正面、店舗服の背面/横、私服の参照画像を用意し、色メモ付きボードへ整理した。画像・生成条件・ボード生成スクリプトは `assets/source/comfyui/references/` に保存。レビュー候補であり、採用・顔/衣装同一性・色値の承認は未完了。ゲーム実行素材ではない。
- 背景の画風と原寸を揃えるため、ComfyUI＋anima-style LoRAで朝準備/店舗/P3厨房の2560×1440マスターを試したが、非キャラクターをComfyUIで生成しないというユーザー指示により、プレビュー参照を解除。3枚とも人物・文字・完成皿を含まず、状態は `concept_review`。当時はタイトル/結果の新規高解像度候補が白帯・夜景化等で不採用だったが、その後ChatGPT画像生成のv06候補を制作し参照切替。解像度・画面合成レビューは未完。
- この制作記録はキャラクター候補の存在を示すもので、正式リファレンスシートの承認、全差分の同一性確認、ゲーム画面合成の採用判定を示すものではない。statusは concept_review。
- かつめし完成料理の新規生成・差し替えはユーザー指示で停止中。canonical確定を前提にするたれ外観差分も保留し、他の仕様アセットを優先する。
- ライセンス確認と手動レビューを通過するまで出荷不可。
- 食材/工程素材の画風差を確認し、ComfyUI＋anima-style LoRAの12候補（生肉、米、パン粉、茹でキャベツ、たれ、衣付き/揚げカツ）を制作。候補原本・マスク・生成条件・判定は `assets/source/comfyui/cooking_food_v04/` に保存。形状/コントラスト不足を目視し、不採用/未承認としてランタイムへ接続していない。完成皿は対象外。
- ChatGPT画像生成でタイトル（加古川の川沿い店舗）と閉店後（店内夕景）の背景候補v06を制作。16:9・1672×941、文字/人物/料理なし。 `assets/source/imagegen/chatgpt/v05/backgrounds/` にPNG、`public/assets/game/backgrounds/v06/` にWebPとmanifestを保存し、タイトル/結果の参照先を更新。解像度の原寸基準、実画面の可読性・合成レビュー、権利確認は未完。
- 試食・反応画面用に、中央へ評価UIを置けるChatGPT生成の店内ぼかし背景 `tasting_interior_chatgpt_v01` を追加し、REACTION画面へ接続。人物・料理・文字なし、1672×941の候補で、原寸基準・画面合成レビューは未完。
- ChatGPT画像生成v06で食材・工程用の7アイコン（生肉、衣付き肉、パン粉、揚げカツ、たれ、茹でキャベツ、ご飯）を制作。接触シートを透過PNGとして保存し、各セルを切り出して在庫5種と調理工程見本にプレビュー接続。個別PNG原本は約443×443px、実行WebPは仕様§5に合わせ透明余白付き256×256pxへ変換。完成皿は含めない。生成プロセスと変換処理はmanifest/`scripts/import_chatgpt_food_v06.py` に記録。状態はconcept_reviewで、実画面合成・権利・採用確認は未完。

- v102はテキスト生成だったため、低評価の表情は弱まったものの顔立ち/構図が現行キャラから離れた。これを改善するためv05のC/F画像を初期画像にしてComfyUI＋anima-style LoRAで低denoiseのimg2img v103を各1枚生成。比較シート `artifacts/regular_low_rank_review_v103.jpg` と `assets/source/comfyui/candidates/regular_tone_v103/` にPNG/マスク由来の透過WebP、seed・denoise・LoRA・promptを保存。比較で同一人物性がより保たれ、C/Fの低評価トーンも読めるため、プレビューランタイムをv103へ切替。6ランクとの並び確認、実画面合成、権利確認、配布承認は未完。

- ChatGPT画像生成で朝準備/営業/厨房/試食/結果の背景を、キャラ絵に寄せた手描き2Dセル塗り調へ作り直し、v07として画面参照切替。比較シート `artifacts/backgrounds_chatgpt_review_v07.jpg`、原本とプロンプトは `assets/source/imagegen/chatgpt/v07/backgrounds/`、実行WebPとmanifestは `public/assets/game/backgrounds/v07/`。1672×941でconcept_review、2560×1440原寸/実画面合成はレビュー待ち。
- 2026-11-23: タイトル背景候補v08をChatGPT画像生成で制作。営業背景の手描き2D調のみを画風参考にし、川沿い店舗・川/橋・ロゴとメニューの余白を設定。原本1672×941、実行用WebPを2560×1440へLanczos拡大。public/assets/game/backgrounds/v08/manifest.json に寸法・拡大情報・権利・レビュー状態を記録し、プレビュー参照を更新。原寸品質と実画面合成は未承認。

- 工程道具5点（肉たたき/パン粉トレイ/ソースレードル/キャベツ鍋/しゃもじ）と設備2点（フライヤー/椅子）を、背景v07と同じ参照スタイルのChatGPT画像生成2Dアイコンへ更新。透明1024px WebPとmanifestは `public/assets/game/cooking/v07/tools/`・`public/assets/game/equipment/v07/`、原本PNG・プロンプトは `assets/source/imagegen/chatgpt/v07/`、比較シートは `artifacts/tools_equipment_chatgpt_v07.png`。ゲームへ候補接続済み、concept_review。縮小表示/合成/権利承認待ち。

- 2026-11-23追加: P3揚げ工程の写実CG調を、ChatGPT画像生成の手描き2D調シーン `fry_stage_anime_chatgpt_v02` へ差し替え。旧画像は構図参考、新v07厨房背景は画風参考に使い、16:9表示へ調整。原本と生成条件は `assets/source/imagegen/chatgpt/v07/cooking/`、実行画像とmanifestは `public/assets/game/cooking/v07/`。concept_review。調理UI上での縮小可読性・合成確認は残る。

- 2026-11-23: 旧v03の蒸気・油はね・金色きらめきは背景v07や工程道具v07に比べ質感差があったため、ChatGPT画像生成で手描き2D調の候補を制作。生成PNG/プロンプトは `assets/source/imagegen/chatgpt/v08/effects/`、アルファノイズを除き透明余白付き512×512pxへ正規化した実行WebPとmanifestは `public/assets/game/effects/v04/`。調理/試食画面のプレビュー参照を切替え、比較画像 `artifacts/effects_v03_v04_review.png` を作成。全素材concept_reviewで、画面合成・権利確認は未完。

- 2026-11-23: Day7夕景の既存背景は通常画面v07背景と描き込みの質感差があったため、ChatGPT画像生成で同じ店舗・川・橋の手描き2D候補を制作。原本 `assets/source/imagegen/chatgpt/v08/backgrounds/day7_evening_anime_chatgpt_v01_source.png`、実行WebP 2560×1440（原本1672×941をLanczos拡大）、manifest `public/assets/game/backgrounds/v08/manifest.json`。Day7プレビュー参照を更新し、比較 `artifacts/day7_bg_v03_v08_review.png` を保存。concept_review、原寸品質と実画面合成レビューは未完。
- 2026-11-23: ChatGPT生成の手描き2D背景5点（営業/朝準備/厨房/試食/結果）をv08の2560×1440実行WebPへ整形し、画面参照をv08へ切替。再生成はしていない。生成PNG/プロンプトはv07に保持し、v08 manifestには元1672×941とLanczos拡大の由来を記録。原寸ディテールは未達でconcept_reviewのまま。
- v08実行背景7点を一覧シート `artifacts/backgrounds_v08_contact_sheet.jpg` で再確認。タイトル/Day7の川沿い外景と、朝準備/営業/厨房/試食/結果の室内背景は用途が分かれ、Day7/通常営業結果は同じ店舗の時間帯差分として運用する。設備画面は結果/営業背景を共用する仕様どおり。
- 2026-11-23: docs/17 §2で指定された「店内斜め俯瞰」を満たすため、営業背景をChatGPT生成の高めの対角俯瞰 `shop_diner_diagonal_anime_chatgpt_v02` へ更新。中央通路を広く空け、カウンターを奥、客席を左右に配置。実行WebP2560×1440、生成原本1672×941。旧目線高さの営業背景はsupersededとして保持し、比較 `artifacts/shop_bg_v08_v02_review.png` を作成。画面合成/採用はconcept_review。
- 2026-11-23追加: SHOP画面の現在レイアウトでは店主が左側、注文案内が中央、客席が右側に出るため、背景もこのUI配置に合わせたChatGPT生成v10候補へプレビュー参照を切替えた。左に店主用の低密度領域、中央に床、右に客席を置いた構図。生成原本1672×941、実行WebPは2560×1440へLanczos拡大（原寸の細部は未達）。 `public/assets/game/backgrounds/v10/manifest.json` とルートmanifestに記録し、build previewのruntime listに登録。statusはconcept_reviewで出荷不可。実画面合成と承認レビューは未完。ComfyUIは使用していない。

- 2026-11-23追加: SHOPの実画面キャプチャで店主立ち絵と従来背景の画風差、UIとの重なりを確認し、仕様§2の斜め俯瞰と画面配置へ寄せた背景候補v11をChatGPT画像生成で制作。左に暗い店主領域、中央に注文UI用の低密度床、右端に客席、奥にカウンターを配置。原本/条件 `assets/source/imagegen/chatgpt/v11/backgrounds/`、実行WebP/manifest `public/assets/game/backgrounds/v11/`。`src/main.mjs` とpreview buildの参照をv11へ切替。原本1672×941、実行版2560×1440はLanczos拡大であり、§5の原寸ディテール基準には未達。原画単体では用途ごとの領域を確認したが、更新後の実画面合成・可読性は未確認。concept_reviewのまま。

- 2026-11-23追加: P3揚げ工程の過去候補は薄い衣の板が油面に融合して見えたため不採用。ChatGPT画像生成でカツを油面から持ち上げ、全周シルエットと厚い衣の側面を見せる候補 `fry_stage_lifted_cutlet_chatgpt_v01` を制作。原本/条件 `assets/source/imagegen/chatgpt/v09/cooking/manifest.json`、実行候補 `public/assets/game/cooking/v08/manifest.json`。COOK P3へプレビュー接続済み。1672×941、concept_review。表示サイズ/合成/承認は未完。ComfyUIは使っていない。

- 2026-11-23: SHOP背景の線画/セル影を強める候補v14をChatGPT画像生成で制作。左の店主領域、中央の注文UI用空間、右端の客席という画面構図を維持。原本1672×941で §5 の2560×1440原寸要件には未達。manifest `assets/source/imagegen/chatgpt/v14/backgrounds/manifest.json` に生成条件・権利・レビュー状態を記録。床板の線が注文UIに競合する可能性と、実画面合成/可読性が未確認のためランタイム未接続。
